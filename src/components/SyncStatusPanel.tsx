"use client";

import { useMemo, useSyncExternalStore } from "react";
import { useAtlasAuth } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { SYNC_MODULE_REGISTRY } from "@/lib/sync/registry";
import { useMigrationPreview } from "@/lib/sync/preview";
import { getDefaultSyncState, useSyncState } from "@/lib/sync/state";
import { useAtlasSettings } from "@/lib/settings";
import type { MigrationPreview } from "@/lib/sync/preview";
import type {
  ModuleSyncStatus,
  WorkspaceSyncMode,
} from "@/types/sync";

function getEffectiveWorkspaceMode(
  storedMode: WorkspaceSyncMode,
  authStatus: string,
): WorkspaceSyncMode {
  if (storedMode === "local_only" && authStatus === "signed_in") {
    return "cloud_ready";
  }

  return storedMode;
}

function statusClass(status: ModuleSyncStatus) {
  if (status === "synced") {
    return "border-emerald-500/25 bg-emerald-500/10 text-emerald-400";
  }

  if (status === "error" || status === "conflict") {
    return "border-red-500/25 bg-red-500/10 text-red-300";
  }

  if (status === "syncing" || status === "migration_required") {
    return "border-amber-500/25 bg-amber-500/10 text-amber-400";
  }

  if (status === "cloud_available") {
    return "border-sky-500/25 bg-sky-500/10 text-sky-300";
  }

  return "border-[#27272a] bg-[#121214] text-zinc-400";
}

function subscribeToClientReady(listener: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const timeoutId = window.setTimeout(listener, 0);

  return () => {
    window.clearTimeout(timeoutId);
  };
}

function getClientReadySnapshot() {
  return true;
}

function getServerReadySnapshot() {
  return false;
}

export function SyncStatusPanel() {
  const auth = useAtlasAuth();
  const { settings } = useAtlasSettings();
  const language = settings.language;
  const syncState = useSyncState();
  const migrationPreview = useMigrationPreview();
  const hasMounted = useSyncExternalStore(
    subscribeToClientReady,
    getClientReadySnapshot,
    getServerReadySnapshot,
  );
  const fallbackSyncState = useMemo(() => getDefaultSyncState(), []);
  const fallbackMigrationPreview = useMemo<MigrationPreview>(
    () => ({
        modules: SYNC_MODULE_REGISTRY.map((entry) => ({
          module: entry.module,
          localCount: 0,
          cloudCount: null,
          parts: {},
        })),
        totalLocalCount: 0,
        generatedAt: null,
      }),
    [],
  );
  const displaySyncState = hasMounted ? syncState : fallbackSyncState;
  const displayMigrationPreview = hasMounted
    ? migrationPreview
    : fallbackMigrationPreview;
  const workspaceMode = getEffectiveWorkspaceMode(
    displaySyncState.workspaceMode,
    hasMounted ? auth.status : "signed_out",
  );

  const previewByModule = new Map(
    displayMigrationPreview.modules.map((entry) => [entry.module, entry]),
  );
  const sourceOfTruth =
    workspaceMode === "cloud_synced"
      ? t(language, "sync.source.cloud")
      : t(language, "sync.source.local");

  const authReadiness = (() => {
    if (!auth.isConfigured) {
      return t(language, "sync.auth.unconfigured");
    }

    if (auth.status === "signed_in") {
      return t(language, "sync.auth.signedIn");
    }

    if (auth.status === "loading") {
      return t(language, "sync.auth.loading");
    }

    if (auth.status === "error") {
      return t(language, "sync.auth.error");
    }

    return t(language, "sync.auth.signedOut");
  })();

  return (
    <section className="rounded-xl border border-sky-500/20 bg-[#18181b] p-6 shadow-xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-sky-400">
            {t(language, "sync.eyebrow")}
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-zinc-100">
            {t(language, "sync.title")}
          </h2>
          <p className="mt-2 text-xs leading-6 text-zinc-400">
            {t(language, "sync.description")}
          </p>
        </div>
        <span className="w-fit rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-400">
          {t(language, "sync.realSyncDisabled")}
        </span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-[#27272a] bg-[#121214] p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            {t(language, "sync.workspaceMode")}
          </p>
          <p className="mt-2 text-sm font-bold text-zinc-100">
            {t(
              language,
              `sync.workspaceMode.${workspaceMode}`,
              workspaceMode,
            )}
          </p>
        </div>
        <div className="rounded-lg border border-[#27272a] bg-[#121214] p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            {t(language, "sync.sourceOfTruth")}
          </p>
          <p className="mt-2 text-sm font-bold text-zinc-100">
            {sourceOfTruth}
          </p>
        </div>
        <div className="rounded-lg border border-[#27272a] bg-[#121214] p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            {t(language, "sync.cloudReadiness")}
          </p>
          <p className="mt-2 text-sm font-bold text-zinc-100">
            {authReadiness}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-[#27272a] bg-[#121214] p-4 text-xs leading-6 text-zinc-500">
        {t(language, "sync.noRealSyncMessage")}
      </div>

      <div className="mt-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              {t(language, "sync.migrationPreview")}
            </p>
            <h3 className="mt-1 text-sm font-bold text-zinc-100">
            {displayMigrationPreview.totalLocalCount}{" "}
            {t(language, "sync.totalLocalRecords")}
            </h3>
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            {t(language, "sync.lastSynced")}:{" "}
            {displaySyncState.lastSyncedAt ?? t(language, "sync.neverSynced")}
          </p>
        </div>

        <div className="mt-3 grid gap-2">
          {SYNC_MODULE_REGISTRY.map((entry) => {
            const moduleState = displaySyncState.modules[entry.module];
            const status = moduleState?.status ?? "local_only";
            const preview = previewByModule.get(entry.module);

            return (
              <div
                key={entry.module}
                className="grid gap-3 rounded-lg border border-[#27272a] bg-[#121214] p-3 text-xs sm:grid-cols-[1fr_auto_auto]"
              >
                <div>
                  <p className="font-bold text-zinc-100">
                    {t(language, entry.labelKey, entry.fallbackLabel)}
                  </p>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                    {t(
                      language,
                      `sync.sensitivity.${entry.sensitivity}`,
                      entry.sensitivity,
                    )}{" "}
                    - {entry.supabaseTables.join(", ")}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    {t(language, "sync.localRecordCounts")}
                  </p>
                  <p className="mt-1 font-bold text-zinc-100">
                    {preview?.localCount ?? 0}{" "}
                    {t(language, "sync.localRecords")}
                  </p>
                  {preview?.excludedLocalOnly ? (
                    <p className="mt-1 text-[10px] text-zinc-500">
                      {t(language, "sync.localOnlyExcluded")}:{" "}
                      {Object.entries(preview.excludedLocalOnly)
                        .map(([label, count]) => `${label}: ${count}`)
                        .join(", ")}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center sm:justify-end">
                  <span
                    className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${statusClass(status)}`}
                  >
                    {t(language, `sync.moduleStatus.${status}`, status)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
