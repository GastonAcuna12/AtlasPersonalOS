"use client";

import { useSyncExternalStore } from "react";
import {
  ATLAS_STORAGE_KEYS,
  ATLAS_STORAGE_KEY_VALUES,
  readFromStorage,
  subscribeToStorage,
  type AtlasStorageDomain,
} from "@/lib/storage";
import { SYNC_MODULE_REGISTRY } from "@/lib/sync/registry";
import type { AtlasTask, FinanceSettings, SavingsState } from "@/types/atlas";
import type { AtlasSyncModule } from "@/types/sync";

export type ModuleMigrationPreview = {
  module: AtlasSyncModule;
  localCount: number;
  cloudCount: number | null;
  parts: Record<string, number>;
  excludedLocalOnly?: Record<string, number>;
};

export type MigrationPreview = {
  modules: ModuleMigrationPreview[];
  totalLocalCount: number;
  generatedAt: string | null;
};

const EMPTY_ARRAY: unknown[] = [];
const EMPTY_FINANCE_SETTINGS: Partial<FinanceSettings> = {};
const EMPTY_SAVINGS: Partial<SavingsState> = {};
let cachedStorageSignature: string | null = null;
let cachedMigrationPreview: MigrationPreview | null = null;

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readArrayDomain<T>(domain: AtlasStorageDomain) {
  const value = readFromStorage<unknown[]>(
    ATLAS_STORAGE_KEYS[domain],
    EMPTY_ARRAY,
  );

  return Array.isArray(value) ? (value as T[]) : [];
}

function countObjectDomain(domain: AtlasStorageDomain) {
  const fallback =
    domain === "financeSettings" ? EMPTY_FINANCE_SETTINGS : EMPTY_SAVINGS;
  const value = readFromStorage(ATLAS_STORAGE_KEYS[domain], fallback);

  return isObject(value) && Object.keys(value).length > 0 ? 1 : 0;
}

function getAcademicTaskCount(tasks: AtlasTask[]) {
  return tasks.filter(
    (task) =>
      isObject(task) &&
      (task.area === "Academic" ||
        Boolean(task.subjectId) ||
        Boolean(task.academicType)),
  ).length;
}

function createEmptyMigrationPreview(): MigrationPreview {
  return {
    modules: SYNC_MODULE_REGISTRY.map((entry) => ({
      module: entry.module,
      localCount: 0,
      cloudCount: null,
      parts: {},
    })),
    totalLocalCount: 0,
    generatedAt: null,
  };
}

const EMPTY_MIGRATION_PREVIEW = createEmptyMigrationPreview();

function buildEmptyMigrationPreview(): MigrationPreview {
  return EMPTY_MIGRATION_PREVIEW;
}

function getStorageSignature() {
  if (typeof window === "undefined") {
    return "server";
  }

  try {
    return ATLAS_STORAGE_KEY_VALUES.map((key) => {
      const raw = window.localStorage.getItem(key) ?? "";
      return `${key}:${raw}`;
    }).join("|");
  } catch {
    return "storage-unavailable";
  }
}

export function getLocalModuleRecordCounts() {
  const preview = buildMigrationPreview();

  return Object.fromEntries(
    preview.modules.map((entry) => [entry.module, entry.localCount]),
  ) as Record<AtlasSyncModule, number>;
}

export function getModuleLocalCount(module: AtlasSyncModule) {
  return getLocalModuleRecordCounts()[module] ?? 0;
}

function computeMigrationPreview(): MigrationPreview {
  const notes = readArrayDomain("notes").length;
  const tasks = readArrayDomain<AtlasTask>("tasks");
  const goals = readArrayDomain("goals").length;
  const subjects = readArrayDomain("subjects").length;
  const academicTasks = getAcademicTaskCount(tasks);
  const studySessions = readArrayDomain("studySessions").length;
  const gymLogs = readArrayDomain("gymLogs").length;
  const clients = readArrayDomain("clients").length;
  const workItems = readArrayDomain("workItems").length;
  const transactions = readArrayDomain("transactions").length;
  const plannedExpenses = readArrayDomain("plannedExpenses").length;
  const savings = countObjectDomain("savings");
  const financeSettings = countObjectDomain("financeSettings");

  const counts: Record<AtlasSyncModule, ModuleMigrationPreview> = {
    notes: {
      module: "notes",
      localCount: notes,
      cloudCount: null,
      parts: { notes },
    },
    tasks: {
      module: "tasks",
      localCount: tasks.length,
      cloudCount: null,
      parts: { tasks: tasks.length },
    },
    goals: {
      module: "goals",
      localCount: goals,
      cloudCount: null,
      parts: { goals },
      excludedLocalOnly: { savings },
    },
    academics: {
      module: "academics",
      localCount: subjects + academicTasks + studySessions,
      cloudCount: null,
      parts: {
        subjects,
        academicTasks,
        studySessions,
      },
    },
    gym: {
      module: "gym",
      localCount: gymLogs,
      cloudCount: null,
      parts: { gymLogs },
    },
    work: {
      module: "work",
      localCount: clients + workItems,
      cloudCount: null,
      parts: { clients, workItems },
    },
    finances: {
      module: "finances",
      localCount: transactions,
      cloudCount: null,
      parts: { transactions },
      excludedLocalOnly: {
        plannedExpenses,
        savings,
        financeSettings,
      },
    },
  };

  const modules = SYNC_MODULE_REGISTRY.map((entry) => counts[entry.module]);

  return {
    modules,
    totalLocalCount: modules.reduce(
      (total, entry) => total + entry.localCount,
      0,
    ),
    generatedAt: null,
  };
}

export function buildMigrationPreview(): MigrationPreview {
  const signature = getStorageSignature();

  if (cachedMigrationPreview && cachedStorageSignature === signature) {
    return cachedMigrationPreview;
  }

  cachedStorageSignature = signature;
  cachedMigrationPreview =
    signature === "server" || signature === "storage-unavailable"
      ? EMPTY_MIGRATION_PREVIEW
      : computeMigrationPreview();

  return cachedMigrationPreview;
}

function subscribeToMigrationPreview(listener: () => void) {
  const unsubscribeAll = ATLAS_STORAGE_KEY_VALUES.map((key) =>
    subscribeToStorage(key, listener),
  );

  return () => {
    unsubscribeAll.forEach((unsubscribe) => unsubscribe());
  };
}

export function useMigrationPreview() {
  return useSyncExternalStore(
    subscribeToMigrationPreview,
    buildMigrationPreview,
    buildEmptyMigrationPreview,
  );
}
