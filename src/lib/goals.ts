"use client";

import { useMemo } from "react";
import {
  ATLAS_STORAGE_KEYS,
  readFromStorage,
  todayISO,
  useStoredValue,
  writeToStorage,
} from "@/lib/storage";
import type {
  Currency,
  Goal,
  GoalDraft,
  HabitCheckIn,
  HabitCheckInStatus,
  SavingsState,
} from "@/types/atlas";
import { convertToBase } from "@/lib/finances";

export type {
  Goal,
  GoalDraft,
  GoalStatus,
  HabitCheckIn,
  HabitCheckInStatus,
} from "@/types/atlas";

const INITIAL_GOALS: Goal[] = [];
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isISODate(value: unknown): value is string {
  return typeof value === "string" && ISO_DATE_PATTERN.test(value);
}

function parseISODate(date: string) {
  const [year, month, day] = date.split("-").map(Number);

  if (!year || !month || !day) {
    return new Date(Date.UTC(1970, 0, 1));
  }

  return new Date(Date.UTC(year, month - 1, day));
}

function addDaysISO(date: string, deltaDays: number) {
  const parsed = parseISODate(date);
  parsed.setUTCDate(parsed.getUTCDate() + deltaDays);
  return parsed.toISOString().slice(0, 10);
}

function getMonthKey(date: string) {
  return date.slice(0, 7);
}

function normalizeHabitCheckIns(value: unknown): Record<string, HabitCheckIn> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value as Record<string, unknown>).reduce<Record<string, HabitCheckIn>>(
    (records, [date, rawCheckIn]) => {
      if (!isISODate(date) || !rawCheckIn || typeof rawCheckIn !== "object") {
        return records;
      }

      const candidate = rawCheckIn as Partial<HabitCheckIn>;
      const status: HabitCheckInStatus =
        candidate.status === "completed" ||
        candidate.status === "missed" ||
        candidate.status === "skipped"
          ? candidate.status
          : "missed";
      const now = new Date().toISOString();

      records[date] = {
        date,
        status,
        value:
          typeof candidate.value === "number" && Number.isFinite(candidate.value)
            ? candidate.value
            : undefined,
        note: typeof candidate.note === "string" ? candidate.note : "",
        createdAt:
          typeof candidate.createdAt === "string" ? candidate.createdAt : now,
        updatedAt:
          typeof candidate.updatedAt === "string" ? candidate.updatedAt : now,
      };

      return records;
    },
    {},
  );
}

export function isDailyHabitGoal(goal: Goal) {
  return goal.goalType === "daily_habit";
}

function normalizeGoal(value: Partial<Goal>): Goal {
  const now = new Date().toISOString();
  const goalType = value.goalType === "daily_habit" ? "daily_habit" : "standard";
  const habitTargetPerDay =
    typeof value.habitTargetPerDay === "number" &&
    Number.isFinite(value.habitTargetPerDay) &&
    value.habitTargetPerDay > 0
      ? value.habitTargetPerDay
      : 1;
  const habitCheckIns =
    goalType === "daily_habit" ? normalizeHabitCheckIns(value.habitCheckIns) : undefined;

  return {
    id: value.id ?? `${Date.now()}-goal`,
    title: value.title ?? "Untitled goal",
    area: value.area ?? "Personal",
    status: value.status ?? "active",
    currentValue: value.currentValue ?? 0,
    targetValue: value.targetValue ?? 100,
    deadline: value.deadline ?? "",
    notes: value.notes ?? "",
    createdAt: value.createdAt ?? now,
    updatedAt: value.updatedAt ?? value.createdAt ?? now,
    linkedFinanceMetric: value.linkedFinanceMetric ?? "none",
    currency: value.currency ?? "PYG",
    unit: value.unit ?? "",
    goalType,
    habitFrequency: goalType === "daily_habit" ? "daily" : undefined,
    habitTargetPerDay: goalType === "daily_habit" ? habitTargetPerDay : undefined,
    habitUnit:
      goalType === "daily_habit"
        ? value.habitUnit ?? value.unit ?? "day"
        : undefined,
    habitStartDate:
      goalType === "daily_habit"
        ? isISODate(value.habitStartDate)
          ? value.habitStartDate
          : now.slice(0, 10)
        : undefined,
    habitEndDate:
      goalType === "daily_habit" && isISODate(value.habitEndDate)
        ? value.habitEndDate
        : undefined,
    habitCheckIns,
  };
}

