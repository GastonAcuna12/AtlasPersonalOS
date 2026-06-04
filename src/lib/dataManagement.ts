"use client";

import {
  ATLAS_STORAGE_KEYS,
  ATLAS_STORAGE_KEY_VALUES,
  clearAtlasStorage,
  migrateAtlasStorage,
  readFromStorage,
  writeToStorage,
  type AtlasStorageDomain,
  type AtlasStorageKey,
} from "@/lib/storage";
import { DEFAULT_APP_SETTINGS, DEFAULT_FINANCE_SETTINGS } from "@/lib/settings";
import type {
  AtlasSettings,
  FinanceSettings,
  XPState,
  SavingsState,
  Currency,
  DayMode,
} from "@/types/atlas";

export { ATLAS_STORAGE_KEYS, ATLAS_STORAGE_KEY_VALUES };
export type { AtlasStorageDomain, AtlasStorageKey };

type AtlasData = {
  transactions: unknown[];
  plannedExpenses: unknown[];
  gymLogs: unknown[];
  tasks: unknown[];
  subjects: unknown[];
  studySessions: unknown[];
  notes: unknown[];
  goals: unknown[];
  weeklyReviews: unknown[];
  xp: Partial<XPState>;
  appSettings: Partial<AtlasSettings>;
  financeSettings: Partial<FinanceSettings>;
  savings: Partial<SavingsState>;
  dailyPlans: unknown[];
  clients: unknown[];
  workItems: unknown[];
  dailyWraps: unknown[];
  academicTasks?: unknown[];
  xpEvents?: unknown[];
  financeBudgets?: unknown[];
  financeAccounts?: unknown[];
  focusTask?: unknown;
};

export type AtlasBackup = {
  source: "atlas";
  version: 1;
  exportedAt: string;
  data: Partial<AtlasData>;
};

type LegacyAtlasBackup = {
  app: "Atlas";
  version: 1;
  exportedAt: string;
  data: Partial<Record<string, unknown>>;
};

const EMPTY_ARRAY: unknown[] = [];
const EMPTY_XP: Partial<XPState> = {};
const DEFAULT_SAVINGS: SavingsState = {
  currentAmount: 0,
  currency: "PYG",
  updatedAt: "",
};

const STORAGE_DOMAIN_FALLBACKS = {
  transactions: EMPTY_ARRAY,
  plannedExpenses: EMPTY_ARRAY,
  savings: DEFAULT_SAVINGS,
  financeSettings: DEFAULT_FINANCE_SETTINGS,
  financeBudgets: EMPTY_ARRAY,
  financeAccounts: EMPTY_ARRAY,
  gymLogs: EMPTY_ARRAY,
  tasks: EMPTY_ARRAY,
  dailyPlans: EMPTY_ARRAY,
  dailyWraps: EMPTY_ARRAY,
  subjects: EMPTY_ARRAY,
  academicTasks: EMPTY_ARRAY,
  studySessions: EMPTY_ARRAY,
  notes: EMPTY_ARRAY,
  goals: EMPTY_ARRAY,
  weeklyReviews: EMPTY_ARRAY,
  clients: EMPTY_ARRAY,
  workItems: EMPTY_ARRAY,
  xp: EMPTY_XP,
  xpEvents: EMPTY_ARRAY,
  appSettings: DEFAULT_APP_SETTINGS,
  focusTask: null,
} satisfies Record<AtlasStorageDomain, unknown>;

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isKnownStorageDomain(value: string): value is AtlasStorageDomain {
  return value in ATLAS_STORAGE_KEYS;
}

function isKnownStorageKey(value: string): value is AtlasStorageKey {
  return ATLAS_STORAGE_KEY_VALUES.includes(value as AtlasStorageKey);
}

function getDomainFromStorageKey(key: AtlasStorageKey) {
  return Object.entries(ATLAS_STORAGE_KEYS).find(
    ([, storageKey]) => storageKey === key,
  )?.[0] as AtlasStorageDomain | undefined;
}

function normalizeImportedData(data: Record<string, unknown>) {
  const normalized: Partial<AtlasData> = {};

  // For backward compatibility, if the legacy settings key exists:
  if (data.settings && isObject(data.settings)) {
    const legacy = data.settings as Record<string, unknown>;
    normalized.appSettings = {
      dayMode: (legacy.dayMode as DayMode) ?? "Normal Day",
      gymWeeklyTarget: (legacy.gymWeeklyTarget as number) ?? 4,
    };
    normalized.financeSettings = {
      baseCurrency: (legacy.baseCurrency as Currency) ?? "PYG",
      exchangeRateUsdToPyg: (legacy.exchangeRateUsdToPyg as number) ?? 6150,
      exchangeRateUpdatedAt: (legacy.exchangeRateUpdatedAt as string) ?? new Date().toISOString().slice(0, 10),
      exchangeRateSource: (legacy.exchangeRateSource as "manual" | "live") ?? "manual",
      usdToPygRate: (legacy.usdToPygRate as number) ?? (legacy.exchangeRateUsdToPyg as number) ?? 6150,
    };
  }

  Object.entries(data).forEach(([key, value]) => {
    if (isKnownStorageDomain(key)) {
      normalized[key] = value as never;
      return;
    }

    if (isKnownStorageKey(key)) {
      const domain = getDomainFromStorageKey(key);
      if (domain) {
        normalized[domain] = value as never;
      }
    }
  });

  return normalized;
}

export function exportAtlasData(): AtlasBackup {
  migrateAtlasStorage();

  const data = Object.fromEntries(
    Object.entries(ATLAS_STORAGE_KEYS).map(([domain, key]) => [
      domain,
      readFromStorage(
        key,
        STORAGE_DOMAIN_FALLBACKS[domain as AtlasStorageDomain],
      ),
    ]),
  ) as AtlasData;

  return {
    source: "atlas",
    version: 1,
    exportedAt: new Date().toISOString(),
    data,
  };
}

export function createAtlasBackup() {
  return exportAtlasData();
}

export function downloadAtlasBackup() {
  const backup = exportAtlasData();
  const date = new Date().toISOString().slice(0, 10);
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `atlas-backup-${date}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function validateAtlasBackup(value: unknown): value is AtlasBackup {
  if (!isObject(value)) {
    return false;
  }

  // Support source === "atlas" or legacy backups
  if (value.source === "atlas" && value.version === 1 && isObject(value.data)) {
    return Object.keys(value.data).every(
      (key) => isKnownStorageDomain(key) || isKnownStorageKey(key) || key === "settings",
    );
  }

  if (value.app === "Atlas" && value.version === 1 && isObject(value.data)) {
    return Object.keys(value.data).every(
      (key) => isKnownStorageKey(key) || key === "atlas.settings",
    );
  }

  return false;
}

export function importAtlasData(backup: AtlasBackup | LegacyAtlasBackup) {
  if (!validateAtlasBackup(backup)) {
    return false;
  }

  const importedData = normalizeImportedData(backup.data);

  Object.entries(importedData).forEach(([domain, value]) => {
    if (!isKnownStorageDomain(domain)) {
      return;
    }

    writeToStorage(ATLAS_STORAGE_KEYS[domain], value);
  });

  return true;
}

export function importAtlasBackup(backup: AtlasBackup | LegacyAtlasBackup) {
  return importAtlasData(backup);
}

export function clearAtlasLocalData() {
  clearAtlasStorage();
}
