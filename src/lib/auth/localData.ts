"use client";

import { useSyncExternalStore } from "react";
import {
  ATLAS_STORAGE_KEY_VALUES,
  subscribeToStorage,
} from "@/lib/storage";

export type LocalAtlasDataSummary = {
  hasLocalData: boolean;
  populatedKeyCount: number;
  approximateRecordCount: number;
};

const EMPTY_LOCAL_DATA_SUMMARY: LocalAtlasDataSummary = {
  hasLocalData: false,
  populatedKeyCount: 0,
  approximateRecordCount: 0,
};

let cachedStorageSignature = "";
let cachedLocalDataSummary = EMPTY_LOCAL_DATA_SUMMARY;

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

function countStoredValue(rawValue: string | null) {
  if (!rawValue) {
    return 0;
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;

    if (Array.isArray(parsed)) {
      return parsed.length;
    }

    if (parsed && typeof parsed === "object") {
      return Object.keys(parsed).length > 0 ? 1 : 0;
    }

    return parsed ? 1 : 0;
  } catch {
    return rawValue.trim().length > 0 ? 1 : 0;
  }
}

export function getLocalAtlasDataSummary(): LocalAtlasDataSummary {
  if (!canUseLocalStorage()) {
    return EMPTY_LOCAL_DATA_SUMMARY;
  }

  const storageSignature = ATLAS_STORAGE_KEY_VALUES.map(
    (key) => window.localStorage.getItem(key) ?? "",
  ).join("\u001f");

  if (storageSignature === cachedStorageSignature) {
    return cachedLocalDataSummary;
  }

  cachedStorageSignature = storageSignature;
  cachedLocalDataSummary = ATLAS_STORAGE_KEY_VALUES.reduce<LocalAtlasDataSummary>(
    (summary, key) => {
      const recordCount = countStoredValue(window.localStorage.getItem(key));

      if (recordCount === 0) {
        return summary;
      }

      return {
        hasLocalData: true,
        populatedKeyCount: summary.populatedKeyCount + 1,
        approximateRecordCount:
          summary.approximateRecordCount + recordCount,
      };
    },
    EMPTY_LOCAL_DATA_SUMMARY,
  );

  return cachedLocalDataSummary;
}

function subscribeToLocalAtlasData(onStoreChange: () => void) {
  const unsubscribeAll = ATLAS_STORAGE_KEY_VALUES.map((key) =>
    subscribeToStorage(key, onStoreChange),
  );

  return () => {
    unsubscribeAll.forEach((unsubscribe) => unsubscribe());
  };
}

export function useLocalAtlasDataSummary() {
  return useSyncExternalStore(
    subscribeToLocalAtlasData,
    getLocalAtlasDataSummary,
    () => EMPTY_LOCAL_DATA_SUMMARY,
  );
}
