"use client";

import Link from "next/link";
import { useState } from "react";
import { useAtlasAuth } from "@/lib/auth";
import {
  createCloudNote,
  listCloudNotes,
} from "@/lib/supabase/notes";
import type { Note, NoteDraft } from "@/types/atlas";
import { t } from "@/lib/i18n";
import { useAtlasSettings } from "@/lib/settings";

type CloudAction = "load" | "create" | "upload" | null;

type NotesCloudPanelProps = {
  localNotes: Note[];
};

function getSelectedNote(localNotes: Note[], selectedNoteId: string) {
  const selectedId = selectedNoteId || localNotes[0]?.id || "";
  return localNotes.find((note) => note.id === selectedId) ?? null;
}

export function NotesCloudPanel({ localNotes }: NotesCloudPanelProps) {
  const auth = useAtlasAuth();
  const { settings } = useAtlasSettings();
  const language = settings.language;
  const [cloudNotes, setCloudNotes] = useState<Note[]>([]);
  const [hasLoadedCloudNotes, setHasLoadedCloudNotes] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState("");
  const [activeAction, setActiveAction] = useState<CloudAction>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedNote = getSelectedNote(localNotes, selectedNoteId);
  const selectedValue = selectedNote?.id ?? "";

  async function handleLoadCloudNotes() {
    setActiveAction("load");
    setMessage("");
    setError("");

    try {
      const result = await listCloudNotes();

      if (result.ok) {
        setCloudNotes(result.data);
        setHasLoadedCloudNotes(true);
        setMessage(result.message);
      } else {
        setError(result.error);
      }
    } finally {
      setActiveAction(null);
    }
  }

  async function handleCreateTestCloudNote() {
    setActiveAction("create");
    setMessage("");
    setError("");

    const now = new Date().toISOString();
    const testNote: NoteDraft = {
      title: "Atlas Cloud Notes POC",
      area: "Atlas",
      tags: ["cloud-poc"],
      content:
        `Manual cloud note created from Atlas at ${now}.\n\n` +
        "This is placeholder content for testing Supabase Notes only.",
    };

    try {
      const result = await createCloudNote(testNote);

      if (result.ok && result.data) {
        setCloudNotes((current) => [result.data as Note, ...current]);
        setHasLoadedCloudNotes(true);
        setMessage(result.message);
      } else if (!result.ok) {
        setError(result.error);
      }
    } finally {
      setActiveAction(null);
    }
  }

  async function handleUploadSelectedNote() {
    if (!selectedNote) {
      setError(t(language, "cloud.chooseLocalNote"));
      return;
    }

    const confirmed = window.confirm(
      t(
        language,
        "cloud.notes.confirmUpload",
        "Upload this selected local note to Supabase Cloud Notes? This sends its title, content, area, and tags. The local note will remain unchanged.",
      ),
    );

    if (!confirmed) {
      return;
    }

    setActiveAction("upload");
    setMessage("");
    setError("");

    try {
      const result = await createCloudNote(selectedNote);

      if (result.ok && result.data) {
        setCloudNotes((current) => [result.data as Note, ...current]);
        setHasLoadedCloudNotes(true);
        setMessage(
          t(language, "cloud.uploadedNote"),
        );
      } else if (!result.ok) {
        setError(result.error);
      }
    } finally {
      setActiveAction(null);
    }
  }

  if (!auth.isConfigured) {
    return (
      <section className="mt-6 rounded-xl border border-[#27272a] bg-[#18181b] p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              {t(language, "cloud.notes.title")}
            </p>
            <p className="mt-1 text-sm font-semibold text-zinc-100">
              {t(language, "cloud.localNotes")}
            </p>
          </div>
          <span className="w-fit rounded-full border border-zinc-700 bg-zinc-800/70 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-300">
            {t(language, "settings.accountSync.notConfigured.status")}
          </span>
        </div>
      </section>
    );
  }

  if (auth.status !== "signed_in") {
    return (
      <section className="mt-6 rounded-xl border border-[#27272a] bg-[#18181b] p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-sky-400">
              {t(language, "cloud.notes.title")}
            </p>
            <p className="mt-2 text-sm font-semibold text-zinc-100">
              {t(language, "cloud.localNotes")}
            </p>
            <p className="mt-1 text-xs leading-6 text-zinc-500">
              {t(language, "cloud.notes.signIn")}
            </p>
          </div>
          <Link
            href="/account"
            className="w-fit rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
          >
            {t(language, "account.eyebrow")}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-6 rounded-xl border border-sky-500/25 bg-[#18181b] p-6 shadow-xl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-sky-400">
            {t(language, "cloud.notes.title")}
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-zinc-100">
            {t(language, "cloud.notes.available")}
          </h2>
          <p className="mt-2 max-w-2xl text-xs leading-6 text-zinc-400">
            {t(language, "common.manualCloudPreview")}. {t(language, "common.cloudDataSeparate")}
          </p>
        </div>
        <span className="w-fit rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
          {t(language, "settings.accountSync.signedIn")}
        </span>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto]">
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={handleLoadCloudNotes}
            disabled={activeAction !== null}
            className="rounded-lg border border-[#27272a] bg-[#121214] px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-300 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {activeAction === "load" ? t(language, "common.loading") : t(language, "cloud.loadNotes")}
          </button>
          <button
            type="button"
            onClick={handleCreateTestCloudNote}
            disabled={activeAction !== null}
            className="rounded-lg border border-sky-500/25 bg-sky-500/10 px-4 py-3 text-xs font-bold uppercase tracking-wider text-sky-300 transition hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {activeAction === "create"
              ? t(language, "common.creating")
              : t(language, "cloud.createNote")}
          </button>
        </div>

        <button
          type="button"
          disabled
          className="rounded-lg border border-[#27272a] bg-[#121214]/70 px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-500 opacity-60"
        >
          {t(language, "cloud.uploadAllNotes")}
          <span className="ml-2 rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[9px] text-zinc-400">
            {t(language, "common.comingSoon")}
          </span>
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
        <label className="grid gap-1.5 text-xs font-semibold text-zinc-400">
          {t(language, "cloud.uploadNote")}
          <select
            value={selectedValue}
            onChange={(event) => setSelectedNoteId(event.target.value)}
            disabled={localNotes.length === 0 || activeAction !== null}
            className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2.5 text-zinc-100 focus:outline-none focus:border-sky-500/50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {localNotes.length === 0 ? (
              <option value="">{t(language, "cloud.noLocalNotes", "No local notes available")}</option>
            ) : (
              localNotes.map((note) => (
                <option key={note.id} value={note.id}>
                  {note.title}
                </option>
              ))
            )}
          </select>
        </label>
        <button
          type="button"
          onClick={handleUploadSelectedNote}
          disabled={!selectedNote || activeAction !== null}
          className="self-end rounded-lg border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-xs font-bold uppercase tracking-wider text-amber-400 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {activeAction === "upload" ? t(language, "common.uploading") : t(language, "cloud.uploadNote")}
        </button>
      </div>

      {message ? (
        <p className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-xs font-semibold text-emerald-400">
          {message}
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 text-xs font-semibold text-red-300">
          {error}
        </p>
      ) : null}

      {hasLoadedCloudNotes ? (
        <div className="mt-6 rounded-xl border border-[#27272a] bg-[#121214] p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                {t(language, "cloud.notes.title")}
              </p>
              <p className="mt-1 text-sm font-semibold text-zinc-100">
                {t(language, "common.manualCloudPreview")}
              </p>
            </div>
            <span className="w-fit rounded-full border border-[#27272a] bg-[#18181b] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              {cloudNotes.length} {t(language, "cloud.loaded", "loaded")}
            </span>
          </div>

          {cloudNotes.length > 0 ? (
            <div className="mt-4 grid gap-3">
              {cloudNotes.map((note) => (
                <article
                  key={note.id}
                  className="rounded-lg border border-[#27272a] bg-[#18181b] p-4"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-zinc-100">
                        {note.title}
                      </h3>
                      <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                        {note.area || t(language, "common.personal")} · {t(language, "cloud.updated", "Updated")}{" "}
                        {note.updatedAt.slice(0, 10)}
                      </p>
                    </div>
                    {note.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {note.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-[#27272a] bg-[#121214] px-2 py-0.5 text-[9px] font-semibold text-zinc-400"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-xs leading-6 text-zinc-400">
                    {note.content || t(language, "common.noContent")}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-lg border border-[#27272a] bg-[#18181b] p-4 text-xs leading-6 text-zinc-500">
              {t(language, "cloud.notes.empty", "No cloud notes returned. Local notes are still unchanged.")}
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}
