export const ATLAS_SYNC_MODULES = [
  "notes",
  "tasks",
  "goals",
  "academics",
  "gym",
  "work",
  "finances",
] as const;

export type WorkspaceSyncMode =
  | "local_only"
  | "cloud_ready"
  | "migration_pending"
  | "cloud_synced"
  | "offline_pending"
  | "sync_error";

export type ModuleSyncStatus =
  | "local_only"
  | "cloud_available"
  | "migration_required"
  | "syncing"
  | "synced"
  | "conflict"
  | "error"
  | "disabled";

export type AtlasSyncModule = (typeof ATLAS_SYNC_MODULES)[number];

export type SyncSensitivity = "low" | "medium" | "high";

export type MigrationMapEntry = {
  module: AtlasSyncModule;
  localId: string;
  cloudId: string;
  migratedAt: string;
  lastSyncedAt: string | null;
};

export type ModuleRecordCount = {
  localCount: number;
  cloudCount: number | null;
};

export type ModuleSyncState = {
  module: AtlasSyncModule;
  status: ModuleSyncStatus;
  lastSyncedAt: string | null;
  lastError: string | null;
  migrationCompletedAt: string | null;
  localCount: number;
  cloudCount: number | null;
  sensitivity: SyncSensitivity;
};

export type AtlasSyncState = {
  workspaceMode: WorkspaceSyncMode;
  modules: Record<AtlasSyncModule, ModuleSyncState>;
  lastSyncedAt: string | null;
  lastError: string | null;
  migrationCompletedAt: string | null;
  cloudWorkspaceId: string | null;
  recordCounts: Partial<Record<AtlasSyncModule, ModuleRecordCount>>;
  migrationMap: MigrationMapEntry[];
  updatedAt: string | null;
};
