"use client";

import { useSyncExternalStore } from "react";
import { SYNC_MODULE_REGISTRY } from "@/lib/sync/registry";
import type {
  AtlasSyncModule,
  AtlasSyncState,
  MigrationMapEntry,
  ModuleRecordCount,
  ModuleSyncState,
  ModuleSyncStatus,
  SyncSensitivity,
  WorkspaceSyncMode,
} from "@/types/sync";

export const SYNC_STATE_STORAGE_KEY = "atlas.syncState";

const WORKSPACE_SYNC_MODES: WorkspaceSyncMode[] = [
  "local_only",
  "cloud_ready",
  "migration_pending",
  "cloud_synced",
  "offline_pending",
  "sync_error",
];

const MODULE_SYNC_STATUSES: ModuleSyncStatus[] = [
  "local_only",
  "cloud_available",
  "migration_required",
  "syncing",
  "synced",
  "conflict",
  "error",
  "disabled",
];

const SYNC_SENSITIVITIES: SyncSensitivity[] = ["low", "medium", "high"];

type SyncStateListener = () => void;

const listeners = new Set<SyncStateListener>();

function canUseStorage() {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return Boolean(window.localStorage);
  } catch {
    return false;
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asNullableString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function asNonNegativeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : 0;
}

function isWorkspaceSyncMode(value: unknown): value is WorkspaceSyncMode {
  return (
    typeof value === "string" &&
    WORKSPACE_SYNC_MODES.includes(value as WorkspaceSyncMode)
  );
}

function isModuleSyncStatus(value: unknown): value is ModuleSyncStatus {
  return (
    typeof value === "string" &&
    MODULE_SYNC_STATUSES.includes(value as ModuleSyncStatus)
  );
}

function isSyncSensitivity(value: unknown): value is SyncSensitivity {
  return (
    typeof value === "string" &&
    SYNC_SENSITIVITIES.includes(value as SyncSensitivity)
  );
}

function notifySyncState() {
  listeners.forEach((listener) => listener());
}

function createDefaultModuleState(
  module: AtlasSyncModule,
  sensitivity: SyncSensitivity,
): ModuleSyncState {
  return {
    module,
    status: "local_only",
    lastSyncedAt: null,
    lastError: null,
    migrationCompletedAt: null,
    localCount: 0,
    cloudCount: null,
    sensitivity,
  };
}

function normalizeModuleState(
  value: unknown,
  fallback: ModuleSyncState,
): ModuleSyncState {
  if (!isObject(value)) {
    return fallback;
  }

  return {
    module: fallback.module,
    status: isModuleSyncStatus(value.status) ? value.status : fallback.status,
    lastSyncedAt: asNullableString(value.lastSyncedAt),
    lastError: asNullableString(value.lastError),
    migrationCompletedAt: asNullableString(value.migrationCompletedAt),
    localCount: asNonNegativeNumber(value.localCount),
    cloudCount:
      typeof value.cloudCount === "number" && Number.isFinite(value.cloudCount)
        ? Math.max(value.cloudCount, 0)
        : null,
    sensitivity: isSyncSensitivity(value.sensitivity)
      ? value.sensitivity
      : fallback.sensitivity,
  };
}

function normalizeRecordCount(value: unknown): ModuleRecordCount | null {
  if (!isObject(value)) {
    return null;
  }

  return {
    localCount: asNonNegativeNumber(value.localCount),
    cloudCount:
      typeof value.cloudCount === "number" && Number.isFinite(value.cloudCount)
        ? Math.max(value.cloudCount, 0)
        : null,
  };
}

function normalizeMigrationMapEntry(value: unknown): MigrationMapEntry | null {
  if (!isObject(value)) {
    return null;
  }

  const moduleId = value.module;

  if (
    typeof moduleId !== "string" ||
    !SYNC_MODULE_REGISTRY.some((entry) => entry.module === moduleId) ||
    typeof value.localId !== "string" ||
    typeof value.cloudId !== "string" ||
    typeof value.migratedAt !== "string"
  ) {
    return null;
  }

  return {
    module: moduleId as AtlasSyncModule,
    localId: value.localId,
    cloudId: value.cloudId,
    migratedAt: value.migratedAt,
    lastSyncedAt: asNullableString(value.lastSyncedAt),
  };
}

