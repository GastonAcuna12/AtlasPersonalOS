"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  AUTH_MIGRATION_CHOICES,
  useAtlasAuth,
  useLocalAtlasDataSummary,
  type AuthMigrationChoice,
} from "@/lib/auth";
import type { AtlasStorageDomain } from "@/lib/storage";

const MIGRATION_PROMPT_DISMISSED_KEY = "atlas.migrationPromptDismissed";
const MIGRATION_PROMPT_DISMISSED_EVENT = "atlas:migrationPromptDismissed";

const DOMAIN_AREA_LABELS: Record<AtlasStorageDomain, string> = {
  transactions: "finances",
  savings: "goals",
  financeSettings: "finances",
  gymLogs: "gym",
  tasks: "tasks",
  dailyPlans: "today",
  dailyWraps: "daily wraps",
  subjects: "academics",
  academicTasks: "academics",
  studySessions: "academics",
  notes: "notes",
  goals: "goals",
  weeklyReviews: "reviews",
  clients: "work",
  workItems: "work",
  xp: "XP",
  xpEvents: "XP",
  appSettings: "settings",
};

function canUseLocalStorage() {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return Boolean(window.localStorage);
  } catch {
    return false;
  }
}

function readDismissedState() {
  if (!canUseLocalStorage()) {
    return false;
  }

  return window.localStorage.getItem(MIGRATION_PROMPT_DISMISSED_KEY) === "true";
}

function writeDismissedState(value: boolean) {
  if (!canUseLocalStorage()) {
    return;
  }

  if (value) {
    window.localStorage.setItem(MIGRATION_PROMPT_DISMISSED_KEY, "true");
    return;
  }

  window.localStorage.removeItem(MIGRATION_PROMPT_DISMISSED_KEY);
}

function notifyDismissedStateChange() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(MIGRATION_PROMPT_DISMISSED_EVENT));
}

function subscribeToDismissedState(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  function handleStorage(event: StorageEvent) {
    if (event.key === MIGRATION_PROMPT_DISMISSED_KEY) {
      onStoreChange();
    }
  }

  window.addEventListener(MIGRATION_PROMPT_DISMISSED_EVENT, onStoreChange);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(MIGRATION_PROMPT_DISMISSED_EVENT, onStoreChange);
    window.removeEventListener("storage", handleStorage);
  };
}

function getAreaSummary(domains: AtlasStorageDomain[]) {
  const areas = Array.from(
    new Set(domains.map((domain) => DOMAIN_AREA_LABELS[domain])),
  );

  return {
    count: areas.length,
    label: areas.length > 0 ? areas.join(", ") : "local Atlas data",
    noun: areas.length === 1 ? "area" : "areas",
  };
}

function isDisabledMigrationChoice(choice: AuthMigrationChoice) {
  return (
    choice === "upload_local_to_cloud" ||
    choice === "merge_local_and_cloud" ||
    choice === "replace_cloud_with_local"
  );
}

export function MigrationDecisionPanel() {
  const auth = useAtlasAuth();
  const localDataSummary = useLocalAtlasDataSummary();
  const isDismissed = useSyncExternalStore(
    subscribeToDismissedState,
    readDismissedState,
    () => false,
  );

  const areaSummary = useMemo(
    () => getAreaSummary(localDataSummary.domainsDetected),
    [localDataSummary.domainsDetected],
  );

  const shouldShow =
    auth.isConfigured &&
    auth.status === "signed_in" &&
    localDataSummary.hasLocalData;

  function dismissPanel() {
    writeDismissedState(true);
    notifyDismissedStateChange();
  }

  function restorePanel() {
    writeDismissedState(false);
    notifyDismissedStateChange();
  }

  if (!shouldShow) {
    return null;
  }

  if (isDismissed) {
    return (
      <section className="rounded-xl border border-[#27272a] bg-[#18181b] p-5 shadow-xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              Migration Decision
            </p>
            <p className="mt-2 text-sm font-semibold text-zinc-100">
              Migration choices are hidden locally.
            </p>
            <p className="mt-1 text-xs leading-6 text-zinc-500">
              Atlas is still local-first. No data has been uploaded, synced, or
              migrated.
            </p>
          </div>
          <button
            type="button"
            onClick={restorePanel}
            className="w-fit rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
          >
            Show Choices
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-amber-500/25 bg-[#18181b] p-6 shadow-xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500">
            Migration Decision
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-zinc-100">
            Local data found
          </h2>
          <p className="mt-2 text-xs leading-6 text-zinc-400">
            Atlas found local data on this browser. Cloud migration is not
            active yet.
          </p>
        </div>
        <span className="w-fit rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-400">
          Placeholder
        </span>
      </div>

      <div className="mt-5 rounded-lg border border-[#27272a] bg-[#121214] p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
          Safe Local Summary
        </p>
        <p className="mt-2 text-sm font-semibold text-zinc-100">
          {localDataSummary.approximateRecordCount} approximate records across{" "}
          {areaSummary.count} {areaSummary.noun}
        </p>
        <p className="mt-1 text-xs leading-6 text-zinc-500">
          Local data detected across: {areaSummary.label}. Atlas does not show
          amounts, note titles, client names, or private content here.
        </p>
      </div>

      <div className="mt-5 grid gap-3">
        {AUTH_MIGRATION_CHOICES.map((choice) => {
          const isDisabled = isDisabledMigrationChoice(choice.value);

          return (
            <button
              key={choice.value}
              type="button"
              disabled={isDisabled}
              onClick={isDisabled ? undefined : dismissPanel}
              className={`rounded-lg border px-4 py-3 text-left transition ${
                isDisabled
                  ? "cursor-not-allowed border-[#27272a] bg-[#121214]/70 opacity-60"
                  : "border-[#27272a] bg-[#121214] hover:bg-zinc-800"
              }`}
            >
              <span className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm font-semibold text-zinc-100">
                  {choice.label}
                </span>
                {isDisabled ? (
                  <span className="w-fit rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                    Coming soon
                  </span>
                ) : (
                  <span className="w-fit rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-400">
                    Local only
                  </span>
                )}
              </span>
              <span className="mt-1 block text-xs leading-5 text-zinc-500">
                {choice.description}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-[10px] leading-5 text-zinc-500">
        Upload, merge, and replace are disabled until Atlas has tested cloud
        tables, RLS policies, and migration safeguards. These controls do not
        write to Supabase.
      </p>
    </section>
  );
}
