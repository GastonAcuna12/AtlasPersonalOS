"use client";

import { useMemo } from "react";
import {
  ATLAS_STORAGE_KEYS,
  readFromStorage,
  useStoredValue,
  writeToStorage,
} from "@/lib/storage";
import { type Language } from "@/lib/i18n";
import {
  DEFAULT_ENABLED_MODULES,
  normalizeEnabledModules,
} from "@/lib/modules";
import type { AtlasSettings, FinanceSettings, Currency, DayMode, AtlasModule, WorkspacePreset } from "@/types/atlas";

export type { AtlasSettings, DayMode } from "@/types/atlas";
export type { Language } from "@/lib/i18n";

export const DAY_MODES: DayMode[] = [
  "Normal Day",
  "University Day",
  "Work Sprint Day",
  "Low Energy Day",
  "Recovery Day",
];

export const DEFAULT_APP_SETTINGS: AtlasSettings = {
  dayMode: "Normal Day",
  language: "en",
  gymWeeklyTarget: 4,
  enabledModules: DEFAULT_ENABLED_MODULES,
  onboardingCompleted: false,
};

export const DEFAULT_FINANCE_SETTINGS: FinanceSettings = {
  baseCurrency: "PYG",
  exchangeRateUsdToPyg: 6150,
  exchangeRateUpdatedAt: new Date().toISOString().slice(0, 10),
  exchangeRateSource: "manual",
  usdToPygRate: 6150,
  availableMoneyMode: "legacy",
};

function isDayMode(value: unknown): value is DayMode {
  return typeof value === "string" && DAY_MODES.includes(value as DayMode);
}

function isCurrency(value: unknown): value is Currency {
  return value === "PYG" || value === "USD";
}

export function normalizeAppSettings(value: unknown): AtlasSettings {
  const candidate =
    value && typeof value === "object" ? (value as Partial<AtlasSettings>) : {};

  const hasExistingSettings = value !== null && typeof value === "object";

  const isPresetValid = (preset: unknown): preset is WorkspacePreset => {
    return (
      preset === "student" ||
      preset === "freelancer" ||
      preset === "personal_finance" ||
      preset === "full" ||
      preset === "custom"
    );
  };

  return {
    dayMode: isDayMode(candidate.dayMode)
      ? candidate.dayMode
      : DEFAULT_APP_SETTINGS.dayMode,
    language: (() => {
      const lang = candidate.language;
      if (typeof lang !== "string") return DEFAULT_APP_SETTINGS.language;
      const l = lang.toLowerCase();
      if (l.startsWith("es")) return "es";
      if (l.startsWith("en")) return "en";
      return DEFAULT_APP_SETTINGS.language;
    })(),
    gymWeeklyTarget:
      typeof candidate.gymWeeklyTarget === "number" && candidate.gymWeeklyTarget > 0
        ? candidate.gymWeeklyTarget
        : DEFAULT_APP_SETTINGS.gymWeeklyTarget,
    enabledModules: normalizeEnabledModules(candidate.enabledModules),
    onboardingCompleted: candidate.onboardingCompleted !== undefined
      ? !!candidate.onboardingCompleted
      : hasExistingSettings,
    workspacePreset: isPresetValid(candidate.workspacePreset)
      ? candidate.workspacePreset
      : undefined,
  };
}

export function normalizeFinanceSettings(value: unknown): FinanceSettings {
  const candidate =
    value && typeof value === "object" ? (value as Partial<FinanceSettings>) : {};

  const legacyRate =
    typeof candidate.exchangeRateUsdToPyg === "number" && candidate.exchangeRateUsdToPyg > 0
      ? candidate.exchangeRateUsdToPyg
      : 6150;

  const usdRate =
    typeof candidate.usdToPygRate === "number" && candidate.usdToPygRate > 0
      ? candidate.usdToPygRate
      : legacyRate === 7300 ? 6150 : legacyRate;

  return {
    baseCurrency: isCurrency(candidate.baseCurrency)
      ? candidate.baseCurrency
      : DEFAULT_FINANCE_SETTINGS.baseCurrency,
    exchangeRateUsdToPyg: usdRate,
    usdToPygRate: usdRate,
    exchangeRateUpdatedAt:
      typeof candidate.exchangeRateUpdatedAt === "string"
        ? candidate.exchangeRateUpdatedAt
        : DEFAULT_FINANCE_SETTINGS.exchangeRateUpdatedAt,
    exchangeRateSource:
      candidate.exchangeRateSource === "live"
        ? "live"
        : "manual",
    defaultFinanceAccountId:
      typeof candidate.defaultFinanceAccountId === "string" && candidate.defaultFinanceAccountId.trim()
        ? candidate.defaultFinanceAccountId.trim()
        : undefined,
    availableMoneyMode:
      candidate.availableMoneyMode === "account_aware"
        ? "account_aware"
        : "legacy",
  };
}

