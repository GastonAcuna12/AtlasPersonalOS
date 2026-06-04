import type { AtlasModule, WorkspacePreset, EnabledModules } from "@/types/atlas";

export interface PresetDefinition {
  id: WorkspacePreset;
  nameKey: string;
  descKey: string;
  icon: string;
  accentClass: string;
  enabledModules: AtlasModule[];
}

export const WORKSPACE_PRESETS: PresetDefinition[] = [
  {
    id: "student",
    nameKey: "onboarding.preset.student.name",
    descKey: "onboarding.preset.student.desc",
    icon: "🎓",
    accentClass: "border-cyan-500/20 text-cyan-400 bg-cyan-950/10 hover:border-cyan-500/40",
    enabledModules: ["today", "calendar", "notes", "goals", "academics"],
  },
  {
    id: "freelancer",
    nameKey: "onboarding.preset.freelancer.name",
    descKey: "onboarding.preset.freelancer.desc",
    icon: "💼",
    accentClass: "border-amber-500/20 text-amber-400 bg-amber-950/10 hover:border-amber-500/40",
    enabledModules: ["today", "calendar", "notes", "goals", "finances", "work"],
  },
  {
    id: "personal_finance",
    nameKey: "onboarding.preset.finance.name",
    descKey: "onboarding.preset.finance.desc",
    icon: "💳",
    accentClass: "border-emerald-500/20 text-emerald-400 bg-emerald-950/10 hover:border-emerald-500/40",
    enabledModules: ["today", "calendar", "finances", "goals"],
  },
  {
    id: "full",
    nameKey: "onboarding.preset.full.name",
    descKey: "onboarding.preset.full.desc",
    icon: "🌌",
    accentClass: "border-violet-500/20 text-violet-400 bg-violet-950/10 hover:border-violet-500/40",
    enabledModules: ["today", "work", "finances", "gym", "academics", "goals", "notes", "review", "calendar"],
  },
  {
    id: "custom",
    nameKey: "onboarding.preset.custom.name",
    descKey: "onboarding.preset.custom.desc",
    icon: "⚙️",
    accentClass: "border-zinc-500/20 text-zinc-400 bg-zinc-900/40 hover:border-zinc-500/40",
    enabledModules: ["today"],
  },
];

/**
 * Returns the default EnabledModules configuration map for a given workspace preset.
 */
export function getModulesForPreset(preset: WorkspacePreset): EnabledModules {
  const definition = WORKSPACE_PRESETS.find((p) => p.id === preset);
  const enabledList = definition ? definition.enabledModules : [];
  
  const allModules: AtlasModule[] = [
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
  
  return allModules.reduce<EnabledModules>((acc, mod) => {
    acc[mod] = enabledList.includes(mod);
    return acc;
  }, {} as EnabledModules);
}

/**
 * Applies a preset's default module configuration onto the settings object,
 * returning the updated enabledModules record, onboardingCompleted: true,
 * and the preset ID itself.
 * 
 * If presetId is "custom", it keeps the current enabledModules intact.
 */
export function applyWorkspacePreset(
  currentEnabledModules: EnabledModules,
  presetId: WorkspacePreset,
): { enabledModules: EnabledModules; workspacePreset: WorkspacePreset; onboardingCompleted: boolean } {
  if (presetId === "custom") {
    return {
      enabledModules: { ...currentEnabledModules },
      workspacePreset: "custom",
      onboardingCompleted: true,
    };
  }
  
  return {
    enabledModules: getModulesForPreset(presetId),
    workspacePreset: presetId,
    onboardingCompleted: true,
  };
}