function normalizeGoals(value: unknown) {
  if (!Array.isArray(value)) {
    return INITIAL_GOALS;
  }

  return value.map((goal) =>
    normalizeGoal(
      goal && typeof goal === "object" ? (goal as Partial<Goal>) : {},
    ),
  );
}

function readGoals() {
  return readFromStorage(ATLAS_STORAGE_KEYS.goals, INITIAL_GOALS, normalizeGoals);
}

function saveGoals(goals: Goal[]) {
  writeToStorage(ATLAS_STORAGE_KEYS.goals, goals);
}

/**
 * Calculates goal progress as a percentage.
 * If the goal is linked to savings, calculates from savings amount instead.
 */
export function getGoalProgress(
  goal: Goal,
  savings?: SavingsState,
  baseCurrency?: Currency,
  exchangeRate?: number,
): number {
  if (isDailyHabitGoal(goal)) {
    return getHabitGoalStats(goal).completionRate;
  }

  if (goal.targetValue <= 0) {
    return 0;
  }

  if (
    goal.linkedFinanceMetric === "savings" &&
    savings &&
    baseCurrency &&
    exchangeRate
  ) {
    const savingsInGoalCurrency = convertToBase(
      savings.currentAmount,
      savings.currency,
      goal.currency ?? "PYG",
      exchangeRate,
    );
    return Math.min(
      Math.round((savingsInGoalCurrency / goal.targetValue) * 100),
      100,
    );
  }

  return Math.min(Math.round((goal.currentValue / goal.targetValue) * 100), 100);
}

