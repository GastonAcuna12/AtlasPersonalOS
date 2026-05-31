"use client";

import { useMemo } from "react";
import {
  ATLAS_STORAGE_KEYS,
  readFromStorage,
  useStoredValue,
  writeToStorage,
} from "@/lib/storage";
import { convertToBase } from "@/lib/finances";
import type {
  DailyWrap,
  DailyWrapStatsSnapshot,
  AtlasTask,
  WorkItem,
  Transaction,
  WorkoutLog,
  Note,
  XPActivity,
  AtlasSettings,
} from "@/types/atlas";

const INITIAL_DAILY_WRAPS: DailyWrap[] = [];

// Helper to construct tomorrow's date string locally safely
export function getLocalTomorrowDateString(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const current = new Date(y, m - 1, d);
  current.setDate(current.getDate() + 1);
  
  const tomorrowYear = current.getFullYear();
  const tomorrowMonth = String(current.getMonth() + 1).padStart(2, "0");
  const tomorrowDay = String(current.getDate()).padStart(2, "0");
  
  return `${tomorrowYear}-${tomorrowMonth}-${tomorrowDay}`;
}

// 1. Task Stats
export function getTodayTaskStats(tasks: AtlasTask[], date: string) {
  const todayTasks = tasks.filter((t) => t.plannedDate === date);
  const completed = tasks.filter(
    (t) => t.status === "completed" && t.completedAt && t.completedAt.startsWith(date)
  );
  const skipped = tasks.filter(
    (t) => t.status === "skipped" && t.plannedDate === date
  );

  return {
    plannedTasks: todayTasks.length,
    completedTasks: completed.length,
    skippedTasks: skipped.length,
  };
}

// 2. Work Stats
export function getTodayWorkStats(workItems: WorkItem[], date: string) {
  const completed = workItems.filter(
    (w) => w.status === "completed" && w.completedAt && w.completedAt.startsWith(date)
  );
  const waitingFeedback = workItems.filter((w) => w.status === "waiting_feedback");

  return {
    completedWorkItems: completed.length,
    waitingFeedbackItems: waitingFeedback.length,
  };
}

// 3. Finance Stats
export function getTodayFinanceStats(
  transactions: Transaction[],
  date: string,
  settings: AtlasSettings
) {
  const baseCurrency = settings.baseCurrency ?? "PYG";
  const rate = settings.usdToPygRate ?? 6150;

  const todayTx = transactions.filter((t) => t.date === date);
  
  const income = todayTx
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + convertToBase(t.amount, t.currency, baseCurrency, rate), 0);

  const expenses = todayTx
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + convertToBase(t.amount, t.currency, baseCurrency, rate), 0);

  return {
    financeTransactionsCount: todayTx.length,
    dailyIncome: income,
    dailyExpenses: expenses,
  };
}

// 4. Gym Stats
export function getTodayGymStats(gymLogs: WorkoutLog[], date: string) {
  const log = gymLogs.find((l) => l.date === date);
  return {
    gymLogged: !!log,
    workoutType: log?.workoutType,
  };
}

// 5. Academic Stats
export function getTodayAcademicStats(tasks: AtlasTask[], date: string) {
  const completedAcademic = tasks.filter(
    (t) =>
      t.area === "Academic" &&
      t.status === "completed" &&
      t.completedAt &&
      t.completedAt.startsWith(date)
  );

  return {
    academicTasksCompleted: completedAcademic.length,
  };
}

// 6. Notes Stats
export function getTodayNotesStats(notes: Note[], date: string) {
  const created = notes.filter((n) => n.createdAt && n.createdAt.startsWith(date));
  return {
    notesCreated: created.length,
  };
}

// 7. XP Stats
export function getTodayXPStats(xpActivity: XPActivity[], date: string) {
  const earned = xpActivity
    .filter((a) => a.createdAt && a.createdAt.startsWith(date))
    .reduce((sum, a) => sum + a.amount, 0);

  return {
    xpEarnedToday: earned,
  };
}

// 8. Tomorrow Deadlines
export function getTomorrowDeadlineStats(tasks: AtlasTask[], date: string) {
  const tomorrowStr = getLocalTomorrowDateString(date);
  const dueTomorrow = tasks.filter(
    (t) => t.status !== "completed" && t.status !== "skipped" && t.dueDate === tomorrowStr
  );
  return {
    upcomingDeadlinesTomorrow: dueTomorrow.length,
  };
}

// 9. Overdue Stats
export function getOverdueStats(tasks: AtlasTask[], date: string) {
  const overdue = tasks.filter(
    (t) => t.status !== "completed" && t.status !== "skipped" && t.dueDate && t.dueDate < date
  );
  return {
    overdueItemsRemaining: overdue.length,
  };
}

