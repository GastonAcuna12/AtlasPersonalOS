"use client";

import { useEffect, useState } from "react";
import { useAtlasAuth } from "@/lib/auth";
import { useNotes, readNotes, type Note } from "@/lib/notes";
import { listCloudNotes, uploadLocalNotesToCloud } from "@/lib/supabase/notes";
import { executeControlledNotesMerge, type MergeExecutionResult } from "@/lib/sync/notesMerge";
import { downloadAtlasBackup } from "@/lib/dataManagement";
import { t } from "@/lib/i18n";
import { useAtlasSettings } from "@/lib/settings";
import { useSyncState, updateSyncState, readSyncState } from "@/lib/sync/state";

export function NotesSyncPreviewPanel() {
  const auth = useAtlasAuth();
  const { notes, importCloudNote } = useNotes();
  const { settings } = useAtlasSettings();
  const language = settings.language;
  const syncState = useSyncState();
  const isNotesSynced = syncState.modules.notes.status === "synced";

  const [cloudCount, setCloudCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Phase 3 States
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [confirmedNotice, setConfirmedNotice] = useState(false);

  // Phase 4 States
  const [cloudPreviewNotes, setCloudPreviewNotes] = useState<Note[] | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState("");

  // Phase 6B States
  const [confirmedMergeBackup, setConfirmedMergeBackup] = useState(false);
  const [merging, setMerging] = useState(false);
  const [mergeResult, setMergeResult] = useState<MergeExecutionResult | null>(null);

  // Active local notes (excluding soft-deleted notes)
  const activeLocalNotesCount = notes.filter((n) => !n.deletedAt).length;

  async function fetchPreviewData() {
    setLoadingPreview(true);
    setPreviewError("");
    try {
      const result = await listCloudNotes();
      if (result.ok) {
        setCloudPreviewNotes(result.data);
      } else {
        setPreviewError(result.error);
      }
    } catch (err: unknown) {
      setPreviewError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingPreview(false);
    }
  }

  useEffect(() => {
    if (!auth.isConfigured || auth.status !== "signed_in") {
      return;
    }

    let isSubscribed = true;

    async function fetchCloudCount() {
      setLoading(true);
      setError("");

      try {
        const result = await listCloudNotes();
        if (!isSubscribed) return;

        if (result.ok) {
          setCloudCount(result.data.length);
        } else {
          setError(result.error);
        }
      } catch (err: unknown) {
        if (isSubscribed) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (isSubscribed) {
          setLoading(false);
        }
      }
    }

    fetchCloudCount();

    return () => {
      isSubscribed = false;
    };
  }, [auth.isConfigured, auth.status, refreshTrigger]);

  function handleRefresh() {
    setRefreshTrigger((prev) => prev + 1);
    if (cloudPreviewNotes !== null) {
      fetchPreviewData();
    }
  }

  function handleDownloadBackup() {
    downloadAtlasBackup();
  }

  async function handleImportCloudNote(cloudNote: Note) {
    const confirmTitle = t(language, "settings.notesSync.importConfirmTitle", "Import this cloud note as a local copy?");
    const confirmDesc = t(
      language,
      "settings.notesSync.importConfirmDesc",
      "This will create a new local note from the selected cloud note. It will not replace local notes, delete cloud notes, or enable sync."
    );

    const confirmed = window.confirm(`${confirmTitle}\n\n${confirmDesc}`);
    if (!confirmed) {
      return;
    }

    try {
      importCloudNote(cloudNote);

      setUploadMessage(t(language, "settings.notesSync.importSuccess", "Cloud note imported as local copy."));
      handleRefresh();
    } catch (err: unknown) {
      setError(`${t(language, "settings.notesSync.importFailed", "Import failed")}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function handleUploadLocalNotes() {
    if (activeLocalNotesCount === 0) {
      setError(t(language, "cloud.noLocalNotes", "No local notes available"));
      return;
    }

    if (!confirmedNotice) {
      setError(t(language, "settings.notesSync.confirmDesc"));
      return;
    }

    const confirmTitle = t(language, "settings.notesSync.confirmTitle", "Upload local notes to cloud?");
    const confirmDesc = t(
      language,
      "settings.notesSync.confirmDesc",
      "This will copy your active local notes into Supabase using local IDs to avoid duplicates. It will not delete local notes and will not replace cloud notes."
    );

    const confirmed = window.confirm(`${confirmTitle}\n\n${confirmDesc}`);
    if (!confirmed) {
      return;
    }

    setUploading(true);
    setUploadMessage("");
    setError("");

    try {
      const activeNotes = notes.filter((n) => !n.deletedAt);
      const result = await uploadLocalNotesToCloud(activeNotes);

      if (result.ok) {
        setUploadMessage(
          `${t(language, "settings.notesSync.uploadSuccess", "Upload complete")}! ` +
            result.message
        );
        handleRefresh();
      } else {
        setError(result.error);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
    }
  }

  async function handleRunControlledMerge() {
    if (!cloudPreviewNotes) return;

    const allLocalNotes = readNotes();
    const mergePreview = buildNotesMergePreview(allLocalNotes, cloudPreviewNotes);
    const hasActionsToMerge =
      mergePreview.localOnly.length > 0 ||
      mergePreview.cloudOnly.length > 0 ||
      mergePreview.conflicts.length > 0;

    if (!hasActionsToMerge) {
      setError(t(language, "settings.notesSync.noActionMerge", "No merge actions needed"));
      return;
    }

    if (!confirmedMergeBackup) {
      setError(t(language, "settings.notesSync.confirmMergeDesc"));
      return;
    }

    const confirmTitle = t(language, "settings.notesSync.confirmMergeTitle", "Run controlled Notes merge?");
    const confirmDesc = t(
      language,
      "settings.notesSync.confirmMergeDesc",
      "This will upload local-only notes to Supabase, import cloud-only notes as local copies, and create conflict copies when needed. It will not delete local notes or cloud notes."
    );

    const confirmed = window.confirm(`${confirmTitle}\n\n${confirmDesc}`);
    if (!confirmed) {
      return;
    }

    setMerging(true);
    setMergeResult(null);
    setError("");
    setUploadMessage("");

    try {
      const result = await executeControlledNotesMerge(notes, cloudPreviewNotes);
      setMergeResult(result);
      
      if (result.errors.length > 0) {
        setError(`${t(language, "settings.notesSync.mergeFailed", "Merge completed with errors")}: ${result.errors.join(", ")}`);
      } else {
        setUploadMessage(t(language, "settings.notesSync.mergeComplete", "Merge complete"));
      }

      handleRefresh();
    } catch (err: unknown) {
      setError(`${t(language, "settings.notesSync.mergeFailed", "Merge failed")}: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setMerging(false);
    }
  }

  async function handleEnableNotesSync() {
    const confirmTitle = t(language, "settings.notesSync.enableNotesSyncConfirmTitle", "Enable Notes cloud sync?");
    const confirmDesc = t(
      language,
      "settings.notesSync.enableNotesSyncConfirmDesc",
      "Notes will continue using local storage as a fast cache. Future note edits will also be saved to Supabase when you are signed in."
    );

    const confirmed = window.confirm(`${confirmTitle}\n\n${confirmDesc}`);
    if (!confirmed) {
      return;
    }

    updateSyncState((current) => {
      const now = new Date().toISOString();
      const updatedNotesModule = {
        ...current.modules.notes,
        status: "synced" as const,
        lastSyncedAt: now,
        migrationCompletedAt: now,
        localCount: activeLocalNotesCount,
        cloudCount: cloudCount,
      };

      return {
        ...current,
        lastSyncedAt: now,
        modules: {
          ...current.modules,
          notes: updatedNotesModule,
        },
      };
    });

    setUploadMessage(t(language, "settings.notesSync.enabledNotesSyncSuccess", "Notes cloud sync enabled"));
  }

  // State 1: Supabase not configured
  if (!auth.isConfigured) {
    return (
      <section className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl animate-fade-in-up">
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            {t(language, "settings.notesSync.previewTitle", "Notes Sync Preview")}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-zinc-400">
            {t(language, "settings.notesSync.onlyLocal", "Cloud sync is not configured. Notes remain local-only.")}
          </p>
        </div>
      </section>
    );
  }

  // State 2: Signed out
  if (auth.status !== "signed_in") {
    const isNotesSynced = readSyncState().modules.notes.status === "synced";

    return (
      <section className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl animate-fade-in-up">
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-sky-450">
            {t(language, "settings.notesSync.previewTitle", "Notes Sync Preview")}
          </p>
          {isNotesSynced ? (
            <p className="mt-2 text-xs font-semibold leading-relaxed text-[#D4B87A]">
              ⚠️ {t(language, "settings.notesSync.notesSavedLocallySignedOut", "Notes are saved locally. Sign in to sync changes.")}
            </p>
          ) : (
            <p className="mt-2 text-xs leading-relaxed text-zinc-400">
              {t(language, "settings.notesSync.signInPrompt", "Sign in to preview Notes cloud sync.")}
            </p>
          )}
        </div>
      </section>
    );
  }

  // State 3: Signed in (migration preview)
  return (
    <section className="rounded-xl border border-[#6F8799]/20 bg-[#18181b] p-6 shadow-xl animate-fade-in-up flex flex-col gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#7F97A9]">
            {t(language, "settings.notesSync.previewTitle", "Notes Sync Preview")}
          </p>
          <h2 className="mt-2 text-xl font-bold text-zinc-100">
            {t(language, "sync.migrationPreview", "Migration Preview")}
          </h2>
          <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
            {t(
              language,
              "settings.notesSync.noChangeHint",
              "Note: local notes remain the source of truth. This preview does not change any data."
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading || uploading}
          className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-300 transition hover:bg-zinc-800 disabled:opacity-50"
        >
          {loading ? t(language, "common.loading", "Loading...") : t(language, "settings.notesSync.refresh", "Refresh Preview")}
        </button>
      </div>

      {isNotesSynced && (
        <div className="rounded-lg border border-[#8A9A5B]/30 bg-[#8A9A5B]/5 px-4 py-3 text-xs text-[#9AAB6B]">
          <p className="font-bold flex items-center gap-1.5">
            ✓ {t(language, "settings.notesSync.enabledNotesSyncSuccess", "Notes cloud sync enabled")}
          </p>
          {syncState.modules.notes.lastSyncedAt && (
            <p className="text-[10px] text-zinc-500 font-medium mt-1">
              {t(language, "sync.lastSynced")}: {new Date(syncState.modules.notes.lastSyncedAt).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-[#B26A5B]/30 bg-[#B26A5B]/5 px-4 py-3 text-xs font-semibold text-[#E8E4DD]">
          ⚠️ {error}
        </p>
      )}

      {uploadMessage && (
        <p className="rounded-lg border border-[#8A9A5B]/30 bg-[#8A9A5B]/5 px-4 py-3 text-xs font-semibold text-[#9AAB6B]">
          ✓ {uploadMessage}
        </p>
      )}

      {/* Counts Row */}
      <div className="grid gap-3.5 sm:grid-cols-2">
        <div className="rounded-lg border border-[#27272a] bg-[#121214] p-4 flex flex-col justify-between">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            {t(language, "settings.notesSync.localNotes", "Local Notes")}
          </p>
          <p className="mt-2 text-2xl font-bold text-zinc-150">{activeLocalNotesCount}</p>
        </div>
        <div className="rounded-lg border border-[#27272a] bg-[#121214] p-4 flex flex-col justify-between">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            {t(language, "settings.notesSync.cloudNotes", "Cloud Notes")}
          </p>
          <p className="mt-2 text-2xl font-bold text-zinc-150">
            {loading ? (
              <span className="text-zinc-500 text-sm">Checking...</span>
            ) : cloudCount !== null ? (
              cloudCount
            ) : (
              "—"
            )}
          </p>
        </div>
      </div>

      {/* Download Backup & Recommendation */}
      <div className="flex flex-col gap-4 border-t border-[#27272a]/45 pt-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#C8A96A]">
              ⚠️ {t(language, "settings.notesSync.backupNotice", "Backup recommended")}
            </p>
            <p className="text-[10px] leading-relaxed text-zinc-500 italic max-w-sm mt-1">
              Highly recommended: download a data backup file to safeguard your notes workspace before performing any sync testing.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDownloadBackup}
            disabled={uploading}
            className="rounded-lg border border-[#C8A96A]/25 bg-[#C8A96A]/10 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-[#D4B87A] transition hover:bg-[#C8A96A]/15 shrink-0 disabled:opacity-50"
          >
            {t(language, "settings.notesSync.downloadBackup", "Download JSON Backup")}
          </button>
        </div>

        {/* Inline Confirmation Checkbox */}
        <label className="flex items-start gap-2.5 text-xs text-zinc-400 cursor-pointer pt-1 select-none">
          <input
            type="checkbox"
            checked={confirmedNotice}
            onChange={(e) => setConfirmedNotice(e.target.checked)}
            disabled={uploading}
            className="accent-[#C8A96A] h-4.5 w-4.5 rounded border-[#27272a] bg-[#121214] mt-0.5 shrink-0 cursor-pointer disabled:cursor-not-allowed"
          />
          <span className="leading-relaxed">
            {t(language, "settings.notesSync.iUnderstandCheckbox")}
          </span>
        </label>
      </div>

      {/* Migration Actions */}
      <div className="grid gap-3.5 sm:grid-cols-2 border-t border-[#27272a]/45 pt-4 text-xs font-bold uppercase tracking-wider">
        <button
          type="button"
          onClick={handleUploadLocalNotes}
          disabled={uploading || !confirmedNotice || activeLocalNotesCount === 0}
          className={`rounded-lg border px-4 py-3.5 text-left flex justify-between items-center transition ${
            uploading || !confirmedNotice || activeLocalNotesCount === 0
              ? "border-[#27272a] bg-[#121214]/40 text-zinc-500 cursor-not-allowed"
              : "border-[#6F8799]/20 bg-[#6F8799]/10 text-[#7F97A9] hover:bg-[#6F8799]/15 hover:border-[#6F8799]/30 cursor-pointer"
          }`}
        >
          <span>
            {uploading ? t(language, "common.uploading", "Uploading...") : t(language, "settings.notesSync.uploadLocal", "Upload Local Notes to Cloud")}
          </span>
          {(!confirmedNotice || activeLocalNotesCount === 0) && (
            <span className="rounded bg-zinc-800 border border-zinc-700/60 px-1.5 py-0.5 text-[9px] text-zinc-500 lowercase tracking-normal">
              requires confirmation
            </span>
          )}
        </button>

        <button
          type="button"
          disabled
          className="relative rounded-lg border border-[#27272a] bg-[#121214]/40 px-4 py-3.5 text-zinc-500 text-left flex justify-between items-center cursor-not-allowed"
        >
          <span>{t(language, "settings.notesSync.mergeLocalCloud", "Merge Local and Cloud Notes")}</span>
          <span className="rounded bg-zinc-800 border border-zinc-700/60 px-1.5 py-0.5 text-[9px] text-zinc-400 lowercase tracking-normal">
            {t(language, "settings.notesSync.comingSoon", "coming soon")}
          </span>
        </button>

        <button
          type="button"
          disabled
          className="relative rounded-lg border border-[#27272a] bg-[#121214]/40 px-4 py-3.5 text-zinc-500 text-left flex justify-between items-center cursor-not-allowed"
        >
          <span>{t(language, "settings.notesSync.replaceCloud", "Replace Cloud with Local")}</span>
          <span className="rounded bg-zinc-800 border border-zinc-700/60 px-1.5 py-0.5 text-[9px] text-zinc-400 lowercase tracking-normal">
            {t(language, "settings.notesSync.comingSoon", "coming soon")}
          </span>
        </button>

        <button
          type="button"
          disabled
          className="relative rounded-lg border border-[#27272a] bg-[#121214]/40 px-4 py-3.5 text-zinc-500 text-left flex justify-between items-center cursor-not-allowed"
        >
          <span>{t(language, "settings.notesSync.replaceLocal", "Replace Local with Cloud")}</span>
          <span className="rounded bg-zinc-800 border border-zinc-700/60 px-1.5 py-0.5 text-[9px] text-zinc-400 lowercase tracking-normal">
            {t(language, "settings.notesSync.comingSoon", "coming soon")}
          </span>
        </button>

        <button
          type="button"
          disabled
          className="relative rounded-lg border border-[#27272a] bg-[#121214]/40 px-4 py-3.5 text-zinc-500 text-left flex justify-between items-center cursor-not-allowed"
        >
          <span>{t(language, "settings.notesSync.importCloud", "Import Cloud Notes")}</span>
          <span className="rounded bg-zinc-800 border border-zinc-700/60 px-1.5 py-0.5 text-[9px] text-zinc-400 lowercase tracking-normal">
            {t(language, "settings.notesSync.comingSoon", "coming soon")}
          </span>
        </button>
      </div>

      {/* Cloud Notes Metadata Preview Section */}
      <div className="border-t border-[#27272a]/45 pt-5 flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-bold text-zinc-200">
              {t(language, "settings.notesSync.cloudPreviewTitle")}
            </h3>
            <p className="text-[10px] leading-relaxed text-zinc-500">
              {t(language, "settings.notesSync.noChangeHint")}
            </p>
          </div>
          <button
            type="button"
            onClick={fetchPreviewData}
            disabled={loadingPreview || uploading}
            className="rounded-lg border border-[#6F8799]/20 bg-[#6F8799]/10 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-[#7F97A9] transition hover:bg-[#6F8799]/20 disabled:opacity-50 shrink-0"
          >
            {loadingPreview ? t(language, "common.loading") : t(language, "settings.notesSync.loadCloudPreview")}
          </button>
        </div>

        {previewError && (
          <p className="rounded-lg border border-[#B26A5B]/30 bg-[#B26A5B]/5 px-4 py-3 text-xs font-semibold text-[#E8E4DD]">
            ⚠️ {previewError}
          </p>
        )}

        {cloudPreviewNotes !== null && (
          <div className="flex flex-col gap-4">
            {cloudPreviewNotes.length === 0 ? (
              <p className="text-xs text-zinc-500 italic py-2">
                {t(language, "settings.notesSync.noCloudNotes")}
              </p>
            ) : (
              <div className="flex flex-col gap-3 max-h-[350px] overflow-y-auto pr-1">
                {cloudPreviewNotes.map((cloudNote) => {
                  // Determine status
                  const isMatch = notes.some(
                    (localNote) =>
                      !localNote.deletedAt &&
                      (cloudNote.localId === localNote.id ||
                       cloudNote.localId === localNote.localId ||
                       cloudNote.id === localNote.id ||
                       cloudNote.id === localNote.localId)
                  );

                  const isImported = !isMatch && notes.some(
                    (localNote) =>
                      !localNote.deletedAt &&
                      localNote.cloudId === cloudNote.id
                  );

                  return (
                    <article
                      key={cloudNote.id}
                      className="rounded-lg border border-[#27272a] bg-[#121214] p-3 flex flex-col gap-2"
                    >
                      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-zinc-200">
                            {cloudNote.title || "Untitled note"}
                          </h4>
                          <div className="flex flex-wrap gap-2 items-center mt-1 text-[9px] text-zinc-500">
                            <span className="font-semibold uppercase tracking-wider">
                              {cloudNote.area || t(language, "common.personal")}
                            </span>
                            <span>•</span>
                            <span>
                              {t(language, "settings.notesSync.updated")}: {cloudNote.updatedAt ? new Date(cloudNote.updatedAt).toLocaleDateString() : "—"}
                            </span>
                            {cloudNote.deletedAt && (
                              <>
                                <span>•</span>
                                <span className="text-[#C27A6B] font-bold uppercase">DELETED</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Badges / Chips / Actions */}
                        <div className="flex flex-wrap gap-1.5 items-center">
                          {isMatch ? (
                            <span className="rounded bg-[#8A9A5B]/10 border border-[#8A9A5B]/20 px-2 py-0.5 text-[9px] font-semibold text-emerald-450 uppercase tracking-wide">
                              {t(language, "settings.notesSync.matchesLocal")}
                            </span>
                          ) : isImported ? (
                            <span className="rounded bg-[#C8A96A]/10 border border-[#C8A96A]/20 px-2 py-0.5 text-[9px] font-semibold text-amber-450 uppercase tracking-wide">
                              {t(language, "settings.notesSync.alreadyImported")}
                            </span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="rounded bg-[#6F8799]/10 border border-[#6F8799]/20 px-2 py-0.5 text-[9px] font-semibold text-sky-450 uppercase tracking-wide">
                                {t(language, "settings.notesSync.cloudOnly")}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleImportCloudNote(cloudNote)}
                                disabled={uploading || loadingPreview}
                                className="rounded bg-[#6F8799]/20 hover:bg-[#6F8799]/30 border border-[#6F8799]/40 px-2 py-0.5 text-[9px] font-bold text-sky-300 uppercase tracking-wide transition disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {t(language, "settings.notesSync.importAsLocal")}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Tag Chips */}
                      {cloudNote.tags && cloudNote.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {cloudNote.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full border border-[#27272a] bg-[#18181b] px-2 py-0.5 text-[8px] text-zinc-400"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Privacy Guard & Mapping Info */}
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mt-1 pt-1.5 border-t border-[#27272a]/40 text-[9px] text-zinc-500">
                        <span className="flex items-center gap-1 italic">
                           🔒 {t(language, "settings.notesSync.contentHidden")}
                        </span>
                        {cloudNote.localId && (
                          <span className="font-mono">
                            {t(language, "settings.notesSync.mapping")}: {cloudNote.localId.slice(0, 8)}...
                          </span>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {/* Local Upload Candidates List */}
            {(() => {
              const uploadCandidates = notes.filter(
                (localNote) =>
                  !localNote.deletedAt &&
                  !localNote.cloudId &&
                  !cloudPreviewNotes.some(
                    (cloudNote) =>
                      cloudNote.localId === localNote.id ||
                      cloudNote.localId === localNote.localId ||
                      cloudNote.id === localNote.id ||
                      cloudNote.id === localNote.localId
                  )
              );

              if (uploadCandidates.length === 0) return null;

              return (
                <div className="flex flex-col gap-2 mt-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    {t(language, "settings.notesSync.localNotes")} &mdash; {t(language, "settings.notesSync.localUploadCandidate")}s ({uploadCandidates.length})
                  </h4>
                  <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-1">
                    {uploadCandidates.map((localNote) => (
                      <div
                        key={localNote.id}
                        className="rounded-lg border border-dashed border-[#27272a] bg-[#121214]/40 p-2.5 flex justify-between items-center text-xs"
                      >
                        <div>
                          <div className="font-semibold text-zinc-300">{localNote.title || "Untitled note"}</div>
                          <div className="text-[9px] text-zinc-500 uppercase tracking-wider mt-0.5">
                            {localNote.area || t(language, "common.personal")}
                          </div>
                        </div>
                        <span className="rounded bg-[#C8A96A]/10 border border-[#C8A96A]/20 px-2 py-0.5 text-[8px] font-semibold text-[#D4B87A] uppercase tracking-wide">
                          {t(language, "settings.notesSync.localUploadCandidate")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Controlled Merge Preview Section */}
            {(() => {
              const allLocalNotes = readNotes();
              const mergePreview = buildNotesMergePreview(allLocalNotes, cloudPreviewNotes);
              const hasActionsToMerge =
                mergePreview.localOnly.length > 0 ||
                mergePreview.cloudOnly.length > 0 ||
                mergePreview.conflicts.length > 0;
              
              return (
                <div className="border-t border-[#27272a]/45 pt-5 flex flex-col gap-4 animate-fade-in-up">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-200">
                      {t(language, "settings.notesSync.controlledMergeTitle")}
                    </h3>
                    <p className="text-[10px] leading-relaxed text-zinc-500">
                      {t(language, "settings.notesSync.noChangeHint")}
                    </p>
                  </div>

                  {/* Preview Grid Cards */}
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-xs">
                    
                    {/* Local Only Card */}
                    <div className="rounded-lg border border-[#27272a] bg-[#121214] p-3.5 flex flex-col justify-between gap-3">
                      <div>
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-zinc-300">{t(language, "settings.notesSync.localOnlyNotes")}</span>
                          <span className="rounded bg-[#6F8799]/10 px-2 py-0.5 text-[10px] font-bold text-[#7F97A9]">
                            {mergePreview.localOnly.length}
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-500 mt-1">{t(language, "settings.notesSync.wouldUpload")}</p>
                      </div>
                      {mergePreview.localOnly.length > 0 && (
                        <div className="max-h-[120px] overflow-y-auto pr-1 flex flex-col gap-1.5 border-t border-[#27272a]/40 pt-2">
                          {mergePreview.localOnly.map((n) => (
                            <div key={n.id} className="text-[11px] text-zinc-400 flex justify-between items-center">
                              <span className="truncate pr-1">{n.title || "Untitled note"}</span>
                              <span className="text-[8px] uppercase tracking-wider text-zinc-600 shrink-0">
                                {n.area || t(language, "common.personal")}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Cloud Only Card */}
                    <div className="rounded-lg border border-[#27272a] bg-[#121214] p-3.5 flex flex-col justify-between gap-3">
                      <div>
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-zinc-300">{t(language, "settings.notesSync.cloudOnlyNotes")}</span>
                          <span className="rounded bg-[#C8A96A]/10 px-2 py-0.5 text-[10px] font-bold text-[#D4B87A]">
                            {mergePreview.cloudOnly.length}
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-500 mt-1">{t(language, "settings.notesSync.wouldImport")}</p>
                      </div>
                      {mergePreview.cloudOnly.length > 0 && (
                        <div className="max-h-[120px] overflow-y-auto pr-1 flex flex-col gap-1.5 border-t border-[#27272a]/40 pt-2">
                          {mergePreview.cloudOnly.map((n) => (
                            <div key={n.id} className="text-[11px] text-zinc-400 flex justify-between items-center">
                              <span className="truncate pr-1">{n.title || "Untitled note"}</span>
                              <span className="text-[8px] uppercase tracking-wider text-zinc-650 shrink-0">
                                {n.area || t(language, "common.personal")}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Matched Card */}
                    <div className="rounded-lg border border-[#27272a] bg-[#121214] p-3.5 flex flex-col justify-between gap-3">
                      <div>
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-zinc-300">{t(language, "settings.notesSync.matchedNotes")}</span>
                          <span className="rounded bg-[#8A9A5B]/10 px-2 py-0.5 text-[10px] font-bold text-[#9AAB6B]">
                            {mergePreview.matched.length}
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-500 mt-1">{t(language, "settings.notesSync.noActionNeeded")}</p>
                      </div>
                      {mergePreview.matched.length > 0 && (
                        <div className="max-h-[120px] overflow-y-auto pr-1 flex flex-col gap-1.5 border-t border-[#27272a]/40 pt-2">
                          {mergePreview.matched.map(({ local }) => (
                            <div key={local.id} className="text-[11px] text-zinc-400 flex justify-between items-center">
                              <span className="truncate pr-1">{local.title || "Untitled note"}</span>
                              <span className="text-[8px] uppercase tracking-wider text-zinc-650 shrink-0">
                                {local.area || t(language, "common.personal")}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Potential Conflicts Card */}
                    <div className="rounded-lg border border-[#B26A5B]/20 bg-[#B26A5B]/5 p-3.5 flex flex-col justify-between gap-3 sm:col-span-2">
                      <div>
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-[#E8E4DD]">{t(language, "settings.notesSync.potentialConflicts")}</span>
                          <span className="rounded bg-[#B26A5B]/15 px-2 py-0.5 text-[10px] font-bold text-[#C27A6B]">
                            {mergePreview.conflicts.length}
                          </span>
                        </div>
                        <p className="text-[10px] text-red-450 mt-1">{t(language, "settings.notesSync.needsReview")}</p>
                      </div>
                      {mergePreview.conflicts.length > 0 && (
                        <div className="max-h-[150px] overflow-y-auto pr-1 flex flex-col gap-2 border-t border-[#B26A5B]/10 pt-2">
                          {mergePreview.conflicts.map(({ local, cloud }) => (
                            <div key={local.id} className="text-[11px] border-b border-[#B26A5B]/5 pb-2 last:border-0 last:pb-0 flex flex-col gap-1">
                              <div className="font-bold text-zinc-200 truncate">{local.title || "Untitled note"}</div>
                              <div className="grid grid-cols-2 gap-2 text-[9px] text-zinc-500">
                                <div>
                                  Local update: <span className="text-zinc-400">{new Date(local.updatedAt).toLocaleTimeString()}</span>
                                </div>
                                <div>
                                  Cloud update: <span className="text-zinc-400">{new Date(cloud.updatedAt).toLocaleTimeString()}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Soft Deleted Card */}
                    <div className="rounded-lg border border-[#27272a] bg-[#121214] p-3.5 flex flex-col justify-between gap-3">
                      <div>
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-zinc-300">{t(language, "settings.notesSync.softDeletedRecords")}</span>
                          <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-bold text-zinc-400">
                            {mergePreview.softDeletedLocalCount + mergePreview.softDeletedCloudCount}
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-500 mt-1">Pending sync deletions</p>
                      </div>
                      <div className="text-[10px] text-zinc-400 flex flex-col gap-1 border-t border-[#27272a]/40 pt-2">
                        <div className="flex justify-between">
                          <span>Deleted locally:</span>
                          <span className="font-mono text-zinc-300">{mergePreview.softDeletedLocalCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Deleted in cloud:</span>
                          <span className="font-mono text-zinc-300">{mergePreview.softDeletedCloudCount}</span>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Result Summary */}
                  {mergeResult && (
                    <div className="rounded-lg border border-[#8A9A5B]/20 bg-[#121214] p-4 flex flex-col gap-2 text-xs">
                      <p className="font-bold text-[#9AAB6B]">
                        {t(language, "settings.notesSync.mergeComplete", "Merge complete")}
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2 text-zinc-300">
                        <div className="flex justify-between">
                          <span>{t(language, "settings.notesSync.uploadedNotes", "Uploaded notes")}:</span>
                          <span className="font-mono font-bold text-[#9AAB6B]">{mergeResult.uploadedCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>{t(language, "settings.notesSync.importedNotes", "Imported notes")}:</span>
                          <span className="font-mono font-bold text-[#7F97A9]">{mergeResult.importedCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>{t(language, "settings.notesSync.conflictCreated", "Conflict copies created")}:</span>
                          <span className="font-mono font-bold text-[#D4B87A]">{mergeResult.conflictCopiesCreated}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>{t(language, "settings.notesSync.skippedNotes", "Skipped notes")}:</span>
                          <span className="font-mono font-bold text-zinc-400">{mergeResult.skippedCount}</span>
                        </div>
                        <div className="flex justify-between sm:col-span-2 text-zinc-500 border-t border-[#27272a]/40 pt-2">
                          <span>{t(language, "settings.notesSync.deleteSyncDeferred", "Delete sync deferred")}:</span>
                          <span className="italic">{t(language, "settings.notesSync.comingSoon", "deferred")}</span>
                        </div>
                      </div>

                      {!isNotesSynced && (
                        <div className="mt-4 pt-3 border-t border-[#27272a]/45 flex justify-end">
                          <button
                            type="button"
                            onClick={handleEnableNotesSync}
                            className="rounded bg-[#6F8799] hover:bg-[#7F97A9] text-zinc-950 px-4 py-2 font-bold uppercase tracking-wider text-[10px] transition"
                          >
                            {t(language, "settings.notesSync.enableNotesSync", "Enable Notes cloud sync")}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Backup and understanding checkbox */}
                  <label className="flex items-start gap-2.5 text-xs text-zinc-400 cursor-pointer pt-2 select-none">
                    <input
                      type="checkbox"
                      checked={confirmedMergeBackup}
                      onChange={(e) => setConfirmedMergeBackup(e.target.checked)}
                      disabled={merging}
                      className="accent-[#6F8799] h-4.5 w-4.5 rounded border-[#27272a] bg-[#121214] mt-0.5 shrink-0 cursor-pointer disabled:cursor-not-allowed"
                    />
                    <span className="leading-relaxed">
                      {t(language, "settings.notesSync.iDownloadedBackupCheckbox")}
                    </span>
                  </label>

                  {/* Run Controlled Merge Button */}
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={handleRunControlledMerge}
                      disabled={merging || !confirmedMergeBackup || !hasActionsToMerge}
                      className={`relative rounded-lg border px-5 py-3 text-xs font-bold uppercase tracking-wider transition ${
                        merging || !confirmedMergeBackup || !hasActionsToMerge
                          ? "border-[#27272a] bg-[#121214]/40 text-zinc-500 cursor-not-allowed"
                          : "border-[#6F8799]/20 bg-[#6F8799]/10 text-[#7F97A9] hover:bg-[#6F8799]/15 hover:border-[#6F8799]/30 cursor-pointer"
                      }`}
                    >
                      <span>{merging ? t(language, "common.loading", "Processing...") : t(language, "settings.notesSync.runMerge")}</span>
                      {!hasActionsToMerge && (
                        <span className="rounded bg-zinc-800 border border-zinc-700/60 px-1.5 py-0.5 text-[9px] text-zinc-500 lowercase tracking-normal ml-2 normal-case font-normal">
                          {t(language, "settings.notesSync.noActionMerge", "no action needed")}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </section>
  );
}

// Controlled Merge Preview Matching Logic (Phase 6A)
type MergePreviewResult = {
  localOnly: Note[];
  cloudOnly: Note[];
  matched: { local: Note; cloud: Note }[];
  conflicts: { local: Note; cloud: Note }[];
  softDeletedLocalCount: number;
  softDeletedCloudCount: number;
};

function buildNotesMergePreview(
  localNotes: Note[],
  cloudNotes: Note[]
): MergePreviewResult {
  const localActive = localNotes.filter((n) => !n.deletedAt);
  const cloudActive = cloudNotes.filter((n) => !n.deletedAt);

  const softDeletedLocalCount = localNotes.filter((n) => n.deletedAt).length;
  const softDeletedCloudCount = cloudNotes.filter((n) => n.deletedAt).length;

  const matched: { local: Note; cloud: Note }[] = [];
  const conflicts: { local: Note; cloud: Note }[] = [];
  const matchedCloudIds = new Set<string>();
  const matchedLocalIds = new Set<string>();

  // Find matches and conflicts
  for (const l of localActive) {
    const c = cloudActive.find(
      (cloudNote) =>
        cloudNote.localId === l.id ||
        cloudNote.localId === l.localId ||
        l.cloudId === cloudNote.id ||
        l.id === cloudNote.id
    );

    if (c) {
      matchedCloudIds.add(c.id);
      matchedLocalIds.add(l.id);

      const localTime = new Date(l.updatedAt).getTime();
      const cloudTime = new Date(c.updatedAt).getTime();
      const timeDiffSeconds = Math.abs(localTime - cloudTime) / 1000;

      if (timeDiffSeconds > 5) {
        conflicts.push({ local: l, cloud: c });
      } else {
        matched.push({ local: l, cloud: c });
      }
    }
  }

  // Filter local-only
  const localOnly = localActive.filter((l) => !matchedLocalIds.has(l.id));

  // Filter cloud-only
  const cloudOnly = cloudActive.filter((c) => !matchedCloudIds.has(c.id));

  return {
    localOnly,
    cloudOnly,
    matched,
    conflicts,
    softDeletedLocalCount,
    softDeletedCloudCount,
  };
}
