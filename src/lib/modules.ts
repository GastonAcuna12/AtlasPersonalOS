import type { AtlasModule, AtlasSettings, EnabledModules } from "@/types/atlas";

export const ATLAS_MODULES: AtlasModule[] = [
  "today",
  "work",
  "finances",
  "gym",
  "academics",
  "goals",
  "notes",
  "review",
  "calendar",
];

export const DEFAULT_ENABLED_MODULES: EnabledModules = {
  today: true,
  work: true,
  finances: true,
  gym: true,
  academics: true,
  goals: true,
  notes: true,
  review: true,
  calendar: true,
};

export type ModulePreference = {
  id: AtlasModule;
  labelKey: string;
  descriptionKey: string;
  href: string;
};

export const MODULE_PREFERENCES: ModulePreference[] = [
  {
    id: "today",
    labelKey: "modules.today.label",
    descriptionKey: "modules.today.description",
    href: "/today",
  },
  {
    id: "work",
    labelKey: "modules.work.label",
    descriptionKey: "modules.work.description",
    href: "/work",
  },
  {
    id: "finances",
    labelKey: "modules.finances.label",
    descriptionKey: "modules.finances.description",
    href: "/finances",
  },
  {
    id: "gym",
    labelKey: "modules.gym.label",
    descriptionKey: "modules.gym.description",
    href: "/gym",
  },
  {
    id: "academics",
    labelKey: "modules.academics.label",
    descriptionKey: "modules.academics.description",
    href: "/academics",
  },
  {
    id: "goals",
    labelKey: "modules.goals.label",
    descriptionKey: "modules.goals.description",
    href: "/goals",
  },
  {
    id: "notes",
    labelKey: "modules.notes.label",
    descriptionKey: "modules.notes.description",
    href: "/notes",
  },
  {
    id: "review",
    labelKey: "modules.review.label",
    descriptionKey: "modules.review.description",
    href: "/review",
  },
  {
    id: "calendar",
    labelKey: "modules.calendar.label",
    descriptionKey: "modules.calendar.description",
    href: "/calendar",
  },
];

export function normalizeEnabledModules(value: unknown): EnabledModules {
  const candidate = value && typeof value === "object" ? (value as Partial<EnabledModules>) : {};

  return ATLAS_MODULES.reduce<EnabledModules>(
    (enabledModules, module) => ({
      ...enabledModules,
      [module]: typeof candidate[module] === "boolean" ? candidate[module] : true,
    }),
    { ...DEFAULT_ENABLED_MODULES },
  );
}

export function getEnabledModules(settings: Partial<AtlasSettings> | null | undefined): EnabledModules {
  return normalizeEnabledModules(settings?.enabledModules);
}

export function isModuleEnabled(
  settings: Partial<AtlasSettings> | EnabledModules | null | undefined,
  module: AtlasModule,
): boolean {
  if (!settings) {
    return true;
  }

  if ("enabledModules" in settings) {
    return normalizeEnabledModules(settings.enabledModules)[module];
  }

  return normalizeEnabledModules(settings)[module];
}