function createDefaultSyncState(): AtlasSyncState {
  const modules = Object.fromEntries(
    SYNC_MODULE_REGISTRY.map((entry) => [
      entry.module,
      createDefaultModuleState(entry.module, entry.sensitivity),
    ]),
  ) as Record<AtlasSyncModule, ModuleSyncState>;

  return {
    workspaceMode: "local_only",
    modules,
    lastSyncedAt: null,
    lastError: null,
    migrationCompletedAt: null,
    cloudWorkspaceId: null,
    recordCounts: {},
    migrationMap: [],
    updatedAt: null,
  };
}

const DEFAULT_SYNC_STATE = createDefaultSyncState();

export function getDefaultSyncState(): AtlasSyncState {
  return DEFAULT_SYNC_STATE;
}

export function normalizeSyncState(value: unknown): AtlasSyncState {
  const fallback = getDefaultSyncState();

  if (!isObject(value)) {
    return fallback;
  }

  const rawModules = isObject(value.modules) ? value.modules : {};
  const modules = Object.fromEntries(
    SYNC_MODULE_REGISTRY.map((entry) => [
      entry.module,
      normalizeModuleState(
        rawModules[entry.module],
        fallback.modules[entry.module],
      ),
    ]),
  ) as Record<AtlasSyncModule, ModuleSyncState>;

  const rawRecordCounts = isObject(value.recordCounts) ? value.recordCounts : {};
  const recordCounts = Object.fromEntries(
    SYNC_MODULE_REGISTRY.map((entry) => {
      const normalized = normalizeRecordCount(rawRecordCounts[entry.module]);
      return normalized ? [entry.module, normalized] : null;
    }).filter((entry): entry is [AtlasSyncModule, ModuleRecordCount] =>
      Boolean(entry),
    ),
  ) as Partial<Record<AtlasSyncModule, ModuleRecordCount>>;

  const migrationMap = Array.isArray(value.migrationMap)
    ? value.migrationMap
        .map(normalizeMigrationMapEntry)
        .filter((entry): entry is MigrationMapEntry => Boolean(entry))
    : [];

  return {
    workspaceMode: isWorkspaceSyncMode(value.workspaceMode)
      ? value.workspaceMode
      : fallback.workspaceMode,
    modules,
    lastSyncedAt: asNullableString(value.lastSyncedAt),
    lastError: asNullableString(value.lastError),
    migrationCompletedAt: asNullableString(value.migrationCompletedAt),
    cloudWorkspaceId: asNullableString(value.cloudWorkspaceId),
    recordCounts,
    migrationMap,
    updatedAt: asNullableString(value.updatedAt),
  };
}

export function readSyncState(): AtlasSyncState {
  if (!canUseStorage()) {
    return getDefaultSyncState();
  }

  try {
    const raw = window.localStorage.getItem(SYNC_STATE_STORAGE_KEY);

    if (!raw) {
      return getDefaultSyncState();
    }

    return normalizeSyncState(JSON.parse(raw));
  } catch {
    return getDefaultSyncState();
  }
}

export function writeSyncState(state: AtlasSyncState) {
  if (!canUseStorage()) {
    return false;
  }

  try {
    const normalized = normalizeSyncState({
      ...state,
      updatedAt: new Date().toISOString(),
    });

    window.localStorage.setItem(
      SYNC_STATE_STORAGE_KEY,
      JSON.stringify(normalized),
    );
    notifySyncState();

    return true;
  } catch {
    return false;
  }
}

export function updateSyncState(
  updater: (current: AtlasSyncState) => AtlasSyncState,
) {
  return writeSyncState(updater(readSyncState()));
}

export function resetSyncState() {
  if (!canUseStorage()) {
    return false;
  }

  try {
    window.localStorage.removeItem(SYNC_STATE_STORAGE_KEY);
    notifySyncState();

    return true;
  } catch {
    return false;
  }
}

export function subscribeToSyncState(listener: SyncStateListener) {
  listeners.add(listener);

  if (!canUseStorage()) {
    return () => {
      listeners.delete(listener);
    };
  }

  function handleStorage(event: StorageEvent) {
    if (event.key === SYNC_STATE_STORAGE_KEY) {
      listener();
    }
  }

  window.addEventListener("storage", handleStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

export function useSyncState() {
  return useSyncExternalStore(
    subscribeToSyncState,
    readSyncState,
    getDefaultSyncState,
  );
}
