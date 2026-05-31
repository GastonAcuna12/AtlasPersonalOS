"use client";

import { ATLAS_STORAGE_KEY_VALUES } from "@/lib/storage";

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

function hasMeaningfulStoredValue(rawValue: string | null) {
  if (!rawValue) {
    return false;
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;

    if (Array.isArray(parsed)) {
      return parsed.length > 0;
    }

    if (parsed && typeof parsed === "object") {
      return Object.keys(parsed).length > 0;
    }

    return Boolean(parsed);
  } catch {
    return rawValue.trim().length > 0;
  }
}

export function hasLocalAtlasData() {
  if (!canUseLocalStorage()) {
    return false;
  }

  return ATLAS_STORAGE_KEY_VALUES.some((key) =>
    hasMeaningfulStoredValue(window.localStorage.getItem(key)),
  );
}

export function getLocalAtlasDataKeys() {
  if (!canUseLocalStorage()) {
    return [];
  }

  return ATLAS_STORAGE_KEY_VALUES.filter((key) =>
    hasMeaningfulStoredValue(window.localStorage.getItem(key)),
  );
}
