"use client";

import { useMemo } from "react";
import {
  ATLAS_STORAGE_KEYS,
  readFromStorage,
  useStoredValue,
  writeToStorage,
  todayISO,
} from "@/lib/storage";
export { todayISO };
import type { WorkoutDraft, WorkoutLog, WorkoutType } from "@/types/atlas";

export type { WorkoutDraft, WorkoutLog, WorkoutType } from "@/types/atlas";

const INITIAL_WORKOUTS: WorkoutLog[] = [];

export const WORKOUT_TYPES: WorkoutType[] = [
  "Push",
  "Pull",
  "Legs",
  "Full Body",
  "Cardio",
  "Rest",
  "Other",
];

export function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function normalizeWorkoutLogs(value: unknown): WorkoutLog[] {
  if (!Array.isArray(value)) {
    return INITIAL_WORKOUTS;
  }

  return value.map((workout) => {
    const candidate =
      workout && typeof workout === "object"
        ? (workout as Partial<WorkoutLog>)
        : {};
    const now = new Date().toISOString();

    return {
      id:
        typeof candidate.id === "string"
          ? candidate.id
          : `${Date.now()}-workout`,
      date: candidate.date ?? now.slice(0, 10),
      workoutType: WORKOUT_TYPES.includes(candidate.workoutType as WorkoutType)
        ? (candidate.workoutType as WorkoutType)
        : "Other",
      duration:
        typeof candidate.duration === "number" ? candidate.duration : 0,
      energy: typeof candidate.energy === "number" ? candidate.energy : 5,
      intensity:
        typeof candidate.intensity === "number" ? candidate.intensity : 5,
      notes: candidate.notes ?? "",
      createdAt: candidate.createdAt ?? now,
    };
  });
}

function readWorkoutLogs() {
  return readFromStorage(
    ATLAS_STORAGE_KEYS.gymLogs,
    INITIAL_WORKOUTS,
    normalizeWorkoutLogs,
  );
}

function saveWorkouts(workouts: WorkoutLog[]) {
  writeToStorage(ATLAS_STORAGE_KEYS.gymLogs, workouts);
}

function uniqueWorkoutDates(workouts: WorkoutLog[]) {
  return Array.from(
    new Set(
      workouts
        .filter((workout) => workout.workoutType !== "Rest")
        .map((workout) => workout.date),
    ),
  ).sort((a, b) => b.localeCompare(a));
}

function calculateStreak(dates: string[]) {
  let streak = 0;
  const today = new Date(todayISO());

  for (let offset = 0; offset < 365; offset += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    const key = date.toISOString().slice(0, 10);

    if (!dates.includes(key)) {
      break;
    }

    streak += 1;
  }

  return streak;
}

function calculateLongestStreak(dates: string[]) {
  if (dates.length === 0) {
    return 0;
  }

  const ascending = [...dates].sort();
  let longest = 1;
  let current = 1;

  for (let index = 1; index < ascending.length; index += 1) {
    const previous = new Date(ascending[index - 1]);
    const next = new Date(ascending[index]);
    previous.setDate(previous.getDate() + 1);

    if (previous.toISOString().slice(0, 10) === next.toISOString().slice(0, 10)) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }

  return longest;
}

export function getCurrentWeekDays() {
  const today = new Date();
  const day = today.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);

    return {
      label: new Intl.DateTimeFormat("en", { weekday: "short" }).format(date),
      date: date.toISOString().slice(0, 10),
    };
  });
}

export function calculateGymOverview(workouts: WorkoutLog[], month = currentMonth()) {
  const monthly = workouts.filter((workout) => workout.date.startsWith(month));
  const training = monthly.filter((workout) => workout.workoutType !== "Rest");
  const dates = uniqueWorkoutDates(workouts);
  const totalEnergy = training.reduce((sum, workout) => sum + workout.energy, 0);
  const totalIntensity = training.reduce((sum, workout) => sum + workout.intensity, 0);
  const typeBreakdown = monthly.reduce<Record<string, number>>((totals, workout) => {
    totals[workout.workoutType] = (totals[workout.workoutType] ?? 0) + 1;
    return totals;
  }, {});

  return {
    monthly,
    totalWorkouts: training.length,
    currentStreak: calculateStreak(dates),
    longestStreak: calculateLongestStreak(dates),
    averageEnergy: training.length ? Math.round((totalEnergy / training.length) * 10) / 10 : 0,
    averageIntensity: training.length
      ? Math.round((totalIntensity / training.length) * 10) / 10
      : 0,
    totalMinutes: training.reduce((sum, workout) => sum + workout.duration, 0),
    typeBreakdown,
  };
}

export function calculateWeeklyConsistency(workouts: WorkoutLog[]) {
  const weekDays = getCurrentWeekDays();
  const workoutDates = new Set(uniqueWorkoutDates(workouts));
  const completed = weekDays.filter((day) => workoutDates.has(day.date));

  return {
    weekDays: weekDays.map((day) => ({
      ...day,
      completed: workoutDates.has(day.date),
    })),
    completedCount: completed.length,
    completionPercentage: Math.round((completed.length / weekDays.length) * 100),
  };
}

export function calculateWorkoutXP(workout: WorkoutDraft) {
  let amount = 10;
  const reasons = [`Logged a ${workout.duration} min workout`];

  if (workout.duration >= 45) {
    amount += 5;
    reasons.push("45+ min");
  }

  if (workout.intensity >= 7) {
    amount += 5;
    reasons.push("high intensity");
  }

  return {
    amount,
    label:
      amount > 10
        ? `Logged a ${workout.duration} min high-effort workout`
        : reasons[0],
  };
}

export function buildGymInsights(workouts: WorkoutLog[]) {
  const overview = calculateGymOverview(workouts);
  const topType = Object.entries(overview.typeBreakdown).sort(
    (a, b) => b[1] - a[1],
  )[0];
  const weekly = calculateWeeklyConsistency(workouts);
  const insights: string[] = [];

  if (topType) {
    insights.push(`You train most often on ${topType[0]} sessions.`);
  }

  insights.push(`Your average energy this month is ${overview.averageEnergy}/10.`);
  insights.push(`You completed ${weekly.completedCount} workouts this week.`);

  return insights.slice(0, 3);
}

export function useWorkoutLogs() {
  const workouts = useStoredValue(
    ATLAS_STORAGE_KEYS.gymLogs,
    INITIAL_WORKOUTS,
    normalizeWorkoutLogs,
  );

  const sortedWorkouts = useMemo(
    () => [...workouts].sort((a, b) => b.date.localeCompare(a.date)),
    [workouts],
  );

  function addWorkout(draft: WorkoutDraft) {
    const workout: WorkoutLog = {
      ...draft,
      id: `${Date.now()}-workout`,
      createdAt: new Date().toISOString(),
    };

    saveWorkouts([workout, ...readWorkoutLogs()]);
    return workout;
  }

  function deleteWorkout(id: string) {
    saveWorkouts(readWorkoutLogs().filter((workout) => workout.id !== id));
  }

  return {
    workouts: sortedWorkouts,
    addWorkout,
    deleteWorkout,
  };
}

export const useGymLogs = useWorkoutLogs;
