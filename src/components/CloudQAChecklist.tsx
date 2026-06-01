"use client";

import { useMemo, useSyncExternalStore } from "react";
import { t, type Language } from "@/lib/i18n";
import { useAtlasSettings } from "@/lib/settings";

const CLOUD_QA_STORAGE_KEY = "atlas.cloudQaChecklist";
const CLOUD_QA_STORAGE_EVENT = "atlas-cloud-qa-checklist";

type CloudQAModule = {
  id: string;
  nameKey:
    | "cloudQa.module.notes"
    | "cloudQa.module.tasks"
    | "cloudQa.module.goals"
    | "cloudQa.module.academics"
    | "cloudQa.module.gym";
  panelNameKey:
    | "cloudQa.panelName.notes"
    | "cloudQa.panelName.tasks"
    | "cloudQa.panelName.goals"
    | "cloudQa.panelName.academics"
    | "cloudQa.panelName.gym";
  sqlFile: string;
  route: string;
};

type CloudQAState = Record<string, Record<string, boolean>>;

const EMPTY_CHECKLIST_STATE: CloudQAState = {};
let cachedRaw = "";
let cachedState: CloudQAState = EMPTY_CHECKLIST_STATE;

const CLOUD_QA_MODULES: CloudQAModule[] = [
  {
    id: "notes",
    nameKey: "cloudQa.module.notes",
    panelNameKey: "cloudQa.panelName.notes",
    sqlFile: "supabase/sql/001_notes.sql",
    route: "/notes",
  },
  {
    id: "tasks",
    nameKey: "cloudQa.module.tasks",
    panelNameKey: "cloudQa.panelName.tasks",
    sqlFile: "supabase/sql/002_tasks.sql",
    route: "/today",
  },
  {
    id: "goals",
    nameKey: "cloudQa.module.goals",
    panelNameKey: "cloudQa.panelName.goals",
    sqlFile: "supabase/sql/003_goals.sql",
    route: "/goals",
  },
  {
    id: "academics",
    nameKey: "cloudQa.module.academics",
    panelNameKey: "cloudQa.panelName.academics",
    sqlFile: "supabase/sql/004_academics.sql",
    route: "/academics",
  },
  {
    id: "gym",
    nameKey: "cloudQa.module.gym",
    panelNameKey: "cloudQa.panelName.gym",
    sqlFile: "supabase/sql/005_gym.sql",
    route: "/gym",
  },
];

const CLOUD_QA_STEPS = [
  "cloudQa.step.runSql",
  "cloudQa.step.signInA",
  "cloudQa.step.createA",
  "cloudQa.step.loadA",
  "cloudQa.step.signOutA",
  "cloudQa.step.signInB",
  "cloudQa.step.loadB",
  "cloudQa.step.createB",
  "cloudQa.step.signOutB",
  "cloudQa.step.signInAgainA",
  "cloudQa.step.confirmNoB",
  "cloudQa.step.confirmLocal",
  "cloudQa.step.confirmNoSync",
] as const;

const CLOUD_QA_WARNINGS = [
  "cloudQa.warning.env",
  "cloudQa.warning.serviceRole",
  "cloudQa.warning.fakeUsers",
  "cloudQa.warning.temporaryPanels",
  "cloudQa.warning.sensitiveData",
] as const;

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

function normalizeChecklistState(value: unknown): CloudQAState {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const nextState: CloudQAState = {};

  Object.entries(value).forEach(([moduleId, rawSteps]) => {
    const moduleState: Record<string, boolean> = {};

    if (rawSteps && typeof rawSteps === "object" && !Array.isArray(rawSteps)) {
      Object.entries(rawSteps).forEach(([stepIndex, checked]) => {
        if (/^\d+$/.test(stepIndex) && typeof checked === "boolean") {
          moduleState[stepIndex] = checked;
        }
      });
    }

    nextState[moduleId] = moduleState;
  });

  return nextState;
}

function readChecklistState(): CloudQAState {
  if (!canUseLocalStorage()) {
    return EMPTY_CHECKLIST_STATE;
  }

  try {
    const raw = window.localStorage.getItem(CLOUD_QA_STORAGE_KEY) ?? "";
    if (raw === cachedRaw) {
      return cachedState;
    }

    if (!raw) {
      cachedRaw = "";
      cachedState = EMPTY_CHECKLIST_STATE;
      return cachedState;
    }

    cachedRaw = raw;
    cachedState = normalizeChecklistState(JSON.parse(raw));
    return cachedState;
  } catch {
    return EMPTY_CHECKLIST_STATE;
  }
}

function writeChecklistState(state: CloudQAState) {
  if (!canUseLocalStorage()) {
    return;
  }

  try {
    const raw = JSON.stringify(state);
    window.localStorage.setItem(CLOUD_QA_STORAGE_KEY, raw);
    cachedRaw = raw;
    cachedState = state;
    window.dispatchEvent(new Event(CLOUD_QA_STORAGE_EVENT));
  } catch {
    // Dev-helper state should never interrupt Settings.
  }
}