export function useFinanceSettings() {
  const settings = useStoredValue(
    ATLAS_STORAGE_KEYS.financeSettings,
    DEFAULT_FINANCE_SETTINGS,
    normalizeFinanceSettings,
  );

  function updateFinanceSettings(changes: Partial<FinanceSettings>) {
    const current = readFromStorage(
      ATLAS_STORAGE_KEYS.financeSettings,
      DEFAULT_FINANCE_SETTINGS,
      normalizeFinanceSettings,
    );
    const next = normalizeFinanceSettings({ ...current, ...changes });
    writeToStorage(ATLAS_STORAGE_KEYS.financeSettings, next);
  }

  function setBaseCurrency(baseCurrency: Currency) {
    updateFinanceSettings({ baseCurrency });
  }

  function setExchangeRate(usdToPygRate: number) {
    updateFinanceSettings({
      exchangeRateUsdToPyg: usdToPygRate,
      usdToPygRate,
      exchangeRateUpdatedAt: new Date().toISOString().slice(0, 10),
      exchangeRateSource: "manual",
    });
  }

  return {
    settings,
    updateSettings: updateFinanceSettings,
    setBaseCurrency,
    setExchangeRate,
  };
}

export function useAtlasSettings() {
  const appSettings = useStoredValue(
    ATLAS_STORAGE_KEYS.appSettings,
    DEFAULT_APP_SETTINGS,
    normalizeAppSettings,
  );
  const financeSettings = useStoredValue(
    ATLAS_STORAGE_KEYS.financeSettings,
    DEFAULT_FINANCE_SETTINGS,
    normalizeFinanceSettings,
  );

  const combinedSettings = useMemo(() => {
    return {
      ...appSettings,
      ...financeSettings,
    };
  }, [appSettings, financeSettings]);

  function updateSettings(changes: Partial<AtlasSettings & FinanceSettings>) {
    // 1. App settings changes
    const appChanges: Partial<AtlasSettings> = {};
    if (changes.dayMode !== undefined) appChanges.dayMode = changes.dayMode;
    if (changes.language !== undefined) appChanges.language = changes.language;
    if (changes.gymWeeklyTarget !== undefined) appChanges.gymWeeklyTarget = changes.gymWeeklyTarget;
    if (changes.enabledModules !== undefined) {
      appChanges.enabledModules = normalizeEnabledModules(changes.enabledModules);
    }
    if (changes.onboardingCompleted !== undefined) appChanges.onboardingCompleted = changes.onboardingCompleted;
    if (changes.workspacePreset !== undefined) appChanges.workspacePreset = changes.workspacePreset;

    if (Object.keys(appChanges).length > 0) {
      const current = readFromStorage(
        ATLAS_STORAGE_KEYS.appSettings,
        DEFAULT_APP_SETTINGS,
        normalizeAppSettings,
      );
      writeToStorage(ATLAS_STORAGE_KEYS.appSettings, normalizeAppSettings({ ...current, ...appChanges }));
    }

    // 2. Finance settings changes
    const financeChanges: Partial<FinanceSettings> = {};
    if (changes.baseCurrency !== undefined) financeChanges.baseCurrency = changes.baseCurrency;
    if (changes.exchangeRateUsdToPyg !== undefined) financeChanges.exchangeRateUsdToPyg = changes.exchangeRateUsdToPyg;
    if (changes.usdToPygRate !== undefined) financeChanges.usdToPygRate = changes.usdToPygRate;
    if (changes.exchangeRateUpdatedAt !== undefined) financeChanges.exchangeRateUpdatedAt = changes.exchangeRateUpdatedAt;
    if (changes.exchangeRateSource !== undefined) financeChanges.exchangeRateSource = changes.exchangeRateSource;
    if (changes.defaultFinanceAccountId !== undefined) {
      financeChanges.defaultFinanceAccountId = changes.defaultFinanceAccountId;
    }
    if (changes.availableMoneyMode !== undefined) {
      financeChanges.availableMoneyMode = changes.availableMoneyMode;
    }

    if (Object.keys(financeChanges).length > 0) {
      const current = readFromStorage(
        ATLAS_STORAGE_KEYS.financeSettings,
        DEFAULT_FINANCE_SETTINGS,
        normalizeFinanceSettings,
      );
      writeToStorage(
        ATLAS_STORAGE_KEYS.financeSettings,
        normalizeFinanceSettings({ ...current, ...financeChanges }),
      );
    }
  }

  function setDayMode(dayMode: DayMode) {
    updateSettings({ dayMode });
  }

  function setLanguage(language: Language) {
    updateSettings({ language });
  }

  function setBaseCurrency(baseCurrency: Currency) {
    updateSettings({ baseCurrency });
  }

  function setExchangeRate(usdToPygRate: number) {
    updateSettings({
      exchangeRateUsdToPyg: usdToPygRate,
      usdToPygRate,
      exchangeRateUpdatedAt: new Date().toISOString().slice(0, 10),
      exchangeRateSource: "manual",
    });
  }

  function setGymWeeklyTarget(gymWeeklyTarget: number) {
    updateSettings({ gymWeeklyTarget });
  }

  function setModuleEnabled(module: AtlasModule, enabled: boolean) {
    const current = readFromStorage(
      ATLAS_STORAGE_KEYS.appSettings,
      DEFAULT_APP_SETTINGS,
      normalizeAppSettings,
    );

    updateSettings({
      enabledModules: normalizeEnabledModules({
        ...current.enabledModules,
        [module]: enabled,
      }),
      workspacePreset: "custom",
    });
  }

  return {
    settings: combinedSettings,
    updateSettings,
    setDayMode,
    setLanguage,
    setBaseCurrency,
    setExchangeRate,
    setGymWeeklyTarget,
    setModuleEnabled,
  };
}
