"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  AUTH_MIGRATION_CHOICES,
  useAtlasAuth,
  useLocalAtlasDataSummary,
  type AuthMigrationChoice,
} from "@/lib/auth";
import { t, type Language } from "@/lib/i18n";
import { useAtlasSettings } from "@/lib/settings";
import type { AtlasStorageDomain } from "@/lib/storage";

const MIGRATION_PROMPT_DISMISSED_KEY = "atlas.migrationPromptDismissed";
const MIGRATION_PROMPT_DISMISSED_EVENT = "atlas:migrationPromptDismissed";

const DOMAIN_AREA_KEYS: Record<AtlasStorageDomain, string> = {
  transactions: "migration.area.finances",
  plannedExpenses: "migration.area.finances",
  savings: "migration.area.goals",
  financeSettings: "migration.area.finances",
  financeBudgets: "migration.area.finances",
  financeAccounts: "migration.area.finances",
  gymLogs: "migration.area.gym",
  tasks: "migration.area.tasks",
  dailyPlans: "migration.area.today",
  dailyWraps: "migration.area.dailyWraps",
  subjects: "migration.area.academics",
  academicTasks: "migration.area.academics",
  studySessions: "migration.area.academics",
  notes: "migration.area.notes",
  goals: "migration.area.goals",
  weeklyReviews: "migration.area.reviews",
  clients: "migration.area.work",
  workItems: "migration.area.work",
  xp: "migration.area.xp",
  xpEvents: "migration.area.xp",
  appSettings: "migration.area.settings",
  focusTask: "migration.area.today",
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

function getAreaSummary(domains: AtlasStorageDomain[], language: Language) {
  const areas = Array.from(
    new Set(domains.map((domain) => t(language, DOMAIN_AREA_KEYS[domain]))),
  );

  return {
    count: areas.length,
    label:
      areas.length > 0
        ? areas.join(", ")
        : t(language, "migration.area.localData"),
    noun:
      areas.length === 1
        ? t(language, "migration.summary.area")
        : t(language, "migration.summary.areas"),
  };
}

function isDisabledMigrationChoice(choice: AuthMigrationChoice) {
  return (
    choice === "upload_local_to_cloud" ||
    choice === "merge_local_and_cloud" ||
    choice === "replace_cloud_with_local"
  );
}

function getMigrationChoiceLabel(language: Language, choice: AuthMigrationChoice) {
  return t(language, `migration.choice.${choice}`);
}

function getMigrationChoiceDescription(
  language: Language,
  choice: AuthMigrationChoice,
) {
  return t(language, `migration.choice.${choice}.description`);
}

export function MigrationDecisionPanel() {
  const { settings } = useAtlasSettings();
  const language = settings.language;
  const auth = useAtlasAuth();
  const localDataSummary = useLocalAtlasDataSummary();
  const isDismissed = useSyncExternalStore(
    subscribeToDismissedState,
    readDismissedState,
    () => false,
  );

  const areaSummary = useMemo(
    () => getAreaSummary(localDataSummary.domainsDetected, language),
    [language, localDataSummary.domainsDetected],
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
              {t(language, "migration.eyebrow")}
            </p>
            <p className="mt-2 text-sm font-semibold text-zinc-100">
              {t(language, "migration.hiddenTitle")}
            </p>
            <p className="mt-1 text-xs leading-6 text-zinc-500">
              {t(language, "migration.hiddenDescription")}
            </p>
          </div>
          <button
            type="button"
            onClick={restorePanel}
            className="w-fit rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
          >
            {t(language, "migration.showChoices")}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-[#C8A96A]/25 bg-[#18181b] p-6 shadow-xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#C8A96A]">
            {t(language, "migration.eyebrow")}
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-zinc-100">
            {t(language, "migration.foundTitle")}
          </h2>
          <p className="mt-2 text-xs leading-6 text-zinc-400">
            {t(language, "migration.foundDescription")}
          </p>
        </div>
        <span className="w-fit rounded-full border border-[#C8A96A]/25 bg-[#C8A96A]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#D4B87A]">
          {t(language, "migration.placeholder")}
        </span>
      </div>

      <div className="mt-5 rounded-lg border border-[#27272a] bg-[#121214] p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
          {t(language, "migration.safeSummary")}
        </p>
        <p className="mt-2 text-sm font-semibold text-zinc-100">
          {localDataSummary.approximateRecordCount}{" "}
          {t(language, "migration.summary.approximateRecords")}{" "}
          {areaSummary.count} {areaSummary.noun}
        </p>
        <p className="mt-1 text-xs leading-6 text-zinc-500">
          {t(language, "migration.summary.detectedAcross")} {areaSummary.label}.{" "}
          {t(language, "migration.summary.privateDataHidden")}
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
                  {getMigrationChoiceLabel(language, choice.value)}
                </span>
                {isDisabled ? (
                  <span className="w-fit rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                    {t(language, "common.comingSoon")}
                  </span>
                ) : (
                  <span className="w-fit rounded-full border border-[#8A9A5B]/25 bg-[#8A9A5B]/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#9AAB6B]">
                    {t(language, "common.localOnly")}
                  </span>
                )}
              </span>
              <span className="mt-1 block text-xs leading-5 text-zinc-500">
                {getMigrationChoiceDescription(language, choice.value)}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-[10px] leading-5 text-zinc-500">
        {t(language, "migration.disabledNote")}
      </p>
    </section>
  );
}
