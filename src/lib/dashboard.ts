"use client";

import type {
  AtlasTask,
  Currency,
  Goal,
  SavingsState,
  WeeklyReview,
  WorkItem,
  CalendarEvent,
  WorkoutLog,
  DailyWrap,
} from "@/types/atlas";
import { getGoalProgress, isDailyHabitGoal } from "@/lib/goals";

export type DeadlineItem = {
  id: string;
  title: string;
  type: "task" | "academic" | "work" | "goal";
  area: string;
  dueDate: string;
  relativeLabel: string;
  isOverdue: boolean;
  isDueToday: boolean;
};

export type PriorityBriefing = {
  topTask: { title: string; priority: string } | null;
  nextDeadline: DeadlineItem | null;
  topGoal: { title: string; progress: number } | null;
  weeklyReviewStatus: string;
  overdueCount: number;
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function daysBetween(dateA: string, dateB: string): number {
  const a = new Date(dateA);
  const b = new Date(dateB);
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

export function getRelativeLabel(dueDate: string, today: string): string {
  const diff = daysBetween(today, dueDate);
  if (diff < 0) return "Overdue";
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return `In ${diff} days`;
}

export function isDeadlineCritical(dueDate: string, today: string): boolean {
  const diff = daysBetween(today, dueDate);
  return diff <= 7;
}

export function isDeadlineUpcoming(dueDate: string, today: string): boolean {
  const diff = daysBetween(today, dueDate);
  return diff <= 30;
}

/**
 * Collects ALL active pending deadlines from tasks, work items, and goals into a unified sorted list.
 */
export function getAllDeadlines(
  tasks: AtlasTask[],
  workItems: WorkItem[],
  goals: Goal[],
  date?: string,
): DeadlineItem[] {
  const today = date ?? todayISO();
  const deadlines: DeadlineItem[] = [];

  // Tasks with due dates
  tasks
    .filter(
      (t) =>
        t.dueDate &&
        t.status !== "completed" &&
        t.status !== "skipped",
    )
    .forEach((t) => {
      deadlines.push({
        id: t.id,
        title: t.title,
        type: t.area === "Academic" ? "academic" : "task",
        area: t.area,
        dueDate: t.dueDate,
        relativeLabel: getRelativeLabel(t.dueDate, today),
        isOverdue: t.dueDate < today,
        isDueToday: t.dueDate === today,
      });
    });

  // Work items with deadlines
  workItems
    .filter(
      (w) =>
        w.deadline &&
        w.status !== "completed" &&
        w.status !== "archived",
    )
    .forEach((w) => {
      deadlines.push({
        id: w.id,
        title: w.title,
        type: "work",
        area: "Work",
        dueDate: w.deadline!,
        relativeLabel: getRelativeLabel(w.deadline!, today),
        isOverdue: w.deadline! < today,
        isDueToday: w.deadline! === today,
      });
    });

  // Goals with deadlines
  goals
    .filter((g) => g.deadline && g.status === "active" && !isDailyHabitGoal(g))
    .forEach((g) => {
      deadlines.push({
        id: g.id,
        title: g.title,
        type: "goal",
        area: g.area,
        dueDate: g.deadline,
        relativeLabel: getRelativeLabel(g.deadline, today),
        isOverdue: g.deadline < today,
        isDueToday: g.deadline === today,
      });
    });

  // Sort: overdue first, then by date ascending
  return deadlines.sort((a, b) => {
    if (a.isOverdue && !b.isOverdue) return -1;
    if (!a.isOverdue && b.isOverdue) return 1;
    return a.dueDate.localeCompare(b.dueDate);
  });
}

/**
 * Filtered upcoming deadlines (due within 30 days or overdue)
 */
export function getUpcomingDeadlines(
  tasks: AtlasTask[],
  workItems: WorkItem[],
  goals: Goal[],
  date?: string,
): DeadlineItem[] {
  const today = date ?? todayISO();
  const allDeadlines = getAllDeadlines(tasks, workItems, goals, today);
  return allDeadlines.filter((item) => isDeadlineUpcoming(item.dueDate, today)).slice(0, 5);
}

/**
 * Filtered critical deadlines (due within 7 days or overdue)
 */
export function getCriticalDeadlines(
  tasks: AtlasTask[],
  workItems: WorkItem[],
  goals: Goal[],
  date?: string,
): DeadlineItem[] {
  const today = date ?? todayISO();
  const allDeadlines = getAllDeadlines(tasks, workItems, goals, today);
  return allDeadlines.filter((item) => isDeadlineCritical(item.dueDate, today)).slice(0, 5);
}

/**
 * Builds a priority briefing for the dashboard.
 */
export function getPriorityBriefing(
  tasks: AtlasTask[],
  workItems: WorkItem[],
  goals: Goal[],
  reviews: WeeklyReview[],
  savings?: SavingsState,
  baseCurrency?: Currency,
  exchangeRate?: number,
  date?: string,
): PriorityBriefing {
  const today = date ?? todayISO();

  // Top task for today (highest priority)
  const todayTasks = tasks.filter(
    (t) =>
      (t.plannedDate === today || t.status === "today" || t.status === "in_progress") &&
      t.status !== "completed" &&
      t.status !== "skipped",
  );
  const todayWorkItems = workItems.filter(
    (w) =>
      (w.plannedDate === today || w.deadline === today) &&
      w.status !== "completed" &&
      w.status !== "archived",
  );

  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const sortedTasks = [...todayTasks].sort(
    (a, b) => (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3),
  );
  const sortedWorkItems = [...todayWorkItems].sort(
    (a, b) => (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3),
  );

  let topTask: PriorityBriefing["topTask"] = null;
  if (sortedTasks.length > 0) {
    topTask = { title: sortedTasks[0].title, priority: sortedTasks[0].priority };
  } else if (sortedWorkItems.length > 0) {
    topTask = {
      title: sortedWorkItems[0].title,
      priority: sortedWorkItems[0].priority,
    };
  }

  // Next critical deadline (due within 7 days or overdue)
  const criticalDeadlines = getCriticalDeadlines(tasks, workItems, goals, today);
  const nextDeadline = criticalDeadlines.length > 0 ? criticalDeadlines[0] : null;

  // Top urgent goal (due within 7 days or overdue)
  const urgentGoals = goals.filter((g) => {
    if (g.status !== "active") return false;
    if (isDailyHabitGoal(g)) return false;
    if (!g.deadline) return false;
    const diff = daysBetween(today, g.deadline);
    return diff <= 7;
  });

  const sortedUrgentGoals = [...urgentGoals].sort((a, b) => {
    const diffA = daysBetween(today, a.deadline);
    const diffB = daysBetween(today, b.deadline);
    if (diffA < 0 && diffB >= 0) return -1;
    if (diffB < 0 && diffA >= 0) return 1;
    return a.deadline.localeCompare(b.deadline);
  });

  let topGoal: PriorityBriefing["topGoal"] = null;
  if (sortedUrgentGoals.length > 0) {
    topGoal = {
      title: sortedUrgentGoals[0].title,
      progress: getGoalProgress(
        sortedUrgentGoals[0],
        savings,
        baseCurrency,
        exchangeRate,
      ),
    };
  }

  // Weekly review status
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + mondayOffset);
  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const hasCurrentWeekReview = reviews.some(
    (r) => r.weekStart === weekStartStr,
  );
  const weeklyReviewStatus = hasCurrentWeekReview ? "Done" : "Pending";

  // Overdue count
  const overdueTasks = tasks.filter(
    (t) =>
      t.dueDate &&
      t.dueDate < today &&
      t.status !== "completed" &&
      t.status !== "skipped",
  ).length;
  const overdueWorkItems = workItems.filter(
    (w) =>
      w.deadline &&
      w.deadline < today &&
      w.status !== "completed" &&
      w.status !== "archived",
  ).length;

  return {
    topTask,
    nextDeadline,
    topGoal,
    weeklyReviewStatus,
    overdueCount: overdueTasks + overdueWorkItems,
  };
}

export function getCalendarEvents(
  tasks: AtlasTask[],
  workItems: WorkItem[],
  goals: Goal[],
  workouts: WorkoutLog[],
  dailyWraps: DailyWrap[],
  reviews: WeeklyReview[],
): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  // 1. General & Academic Tasks
  tasks.forEach((t) => {
    const date = t.plannedDate || t.dueDate;
    if (date) {
      events.push({
        id: t.id,
        title: t.title,
        date,
        type: "task",
        status: t.status,
        extraInfo: t.area,
      });
    }
  });

  // 2. Freelance Work Items
  workItems.forEach((w) => {
    const date = w.plannedDate || w.deadline;
    if (date) {
      events.push({
        id: w.id,
        title: w.title,
        date,
        type: "work_item",
        status: w.status,
        value: w.value,
        currency: w.currency,
        extraInfo: w.type,
      });
    }
  });

  // 3. Goal Deadlines
  goals.forEach((g) => {
    if (g.deadline && !isDailyHabitGoal(g)) {
      events.push({
        id: g.id,
        title: g.title,
        date: g.deadline,
        type: "goal",
        status: g.status,
        extraInfo: g.area,
      });
    }
  });

  // 4. Gym Workouts
  workouts.forEach((w) => {
    if (w.date) {
      events.push({
        id: w.id,
        title: `${w.workoutType} workout`,
        date: w.date,
        type: "workout",
        extraInfo: `${w.duration} mins`,
      });
    }
  });

  // 5. Daily Wraps
  dailyWraps.forEach((dw) => {
    if (dw.date) {
      events.push({
        id: dw.id,
        title: "Daily Wrap Reflection",
        date: dw.date,
        type: "daily_wrap",
        extraInfo: dw.mainTakeaway ?? "",
      });
    }
  });

  // 6. Weekly Reviews
  reviews.forEach((r) => {
    const date = r.createdAt?.slice(0, 10) || r.weekStart;
    if (date) {
      events.push({
        id: r.id,
        title: "Weekly Review Completed",
        date,
        type: "weekly_review",
        extraInfo: r.wins ?? "",
      });
    }
  });

  return events;
}
