"use client";

import { useMemo } from "react";
import {
  ATLAS_STORAGE_KEYS,
  readFromStorage,
  useStoredValue,
  writeToStorage,
} from "@/lib/storage";
import type { Currency, Goal, GoalDraft, SavingsState } from "@/types/atlas";
import { convertToBase } from "@/lib/finances";

export type { Goal, GoalDraft, GoalStatus } from "@/types/atlas";

const INITIAL_GOALS: Goal[] = [];

function normalizeGoal(value: Partial<Goal>): Goal {
  const now = new Date().toISOString();

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

/**
 * Returns overall completion percentage across all active goals.
 */
export function getOverallGoalCompletion(
  goals: Goal[],
  savings?: SavingsState,
  baseCurrency?: Currency,
  exchangeRate?: number,
): number {
  const active = goals.filter((g) => g.status === "active");
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
    .filter((g) => g.status === "active")
    .sort((a, b) => {
      if (!a.deadline && !b.deadline) return 0;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return a.deadline.localeCompare(b.deadline);
    })
    .slice(0, limit);
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
    const goal: Goal = {
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
    };

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

  return {
    goals: sortedGoals,
    addGoal,
    updateGoal,
    deleteGoal,
  };
}
