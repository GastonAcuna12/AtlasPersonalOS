"use client";

import { useMemo } from "react";
import {
  ATLAS_STORAGE_KEYS,
  readFromStorage,
  useStoredValue,
  writeToStorage,
} from "@/lib/storage";
import type { XPAction, XPActivity, XPState } from "@/types/atlas";

export type { XPAction, XPActivity, XPState } from "@/types/atlas";

export const XP_RULES: Record<XPAction, { amount: number; label: string }> = {
  "finance-transaction": {
    amount: 10,
    label: "Added transaction",
  },
  "workout-log": {
    amount: 10,
    label: "Logged workout",
  },
  "task-completed": {
    amount: 10,
    label: "Completed task",
  },
  "note-created": {
    amount: 10,
    label: "Created note",
  },
  "academic-task-completed": {
    amount: 20,
    label: "Completed academic task",
  },
  "goal-updated": {
    amount: 25,
    label: "Updated goal",
  },
  "weekly-review-completed": {
    amount: 50,
    label: "Completed weekly review",
  },
  "daily-planning-completed": {
    amount: 25,
    label: "Completed daily planning",
  },
  "work-item-completed": {
    amount: 15,
    label: "Completed work item",
  },
  "study-session-logged": {
    amount: 10,
    label: "Logged study session",
  },
  "daily-wrap-completed": {
    amount: 20,
    label: "Completed daily wrap",
  },
};

const LEVELS = [
  { level: 1, title: "Initial Setup", nextLevelXP: 200 },
  { level: 2, title: "Data Collector", nextLevelXP: 500 },
  { level: 3, title: "Foundation Builder", nextLevelXP: 1000 },
  { level: 4, title: "Momentum Maker", nextLevelXP: 1800 },
  { level: 5, title: "Systems Thinker", nextLevelXP: 2800 },
  { level: 6, title: "Operator", nextLevelXP: 4000 },
  { level: 7, title: "Optimized", nextLevelXP: 5500 },
  { level: 8, title: "Architect", nextLevelXP: 7500 },
  { level: 9, title: "High Agency", nextLevelXP: 10000 },
  { level: 10, title: "Atlas Prime", nextLevelXP: 1000000 },
];

const INITIAL_XP_STATE: XPState = {
  currentXP: 0,
  activity: [],
};

function getLevelForXP(currentXP: number) {
  return (
    LEVELS.find((level) => currentXP < level.nextLevelXP) ??
    LEVELS[LEVELS.length - 1]
  );
}

/** Returns the XP threshold where the previous level started. */
function getPreviousLevelThreshold(level: number): number {
  const idx = LEVELS.findIndex((l) => l.level === level);
  if (idx <= 0) return 0;
  return LEVELS[idx - 1].nextLevelXP;
}

/**
 * Calculates weekly momentum as a percentage.
 * Counts unique days with XP activity in the last 7 days.
 * Target: at least 5 active days per week = 100%.
 */
export function getWeeklyMomentum(activities: XPActivity[]): number {
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);
  const cutoff = sevenDaysAgo.toISOString();

  const recentDays = new Set(
    activities
      .filter((a) => a.createdAt >= cutoff)
      .map((a) => a.createdAt.slice(0, 10)),
  );

  const TARGET_ACTIVE_DAYS = 5;
  return Math.min(Math.round((recentDays.size / TARGET_ACTIVE_DAYS) * 100), 100);
}

export function normalizeXPState(value: unknown): XPState {
  const parsed =
    value && typeof value === "object" ? (value as Partial<XPState>) : {};

  return {
    currentXP:
      typeof parsed.currentXP === "number"
        ? parsed.currentXP
        : INITIAL_XP_STATE.currentXP,
    activity: Array.isArray(parsed.activity)
      ? (parsed.activity as XPActivity[])
      : [],
  };
}

function readXP() {
  return readFromStorage(ATLAS_STORAGE_KEYS.xp, INITIAL_XP_STATE, normalizeXPState);
}

function saveXP(state: XPState) {
  writeToStorage(ATLAS_STORAGE_KEYS.xp, state);
}

type AwardXPOptions = {
  amount?: number;
  label?: string;
};

export function useXP() {
  const state = useStoredValue(
    ATLAS_STORAGE_KEYS.xp,
    INITIAL_XP_STATE,
    normalizeXPState,
  );

  const levelState = useMemo(() => {
    const level = getLevelForXP(state.currentXP);
    const isMaxLevel = level.level === 10;
    const prevThreshold = getPreviousLevelThreshold(level.level);
    const xpInLevel = state.currentXP - prevThreshold;
    const xpForLevel = level.nextLevelXP - prevThreshold;
    const progressPercentage = isMaxLevel ? 100 : Math.min(
      Math.round((xpInLevel / xpForLevel) * 100),
      100,
    );

    return {
      currentXP: state.currentXP,
      level: level.level,
      title: level.title,
      nextLevelXP: level.nextLevelXP,
      progressPercentage,
      remainingXP: isMaxLevel ? 0 : Math.max(level.nextLevelXP - state.currentXP, 0),
      recentActivity: state.activity.slice(0, 8),
      weeklyMomentum: getWeeklyMomentum(state.activity),
      activity: state.activity,
      isMaxLevel,
    };
  }, [state.activity, state.currentXP]);

  function awardXP(action: XPAction, options: AwardXPOptions = {}) {
    const rule = XP_RULES[action];
    const current = readXP();
    const amount = options.amount ?? rule.amount;
    const label = options.label ?? rule.label;

    saveXP({
      currentXP: current.currentXP + amount,
      activity: [
        {
          id: `${Date.now()}-${action}`,
          amount,
          label,
          createdAt: new Date().toISOString(),
        },
        ...current.activity,
      ].slice(0, 25),
    });
  }

  return {
    ...levelState,
    awardXP,
  };
}