export function daysBetweenISO(startDate: string, endDate: string): number {
  const start = parseISODate(startDate);
  const end = parseISODate(endDate);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

export type FinancialGoalPlan = {
  remainingAmount: number;
  daysRemaining: number;
  perDay: number;
  perWeek: number;
  perMonth: number;
  isReached: boolean;
  isPastDeadline: boolean;
  currency: Currency;
};

/**
 * Calculates the required daily, weekly, and monthly savings pace for a financial goal.
 */
export function calculateFinancialGoalPlan(
  goal: Goal,
  savings?: SavingsState,
  baseCurrency?: Currency,
  exchangeRate?: number,
  today = todayISO(),
): FinancialGoalPlan {
  const targetAmount = goal.targetValue;
  
  // Determine current amount based on linked vault savings or local progress value
  let currentAmount = goal.currentValue;
  if (
    goal.linkedFinanceMetric === "savings" &&
    savings &&
    baseCurrency &&
    exchangeRate
  ) {
    currentAmount = convertToBase(
      savings.currentAmount,
      savings.currency,
      goal.currency ?? "PYG",
      exchangeRate,
    );
  }

  const remainingAmount = Math.max(targetAmount - currentAmount, 0);
  
  let daysRemaining = 0;
  if (goal.deadline) {
    daysRemaining = Math.max(daysBetweenISO(today, goal.deadline), 0);
  }

  const perDay = daysRemaining > 0 ? remainingAmount / daysRemaining : 0;
  const perWeek = perDay * 7;
  const perMonth = perDay * 30.44;

  const isReached = remainingAmount <= 0;
  const isPastDeadline = goal.deadline ? today >= goal.deadline : false;

  return {
    remainingAmount,
    daysRemaining,
    perDay,
    perWeek,
    perMonth,
    isReached,
    isPastDeadline,
    currency: goal.currency ?? "PYG",
  };
}


/**
 * Returns overall completion percentage across all active goals.
 */
export function getOverallGoalCompletion(
  goals: Goal[],
  savings?: SavingsState,
  baseCurrency?: Currency,
  exchangeRate?: number,
): number {
  const active = goals.filter(
    (g) => g.status === "active" && !isDailyHabitGoal(g),
  );
  if (active.length === 0) return 0;

  const totalProgress = active.reduce(
    (sum, g) => sum + getGoalProgress(g, savings, baseCurrency, exchangeRate),
    0,
  );
  return Math.round(totalProgress / active.length);
}

/**
 * Returns the top N active goals sorted by nearest deadline.
 */
export function getTopActiveGoals(goals: Goal[], limit = 3): Goal[] {
  return goals
    .filter((g) => g.status === "active" && !isDailyHabitGoal(g))
    .sort((a, b) => {
      if (!a.deadline && !b.deadline) return 0;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return a.deadline.localeCompare(b.deadline);
    })
    .slice(0, limit);
}

export type HabitTodayStatus = HabitCheckInStatus | "pending";

export type HabitGoalStats = {
  currentStreak: number;
  bestStreak: number;
  todayStatus: HabitTodayStatus;
  completedToday: boolean;
  missedToday: boolean;
  skippedToday: boolean;
  completionRate: number;
  totalCompletedDays: number;
  totalTrackedDays: number;
};

function getCompletedHabitDates(goal: Goal) {
  return Object.values(goal.habitCheckIns ?? {})
    .filter((checkIn) => checkIn.status === "completed")
    .map((checkIn) => checkIn.date)
    .sort((a, b) => a.localeCompare(b));
}

function calculateBestHabitStreak(completedDates: string[]) {
  if (completedDates.length === 0) {
    return 0;
  }

  let best = 0;
  let current = 0;
  let previousDate = "";

  completedDates.forEach((date) => {
    if (!previousDate || addDaysISO(previousDate, 1) === date) {
      current += 1;
    } else {
      best = Math.max(best, current);
      current = 1;
    }

    previousDate = date;
  });

  return Math.max(best, current);
}

function calculateCurrentHabitStreak(goal: Goal, today: string, completedDates: string[]) {
  const completedSet = new Set(completedDates);
  const todayStatus = goal.habitCheckIns?.[today]?.status ?? "pending";

  if (todayStatus === "missed" || todayStatus === "skipped") {
    return 0;
  }

  let anchorDate = todayStatus === "completed" ? today : addDaysISO(today, -1);
  let streak = 0;

  while (completedSet.has(anchorDate)) {
    streak += 1;
    anchorDate = addDaysISO(anchorDate, -1);
  }

  return streak;
}

export function getHabitGoalStats(
  goal: Goal,
  today = todayISO(),
): HabitGoalStats {
  if (!isDailyHabitGoal(goal)) {
    return {
      currentStreak: 0,
      bestStreak: 0,
      todayStatus: "pending",
      completedToday: false,
      missedToday: false,
      skippedToday: false,
      completionRate: 0,
      totalCompletedDays: 0,
      totalTrackedDays: 0,
    };
  }

  const checkIns = Object.values(goal.habitCheckIns ?? {});
  const completedDates = getCompletedHabitDates(goal);
  const todayStatus = goal.habitCheckIns?.[today]?.status ?? "pending";
  const totalCompletedDays = completedDates.length;
  const totalTrackedDays = checkIns.length;

  return {
    currentStreak: calculateCurrentHabitStreak(goal, today, completedDates),
    bestStreak: calculateBestHabitStreak(completedDates),
    todayStatus,
    completedToday: todayStatus === "completed",
    missedToday: todayStatus === "missed",
    skippedToday: todayStatus === "skipped",
    completionRate:
      totalTrackedDays > 0
        ? Math.round((totalCompletedDays / totalTrackedDays) * 100)
        : 0,
    totalCompletedDays,
    totalTrackedDays,
  };
}

export type HabitCalendarItem = {
  goal: Goal;
  date: string;
  status: HabitTodayStatus;
  checkIn?: HabitCheckIn;
  stats: HabitGoalStats;
};

function shouldShowHabitForDate(goal: Goal, date: string) {
  if (goal.habitStartDate && date < goal.habitStartDate) {
    return false;
  }

  if (goal.habitEndDate && date > goal.habitEndDate) {
    return false;
  }

  return true;
}

export function getHabitCalendarItemsForMonth(
  goals: Goal[],
  year: number,
  monthIndex: number,
  today = todayISO(),
): HabitCalendarItem[] {
  const monthKey = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
  const items: HabitCalendarItem[] = [];

  goals.filter(isDailyHabitGoal).forEach((goal) => {
    Object.values(goal.habitCheckIns ?? {}).forEach((checkIn) => {
      if (getMonthKey(checkIn.date) !== monthKey) {
        return;
      }

      if (!shouldShowHabitForDate(goal, checkIn.date)) {
        return;
      }

      items.push({
        goal,
        date: checkIn.date,
        status: checkIn.status,
        checkIn,
        stats: getHabitGoalStats(goal, checkIn.date),
      });
    });

    if (
      goal.status === "active" &&
      getMonthKey(today) === monthKey &&
      shouldShowHabitForDate(goal, today) &&
      !goal.habitCheckIns?.[today]
    ) {
      items.push({
        goal,
        date: today,
        status: "pending",
        stats: getHabitGoalStats(goal, today),
      });
    }
  });

  return items.sort((a, b) => a.goal.title.localeCompare(b.goal.title));
}

export function getDailyHabitDashboardSummary(goals: Goal[], today = todayISO()) {
  const activeHabits = goals.filter(
    (goal) => isDailyHabitGoal(goal) && goal.status === "active",
  );
  const stats = activeHabits.map((goal) => getHabitGoalStats(goal, today));

  return {
    activeHabits,
    completedToday: stats.filter((stat) => stat.todayStatus === "completed").length,
    pendingToday: stats.filter((stat) => stat.todayStatus === "pending").length,
    missedToday: stats.filter((stat) => stat.todayStatus === "missed").length,
    skippedToday: stats.filter((stat) => stat.todayStatus === "skipped").length,
    bestActiveStreak: stats.reduce(
      (best, stat) => Math.max(best, stat.currentStreak),
      0,
    ),
  };
}

export function useGoals() {
  const goals = useStoredValue(
    ATLAS_STORAGE_KEYS.goals,
    INITIAL_GOALS,
    normalizeGoals,
  );
  const sortedGoals = useMemo(
    () => [...goals].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [goals],
  );

  function addGoal(draft: GoalDraft) {
    const now = new Date().toISOString();
    const goal = normalizeGoal({
      ...draft,
      id: `${Date.now()}-goal`,
      title: draft.title.trim(),
      area: draft.area.trim() || "Personal",
      notes: draft.notes.trim(),
      linkedFinanceMetric: draft.linkedFinanceMetric ?? "none",
      currency: draft.currency ?? "PYG",
      unit: draft.unit ?? "",
      createdAt: now,
      updatedAt: now,
    });

    saveGoals([goal, ...readGoals()]);
    return goal;
  }

  function updateGoal(id: string, updates: Partial<Goal>) {
    const current = readGoals();
    const updatedGoals = current.map((goal) => {
      if (goal.id !== id) return goal;
      return normalizeGoal({
        ...goal,
        ...updates,
        updatedAt: new Date().toISOString(),
      });
    });
    saveGoals(updatedGoals);
  }

  function deleteGoal(id: string) {
    saveGoals(readGoals().filter((goal) => goal.id !== id));
  }

  function checkInHabitGoal(
    id: string,
    status: HabitCheckInStatus,
    date = todayISO(),
    value?: number,
    note?: string,
  ) {
    const now = new Date().toISOString();
    const current = readGoals();
    let updatedGoal: Goal | null = null;

    const updatedGoals = current.map((goal) => {
      if (goal.id !== id || !isDailyHabitGoal(goal)) {
        return goal;
      }

      const checkIn: HabitCheckIn = {
        date,
        status,
        value:
          typeof value === "number" && Number.isFinite(value)
            ? value
            : undefined,
        note: note?.trim() ?? "",
        createdAt: goal.habitCheckIns?.[date]?.createdAt ?? now,
        updatedAt: now,
      };
      const normalized = normalizeGoal({
        ...goal,
        habitCheckIns: {
          ...(goal.habitCheckIns ?? {}),
          [date]: checkIn,
        },
        updatedAt: now,
      });
      const stats = getHabitGoalStats(normalized, date);
      updatedGoal = {
        ...normalized,
        currentValue: stats.totalCompletedDays,
      };

      return updatedGoal;
    });

    saveGoals(updatedGoals);
    return updatedGoal;
  }

  return {
    goals: sortedGoals,
    addGoal,
    updateGoal,
    deleteGoal,
    checkInHabitGoal,
  };
}