// 10. Summary Generator
export function generateDailyWrapSummary(snapshot: DailyWrapStatsSnapshot): string {
  const parts: string[] = [];

  if (snapshot.plannedTasks > 0 || snapshot.completedTasks > 0) {
    parts.push(`completed ${snapshot.completedTasks} of ${snapshot.plannedTasks} planned tasks`);
  }

  if (snapshot.completedWorkItems > 0) {
    parts.push(`finished ${snapshot.completedWorkItems} work item${snapshot.completedWorkItems > 1 ? "s" : ""}`);
  }

  if (snapshot.gymLogged) {
    parts.push(`logged a ${snapshot.workoutType ?? "workout"} workout`);
  }

  if (snapshot.financeTransactionsCount > 0) {
    parts.push(`recorded ${snapshot.financeTransactionsCount} finance transaction${snapshot.financeTransactionsCount > 1 ? "s" : ""}`);
  }

  if (snapshot.notesCreated > 0) {
    parts.push(`created ${snapshot.notesCreated} note${snapshot.notesCreated > 1 ? "s" : ""}`);
  }

  if (snapshot.academicTasksCompleted > 0) {
    parts.push(`completed ${snapshot.academicTasksCompleted} academic task${snapshot.academicTasksCompleted > 1 ? "s" : ""}`);
  }

  if (parts.length === 0) {
    return "Today has very little tracked activity. Add tasks, transactions, workouts, or notes to make Atlas more useful.";
  }

  let text = "Today you " + parts.slice(0, -1).join(", ") + (parts.length > 1 ? ", and " : "") + parts[parts.length - 1];
  text += ` and gained ${snapshot.xpEarnedToday} XP.`;

  if (snapshot.upcomingDeadlinesTomorrow > 0) {
    text += ` Tomorrow has ${snapshot.upcomingDeadlinesTomorrow} upcoming deadline${snapshot.upcomingDeadlinesTomorrow > 1 ? "s" : ""}.`;
  }

  return text;
}

// Normalize raw wraps array from localStorage safely
function normalizeDailyWraps(value: unknown): DailyWrap[] {
  if (!Array.isArray(value)) return INITIAL_DAILY_WRAPS;
  return value.map((w) => {
    const candidate = w && typeof w === "object" ? (w as Partial<DailyWrap>) : {};
    const snapshot = (candidate.statsSnapshot && typeof candidate.statsSnapshot === "object" ? candidate.statsSnapshot : {}) as Record<string, unknown>;
    return {
      id: candidate.id ?? `${Date.now()}-wrap`,
      date: candidate.date ?? new Date().toISOString().slice(0, 10),
      generatedSummary: candidate.generatedSummary ?? "",
      statsSnapshot: {
        plannedTasks: Number(snapshot.plannedTasks) || 0,
        completedTasks: Number(snapshot.completedTasks) || 0,
        skippedTasks: Number(snapshot.skippedTasks) || 0,
        completedWorkItems: Number(snapshot.completedWorkItems) || 0,
        waitingFeedbackItems: Number(snapshot.waitingFeedbackItems) || 0,
        academicTasksCompleted: Number(snapshot.academicTasksCompleted) || 0,
        gymLogged: Boolean(snapshot.gymLogged),
        workoutType: snapshot.workoutType as DailyWrapStatsSnapshot["workoutType"],
        financeTransactionsCount: Number(snapshot.financeTransactionsCount) || 0,
        dailyIncome: Number(snapshot.dailyIncome) || 0,
        dailyExpenses: Number(snapshot.dailyExpenses) || 0,
        notesCreated: Number(snapshot.notesCreated) || 0,
        xpEarnedToday: Number(snapshot.xpEarnedToday) || 0,
        upcomingDeadlinesTomorrow: Number(snapshot.upcomingDeadlinesTomorrow) || 0,
        overdueItemsRemaining: Number(snapshot.overdueItemsRemaining) || 0,
      },
      mood: typeof candidate.mood === "number" ? candidate.mood : undefined,
      energy: typeof candidate.energy === "number" ? candidate.energy : undefined,
      productivity: typeof candidate.productivity === "number" ? candidate.productivity : undefined,
      mainTakeaway: candidate.mainTakeaway ?? "",
      tomorrowFocus: candidate.tomorrowFocus ?? "",
      notes: candidate.notes ?? "",
      createdAt: candidate.createdAt ?? new Date().toISOString(),
      updatedAt: candidate.updatedAt ?? new Date().toISOString(),
      xpAwarded: Boolean(candidate.xpAwarded),
    };
  });
}

function readDailyWraps() {
  return readFromStorage(ATLAS_STORAGE_KEYS.dailyWraps, INITIAL_DAILY_WRAPS, normalizeDailyWraps);
}

// Core Hook
export function useDailyWraps() {
  const wraps = useStoredValue(
    ATLAS_STORAGE_KEYS.dailyWraps,
    INITIAL_DAILY_WRAPS,
    normalizeDailyWraps
  );

  const getDailyWrapForDate = useMemo(() => {
    return (date: string) => wraps.find((w) => w.date === date);
  }, [wraps]);

  function saveDailyWrap(
    date: string,
    generatedSummary: string,
    statsSnapshot: DailyWrapStatsSnapshot,
    reflection: {
      mood?: number;
      energy?: number;
      productivity?: number;
      mainTakeaway?: string;
      tomorrowFocus?: string;
      notes?: string;
    },
    awardXPCallback?: () => void
  ) {
    const current = readDailyWraps();
    const existing = current.find((w) => w.date === date);
    const now = new Date().toISOString();
    
    let xpAwarded = existing ? existing.xpAwarded : false;
    let shouldAwardXP = false;

    if (!existing) {
      xpAwarded = true;
      shouldAwardXP = true;
    }

    const wrap: DailyWrap = {
      id: existing?.id ?? `${Date.now()}-wrap`,
      date,
      generatedSummary,
      statsSnapshot,
      mood: reflection.mood,
      energy: reflection.energy,
      productivity: reflection.productivity,
      mainTakeaway: reflection.mainTakeaway ?? "",
      tomorrowFocus: reflection.tomorrowFocus ?? "",
      notes: reflection.notes ?? "",
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      xpAwarded,
    };

    const updated = existing
      ? current.map((w) => (w.date === date ? wrap : w))
      : [wrap, ...current];

    writeToStorage(ATLAS_STORAGE_KEYS.dailyWraps, updated);

    if (shouldAwardXP && awardXPCallback) {
      awardXPCallback();
    }

    return wrap;
  }

  return {
    dailyWraps: wraps,
    getDailyWrapForDate,
    saveDailyWrap,
  };
}