function subscribeToChecklistState(listener: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  function handleStorage(event: StorageEvent) {
    if (event.key === CLOUD_QA_STORAGE_KEY) {
      cachedRaw = "";
      listener();
    }
  }

  window.addEventListener("storage", handleStorage);
  window.addEventListener(CLOUD_QA_STORAGE_EVENT, listener);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(CLOUD_QA_STORAGE_EVENT, listener);
  };
}

function getModuleCompletedCount(state: CloudQAState, moduleId: string) {
  const moduleState = state[moduleId] ?? {};
  return CLOUD_QA_STEPS.filter((_, index) => moduleState[String(index)]).length;
}

export function CloudQAChecklist() {
  const { settings } = useAtlasSettings();
  const language: Language = settings.language;
  const checklistState = useSyncExternalStore(
    subscribeToChecklistState,
    readChecklistState,
    () => EMPTY_CHECKLIST_STATE,
  );

  const totalCompleted = useMemo(
    () =>
      CLOUD_QA_MODULES.reduce(
        (sum, module) =>
          sum + getModuleCompletedCount(checklistState, module.id),
        0,
      ),
    [checklistState],
  );

  const totalSteps = CLOUD_QA_MODULES.length * CLOUD_QA_STEPS.length;

  function updateStep(moduleId: string, stepIndex: number, checked: boolean) {
    const current = readChecklistState();
    const next: CloudQAState = {
      ...current,
      [moduleId]: {
        ...(current[moduleId] ?? {}),
        [String(stepIndex)]: checked,
      },
    };

    writeChecklistState(next);
  }

  return (
    <section className="rounded-xl border border-sky-500/20 bg-[#18181b] p-6 shadow-xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-sky-400">
            {t(language, "cloudQa.eyebrow")}
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-zinc-100">
            {t(language, "cloudQa.title")}
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-zinc-400">
            {t(language, "cloudQa.description")}
          </p>
        </div>
        <span className="w-fit rounded-full border border-[#27272a] bg-[#121214] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
          {totalCompleted}/{totalSteps} {t(language, "cloudQa.checked")}
        </span>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {CLOUD_QA_WARNINGS.map((warning) => (
          <div
            key={warning}
            className="rounded-lg border border-amber-500/15 bg-amber-500/5 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-amber-300"
          >
            {t(language, warning)}
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4">
        {CLOUD_QA_MODULES.map((module) => {
          const completed = getModuleCompletedCount(checklistState, module.id);

          return (
            <details
              key={module.id}
              className="group rounded-xl border border-[#27272a] bg-[#121214] p-4"
              open={module.id === "notes"}
            >
              <summary className="cursor-pointer list-none">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-zinc-100">
                        {t(language, module.nameKey)}
                      </h3>
                      <span className="rounded-full border border-sky-500/25 bg-sky-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-sky-300">
                        {completed}/{CLOUD_QA_STEPS.length}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="rounded border border-[#27272a] bg-[#18181b] px-2 py-1 text-[9px] font-semibold text-zinc-400">
                        {t(language, "cloudQa.sql")}: {module.sqlFile}
                      </span>
                      <span className="rounded border border-[#27272a] bg-[#18181b] px-2 py-1 text-[9px] font-semibold text-zinc-400">
                        {t(language, "cloudQa.route")}: {module.route}
                      </span>
                      <span className="rounded border border-[#27272a] bg-[#18181b] px-2 py-1 text-[9px] font-semibold text-zinc-400">
                        {t(language, "cloudQa.panel")}:{" "}
                        {t(language, module.panelNameKey)}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 transition group-open:text-zinc-300">
                    {t(language, "cloudQa.details")}
                  </span>
                </div>
              </summary>

              <div className="mt-4 grid gap-2 border-t border-[#27272a] pt-4">
                {CLOUD_QA_STEPS.map((step, index) => {
                  const stepKey = String(index);
                  const checked = Boolean(
                    checklistState[module.id]?.[stepKey],
                  );

                  return (
                    <label
                      key={step}
                      className="flex items-start gap-3 rounded-lg border border-[#27272a]/70 bg-[#18181b] p-3 text-xs leading-5 text-zinc-300"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) =>
                          updateStep(module.id, index, event.target.checked)
                        }
                        className="mt-0.5 h-4 w-4 rounded border-[#3f3f46] bg-[#121214] accent-sky-500 disabled:opacity-40"
                      />
                      <span>
                        <span className="mr-1 font-mono text-[10px] text-zinc-500">
                          {index + 1}.
                        </span>
                        {t(language, step)}
                      </span>
                    </label>
                  );
                })}
              </div>
            </details>
          );
        })}
      </div>

      <p className="mt-4 text-[10px] leading-relaxed text-zinc-500">
        {t(language, "cloudQa.storageNote")}
      </p>
    </section>
  );
}
