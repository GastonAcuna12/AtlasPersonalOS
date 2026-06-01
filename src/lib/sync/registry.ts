import {
  ATLAS_STORAGE_KEYS,
  type AtlasStorageDomain,
  type AtlasStorageKey,
} from "@/lib/storage";
import type {
  AtlasSyncModule,
  SyncSensitivity,
} from "@/types/sync";

export type SyncModuleCapability = "local" | "cloud_poc" | "sync_not_enabled";

export type SyncRegistryEntry = {
  module: AtlasSyncModule;
  labelKey: string;
  fallbackLabel: string;
  sensitivity: SyncSensitivity;
  localDomains: AtlasStorageDomain[];
  localStorageKeys: AtlasStorageKey[];
  excludedLocalOnlyDomains?: AtlasStorageDomain[];
  supabaseTables: string[];
  rolloutOrder: number;
  currentCapabilities: SyncModuleCapability[];
};

function keysFor(domains: AtlasStorageDomain[]) {
  return domains.map((domain) => ATLAS_STORAGE_KEYS[domain]);
}

export const SYNC_MODULE_REGISTRY = [
  {
    module: "notes",
    labelKey: "sync.module.notes",
    fallbackLabel: "Notes",
    sensitivity: "high",
    localDomains: ["notes"],
    localStorageKeys: keysFor(["notes"]),
    supabaseTables: ["notes"],
    rolloutOrder: 1,
    currentCapabilities: ["local", "cloud_poc", "sync_not_enabled"],
  },
  {
    module: "tasks",
    labelKey: "sync.module.tasks",
    fallbackLabel: "Tasks",
    sensitivity: "medium",
    localDomains: ["tasks"],
    localStorageKeys: keysFor(["tasks"]),
    supabaseTables: ["tasks"],
    rolloutOrder: 2,
    currentCapabilities: ["local", "cloud_poc", "sync_not_enabled"],
  },
  {
    module: "goals",
    labelKey: "sync.module.goals",
    fallbackLabel: "Goals",
    sensitivity: "high",
    localDomains: ["goals"],
    localStorageKeys: keysFor(["goals"]),
    excludedLocalOnlyDomains: ["savings"],
    supabaseTables: ["goals"],
    rolloutOrder: 3,
    currentCapabilities: ["local", "cloud_poc", "sync_not_enabled"],
  },
  {
    module: "academics",
    labelKey: "sync.module.academics",
    fallbackLabel: "Academics",
    sensitivity: "medium",
    localDomains: ["subjects", "tasks", "studySessions"],
    localStorageKeys: keysFor(["subjects", "tasks", "studySessions"]),
    supabaseTables: [
      "academic_subjects",
      "academic_tasks",
      "study_sessions",
    ],
    rolloutOrder: 4,
    currentCapabilities: ["local", "cloud_poc", "sync_not_enabled"],
  },
  {
    module: "gym",
    labelKey: "sync.module.gym",
    fallbackLabel: "Gym",
    sensitivity: "medium",
    localDomains: ["gymLogs"],
    localStorageKeys: keysFor(["gymLogs"]),
    supabaseTables: ["gym_logs"],
    rolloutOrder: 5,
    currentCapabilities: ["local", "cloud_poc", "sync_not_enabled"],
  },
  {
    module: "work",
    labelKey: "sync.module.work",
    fallbackLabel: "Work",
    sensitivity: "high",
    localDomains: ["clients", "workItems"],
    localStorageKeys: keysFor(["clients", "workItems"]),
    supabaseTables: ["work_clients", "work_items"],
    rolloutOrder: 6,
    currentCapabilities: ["local", "cloud_poc", "sync_not_enabled"],
  },
  {
    module: "finances",
    labelKey: "sync.module.finances",
    fallbackLabel: "Finances",
    sensitivity: "high",
    localDomains: ["transactions"],
    localStorageKeys: keysFor(["transactions"]),
    excludedLocalOnlyDomains: ["savings", "financeSettings"],
    supabaseTables: ["finance_transactions"],
    rolloutOrder: 7,
    currentCapabilities: ["local", "cloud_poc", "sync_not_enabled"],
  },
] satisfies SyncRegistryEntry[];

export const SYNC_MODULE_REGISTRY_BY_MODULE = Object.fromEntries(
  SYNC_MODULE_REGISTRY.map((entry) => [entry.module, entry]),
) as Record<AtlasSyncModule, SyncRegistryEntry>;
