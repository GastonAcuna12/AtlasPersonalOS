"use client";

import { useSyncExternalStore } from "react";

export const ATLAS_STORAGE_KEYS = {
  transactions: "atlas.transactions",
  savings: "atlas.savings",
  financeSettings: "atlas.financeSettings",
  gymLogs: "atlas.gymLogs",
  tasks: "atlas.tasks",
  dailyPlans: "atlas.dailyPlans",
  dailyWraps: "atlas.dailyWraps",
  subjects: "atlas.subjects",
  academicTasks: "atlas.academicTasks",
  studySessions: "atlas.studySessions",
  notes: "atlas.notes",
  goals: "atlas.goals",
  weeklyReviews: "atlas.weeklyReviews",
  clients: "atlas.clients",
  workItems: "atlas.workItems",
  xp: "atlas.xp",
  xpEvents: "atlas.xpEvents",
  appSettings: "atlas.appSettings",
} as const;

export type AtlasStorageDomain = keyof typeof ATLAS_STORAGE_KEYS;
export type AtlasStorageKey =
  (typeof ATLAS_STORAGE_KEYS)[AtlasStorageDomain];

export const ATLAS_STORAGE_KEY_VALUES = Object.values(
  ATLAS_STORAGE_KEYS,
) as AtlasStorageKey[];

type StorageListener = () => void;
type Normalizer<T> = (value: unknown) => T;

const listenersByKey = new Map<AtlasStorageKey, Set<StorageListener>>();
const cache = new Map<
  AtlasStorageKey,
  { raw: string; value: unknown; normalize?: Normalizer<unknown> }
>();
let migrationAttempted = false;

const KEY_MIGRATIONS: { from: string; to: AtlasStorageKey }[] = [
  { from: "atlas.financeTransactions", to: ATLAS_STORAGE_KEYS.transactions },
  { from: "atlas.workoutLogs", to: ATLAS_STORAGE_KEYS.gymLogs },
  { from: "atlas.academicSubjects", to: ATLAS_STORAGE_KEYS.subjects },
  { from: "atlas.transactions", to: ATLAS_STORAGE_KEYS.transactions },
  { from: "atlas.gymLogs", to: ATLAS_STORAGE_KEYS.gymLogs },
  { from: "atlas.subjects", to: ATLAS_STORAGE_KEYS.subjects },
];

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

function listenersFor(key: AtlasStorageKey) {
  const existing = listenersByKey.get(key);

  if (existing) {
    return existing;
  }

  const listeners = new Set<StorageListener>();
  listenersByKey.set(key, listeners);
  return listeners;
}

function notifyStorageKey(key: AtlasStorageKey) {
  listenersFor(key).forEach((listener) => listener());
}

function parseStoredValue<T>(
  raw: string | null,
  fallback: T,
  normalize?: Normalizer<T>,
) {
  if (!raw) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw);
    return normalize ? normalize(parsed) : (parsed as T);
  } catch {
    return fallback;
  }
}

export function readFromStorage<T>(
  key: AtlasStorageKey,
  fallback: T,
  normalize?: Normalizer<T>,
) {
  if (!canUseStorage()) {
    return fallback;
  }

  try {
    if (!migrationAttempted) {
      migrationAttempted = true;
      migrateAtlasStorage();
    }

    const raw = window.localStorage.getItem(key) ?? "";
    const cached = cache.get(key);

    if (cached && cached.raw === raw && cached.normalize === normalize) {
      return cached.value as T;
    }

    const value = parseStoredValue(raw, fallback, normalize);
    cache.set(key, { raw, value, normalize: normalize as Normalizer<unknown> });

    return value;
  } catch {
    return fallback;
  }
}

export function writeToStorage<T>(key: AtlasStorageKey, value: T) {
  if (!canUseStorage()) {
    return false;
  }

  try {
    const raw = JSON.stringify(value);
    window.localStorage.setItem(key, raw);
    cache.set(key, { raw, value });
    notifyStorageKey(key);

    return true;
  } catch {
    return false;
  }
}

export function removeFromStorage(key: AtlasStorageKey) {
  if (!canUseStorage()) {
    return false;
  }

  try {
    window.localStorage.removeItem(key);
    cache.delete(key);
    notifyStorageKey(key);

    return true;
  } catch {
    return false;
  }
}

export function subscribeToStorage(
  key: AtlasStorageKey,
  listener: StorageListener,
) {
  const listeners = listenersFor(key);
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function useStoredValue<T>(
  key: AtlasStorageKey,
  fallback: T,
  normalize?: Normalizer<T>,
) {
  return useSyncExternalStore(
    (listener) => subscribeToStorage(key, listener),
    () => readFromStorage(key, fallback, normalize),
    () => fallback,
  );
}

export function clearAtlasStorage() {
  ATLAS_STORAGE_KEY_VALUES.forEach(removeFromStorage);
}

export function migrateAtlasStorage() {
  if (!canUseStorage()) {
    return;
  }

  KEY_MIGRATIONS.forEach(({ from, to }) => {
    try {
      const oldValue = window.localStorage.getItem(from);
      const currentValue = window.localStorage.getItem(to);

      if (oldValue && !currentValue) {
        window.localStorage.setItem(to, oldValue);
        cache.delete(to);
        notifyStorageKey(to);
      }
    } catch {
      // Storage can fail in private or restricted browser contexts.
    }
  });

  // Settings Split Migration
  try {
    const legacySettingsStr = window.localStorage.getItem("atlas.settings");
    if (legacySettingsStr) {
      const appSettingsExists = window.localStorage.getItem(ATLAS_STORAGE_KEYS.appSettings);
      const financeSettingsExists = window.localStorage.getItem(ATLAS_STORAGE_KEYS.financeSettings);

      const parsed = JSON.parse(legacySettingsStr);

      if (parsed && typeof parsed === "object") {
        // App Settings Split
        if (!appSettingsExists) {
          const appSettings = {
            dayMode: parsed.dayMode ?? "Normal Day",
            language: parsed.language ?? "en",
            gymWeeklyTarget: parsed.gymWeeklyTarget ?? 4,
          };
          window.localStorage.setItem(ATLAS_STORAGE_KEYS.appSettings, JSON.stringify(appSettings));
          cache.delete(ATLAS_STORAGE_KEYS.appSettings);
          notifyStorageKey(ATLAS_STORAGE_KEYS.appSettings);
        }

        // Finance Settings Split
        if (!financeSettingsExists) {
          const financeSettings = {
            baseCurrency: parsed.baseCurrency ?? "PYG",
            exchangeRateUsdToPyg: parsed.exchangeRateUsdToPyg ?? 6150,
            exchangeRateUpdatedAt: parsed.exchangeRateUpdatedAt ?? new Date().toISOString().slice(0, 10),
            exchangeRateSource: parsed.exchangeRateSource ?? "manual",
            usdToPygRate: parsed.usdToPygRate ?? parsed.exchangeRateUsdToPyg ?? 6150,
          };
          window.localStorage.setItem(ATLAS_STORAGE_KEYS.financeSettings, JSON.stringify(financeSettings));
          cache.delete(ATLAS_STORAGE_KEYS.financeSettings);
          notifyStorageKey(ATLAS_STORAGE_KEYS.financeSettings);
        }
      }
    }
  } catch {
    // Ignore split migration parse failures
  }
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
