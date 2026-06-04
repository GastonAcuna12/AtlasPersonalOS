"use client";

import { useMemo } from "react";
import { t } from "@/lib/i18n";
import {
  ATLAS_STORAGE_KEYS,
  readFromStorage,
  useStoredValue,
  writeToStorage,
  todayISO,
} from "@/lib/storage";
export { todayISO };
import type {
  AtlasTask,
  AtlasSubtask,
  TaskArea,
  TaskDraft,
  TaskEnergy,
  TaskPriority,
  TaskSection,
  TaskType,
  DayMode,
  TaskRecurrence,
  RecurrenceFrequency,
} from "@/types/atlas";

export type {
  AcademicTaskType,
  AtlasTask,
  AtlasSubtask,
  TaskArea,
  TaskDraft,
  TaskEnergy,
  TaskPriority,
  TaskSection,
  TaskStatus,
  TaskType,
  TaskRecurrence,
  RecurrenceFrequency,
} from "@/types/atlas";

export const TASK_AREAS: TaskArea[] = [
  "Work",
  "Academic",
  "Personal",
  "Finance",
  "Fitness",
  "Atlas",
  "Content",
  "Other",
];

export const TASK_TYPES: TaskType[] = [
  "Deep Work",
  "Quick Task",
  "University",
  "Client Work",
  "Admin",
  "Creative",
  "Health",
  "Finance",
  "Errand",
  "Review",
];

export const TASK_PRIORITIES: TaskPriority[] = [
  "low",
  "medium",
  "high",
  "critical",
];

export const TASK_ENERGY_LEVELS: TaskEnergy[] = ["low", "medium", "high"];

const INITIAL_TASKS: AtlasTask[] = [];

export function normalizeTask(value: Partial<AtlasTask>): AtlasTask {
  const priority = value.priority ?? "medium";
  const estimatedMinutes = value.estimatedMinutes ?? 30;
  const taskType = value.taskType ?? "Quick Task";

  const rawSubtasks = Array.isArray(value.subtasks) ? value.subtasks : [];
  const subtasks = rawSubtasks
    .map((sub: Partial<AtlasSubtask>) => {
      const title = typeof sub?.title === "string" ? sub.title.trim() : "";
      return {
        id: sub?.id ?? `${Date.now()}-${Math.random()}-subtask`,
        title,
        completed: !!sub?.completed,
        createdAt: sub?.createdAt ?? new Date().toISOString(),
        completedAt: sub?.completed && sub?.completedAt ? sub.completedAt : undefined,
      };
    })
    .filter((sub) => sub.title.length > 0);

  return {
    id: value.id ?? `${Date.now()}-task`,
    title: value.title ?? "Untitled task",
    description: value.description ?? "",
    area: value.area ?? "Other",
    taskType,
    status: value.status ?? "backlog",
    priority,
    dueDate: value.dueDate ?? "",
    plannedDate: value.plannedDate ?? "",
    estimatedMinutes,
    energyRequired: value.energyRequired ?? "medium",
    xpReward:
      typeof value.xpReward === "number"
        ? value.xpReward
        : calculateTaskXP({ priority, estimatedMinutes, taskType }),
    createdAt: value.createdAt ?? new Date().toISOString(),
    completedAt: value.completedAt ?? null,
    subjectId: value.subjectId ?? "",
    academicType: value.academicType ?? undefined,
    grade: value.grade ?? "",
    scheduledTime: value.scheduledTime ?? "",
    completionNotes: value.completionNotes ?? "",
    subtasks,
    recurrence: normalizeTaskRecurrence(value.recurrence),
    seriesId: typeof value.seriesId === "string" && value.seriesId.trim().length > 0 ? value.seriesId.trim() : undefined,
  };
}

function normalizeTasks(value: unknown): AtlasTask[] {
  if (!Array.isArray(value)) {
    return INITIAL_TASKS;
  }

  return value.map((task) =>
    normalizeTask(
      task && typeof task === "object" ? (task as Partial<AtlasTask>) : {},
    ),
  );
}

function readTasks() {
  return readFromStorage(ATLAS_STORAGE_KEYS.tasks, INITIAL_TASKS, normalizeTasks);
}

function saveTasks(tasks: AtlasTask[]) {
  writeToStorage(ATLAS_STORAGE_KEYS.tasks, tasks);
}

export function calculateTaskXP(task: {
  priority: TaskPriority;
  estimatedMinutes: number;
  taskType: TaskType;
}) {
  const priorityXP: Record<TaskPriority, number> = {
    low: 5,
    medium: 10,
    high: 20,
    critical: 35,
  };
  let total = priorityXP[task.priority];

  if (task.estimatedMinutes >= 60) {
    total += 10;
  }

  if (task.taskType === "Deep Work") {
    total += 10;
  }

  return total;
}

export function buildTaskXPMessage(task: AtlasTask) {
  const priorityLabel = `${task.priority}-priority`;
  const longLabel = task.estimatedMinutes >= 60 ? " long" : "";
  const typeLabel = task.taskType === "Deep Work" ? " Deep Work" : "";

  return `Completed ${priorityLabel}${longLabel}${typeLabel} task`;
}

export function isTaskForToday(task: AtlasTask, date = todayISO()) {
  return (
    task.plannedDate === date ||
    task.dueDate === date ||
    task.status === "today" ||
    task.status === "in_progress"
  );
}

export function filterTodayTasks(tasks: AtlasTask[], date = todayISO()) {
  return tasks.filter(
    (task) => task.status !== "completed" && task.status !== "skipped" && isTaskForToday(task, date),
  );
}

export function identifyOverdueTasks(tasks: AtlasTask[], date = todayISO()) {
  return tasks.filter(
    (task) =>
      task.dueDate &&
      task.dueDate < date &&
      task.status !== "completed" &&
      task.status !== "skipped",
  );
}

export function getOverdueTasks(tasks: AtlasTask[], date = todayISO()) {
  return identifyOverdueTasks(tasks, date);
}

export function groupTasksBySection(tasks: AtlasTask[], date = todayISO()) {
  const todayTasks = filterTodayTasks(tasks, date);
  const backlogSuggestions = tasks
    .filter((task) => task.status === "backlog")
    .slice(0, 4);

  return {
    priorityFocus: todayTasks.filter(
      (task) =>
        task.priority === "critical" ||
        task.priority === "high" ||
        task.taskType === "Deep Work",
    ),
    quickWins: todayTasks.filter(
      (task) =>
        task.taskType === "Quick Task" ||
        task.estimatedMinutes <= 20 ||
        task.energyRequired === "low",
    ),
    academic: todayTasks.filter((task) => task.area === "Academic"),
    work: todayTasks.filter(
      (task) => task.area === "Work" || task.taskType === "Client Work",
    ),
    personal: todayTasks.filter((task) =>
      ["Personal", "Finance", "Fitness", "Atlas", "Content", "Other"].includes(
        task.area,
      ),
    ),
    backlog: backlogSuggestions,
  } satisfies Record<TaskSection, AtlasTask[]>;
}

export function groupTasksForToday(tasks: AtlasTask[], date = todayISO()) {
  return groupTasksBySection(tasks, date);
}

export type TodayGroupedV2 = {
  overdue: AtlasTask[];
  scheduled: AtlasTask[];
  priorityFocus: AtlasTask[];
  quickWins: AtlasTask[];
  remaining: AtlasTask[];
  backlog: AtlasTask[];
};

export function groupTasksTodayV2(tasks: AtlasTask[], date = todayISO(), dayMode?: DayMode): TodayGroupedV2 {
  const activeTasks = tasks.filter(t => t.status !== "completed" && t.status !== "skipped");
  
  const grouped: TodayGroupedV2 = {
    overdue: [],
    scheduled: [],
    priorityFocus: [],
    quickWins: [],
    remaining: [],
    backlog: []
  };

  const usedIds = new Set<string>();

  // 1. Overdue: dueDate < date OR plannedDate < date
  for (const t of activeTasks) {
    if ((t.dueDate && t.dueDate < date) || (t.plannedDate && t.plannedDate < date)) {
      grouped.overdue.push(t);
      usedIds.add(t.id);
    }
  }

  // 2. Scheduled: plannedDate === date and scheduledTime exists
  for (const t of activeTasks) {
    if (usedIds.has(t.id)) continue;
    if (t.plannedDate === date && t.scheduledTime) {
      grouped.scheduled.push(t);
      usedIds.add(t.id);
    }
  }

  // 3. Priority Focus: plannedDate === date and priority is high/critical OR dayMode === deep_work equivalent
  for (const t of activeTasks) {
    if (usedIds.has(t.id)) continue;
    if (
      t.plannedDate === date &&
      (t.priority === "high" || t.priority === "critical" || dayMode === "Work Sprint Day")
    ) {
      grouped.priorityFocus.push(t);
      usedIds.add(t.id);
    }
  }

  // 4. Quick Wins: plannedDate === date and estimatedMinutes <= 20 OR energy === "low"
  for (const t of activeTasks) {
    if (usedIds.has(t.id)) continue;
    if (
      t.plannedDate === date &&
      (t.estimatedMinutes <= 20 || t.energyRequired === "low")
    ) {
      grouped.quickWins.push(t);
      usedIds.add(t.id);
    }
  }

  // 5. Remaining: other tasks for today
  for (const t of activeTasks) {
    if (usedIds.has(t.id)) continue;
    if (t.plannedDate === date || t.dueDate === date || t.status === "today" || t.status === "in_progress") {
      grouped.remaining.push(t);
      usedIds.add(t.id);
    }
  }

  // 6. Backlog: status === "backlog", max 5
  const backlogCandidates = activeTasks.filter(t => !usedIds.has(t.id) && t.status === "backlog");
  grouped.backlog = backlogCandidates.slice(0, 5);

  // Sorting
  grouped.overdue.sort((a, b) => {
    const aDate = a.dueDate || a.plannedDate || "";
    const bDate = b.dueDate || b.plannedDate || "";
    return aDate.localeCompare(bDate);
  });
  
  grouped.scheduled.sort((a, b) => (a.scheduledTime || "").localeCompare(b.scheduledTime || ""));
  
  const priorityWeight: Record<TaskPriority, number> = { critical: 4, high: 3, medium: 2, low: 1 };
  grouped.priorityFocus.sort((a, b) => {
    const pDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
    if (pDiff !== 0) return pDiff;
    return a.estimatedMinutes - b.estimatedMinutes;
  });
  
  grouped.quickWins.sort((a, b) => a.estimatedMinutes - b.estimatedMinutes);
  grouped.remaining.sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority]);

  return grouped;
}

export function getDailyLoad(minutes: number) {
  if (minutes <= 120) {
    return "Light";
  }

  if (minutes <= 300) {
    return "Balanced";
  }

  if (minutes <= 480) {
    return "Heavy";
  }

  return "Overloaded";
}

export function calculateTodayStats(tasks: AtlasTask[], date = todayISO()) {
  const planned = tasks.filter((task) => isTaskForToday(task, date));
  const active = planned.filter(
    (task) => task.status !== "completed" && task.status !== "skipped",
  );
  const completedToday = tasks.filter(
    (task) => task.completedAt?.slice(0, 10) === date,
  );
  const estimatedMinutesRemaining = active.reduce(
    (sum, task) => sum + task.estimatedMinutes,
    0,
  );
  const xpAvailableToday = active.reduce((sum, task) => sum + task.xpReward, 0);

  return {
    plannedCount: planned.length,
    completedTodayCount: completedToday.length,
    estimatedMinutesRemaining,
    xpAvailableToday,
    dailyLoad: getDailyLoad(estimatedMinutesRemaining),
    completionPercentage:
      planned.length > 0
        ? Math.round((completedToday.length / planned.length) * 100)
        : 0,
  };
}

export function getThisWeekCompletedTasks(tasks: AtlasTask[], date = todayISO()) {
  const weekStart = new Date(date);
  const day = weekStart.getDay();
  weekStart.setDate(weekStart.getDate() + (day === 0 ? -6 : 1 - day));
  const weekStartISO = weekStart.toISOString().slice(0, 10);

  return tasks.filter((task) => {
    const completedDate = task.completedAt?.slice(0, 10);
    return completedDate && completedDate >= weekStartISO && completedDate <= date;
  });
}

export function calculateTaskDashboard(tasks: AtlasTask[], date = todayISO()) {
  const stats = calculateTodayStats(tasks, date);
  const todayTasks = filterTodayTasks(tasks, date)
    .sort((a, b) => b.xpReward - a.xpReward)
    .slice(0, 3);
  const completedThisWeek = getThisWeekCompletedTasks(tasks, date).length;

  return {
    ...stats,
    topTasks: todayTasks,
    overdueCount: getOverdueTasks(tasks, date).length,
    completedThisWeek,
  };
}

export function useTasks() {
  const tasks = useStoredValue(
    ATLAS_STORAGE_KEYS.tasks,
    INITIAL_TASKS,
    normalizeTasks,
  );
  const sortedTasks = useMemo(
    () => [...tasks].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [tasks],
  );

  function addTask(draft: TaskDraft) {
    const task = normalizeTask({
      ...draft,
      id: `${Date.now()}-task`,
      xpReward: calculateTaskXP(draft),
      createdAt: new Date().toISOString(),
      completedAt: null,
    });

    saveTasks([task, ...readTasks()]);
    return task;
  }

  function updateTask(id: string, changes: Partial<AtlasTask>) {
    saveTasks(
      readTasks().map((task) =>
        task.id === id
          ? normalizeTask({
              ...task,
              ...changes,
              xpReward: calculateTaskXP({
                priority: changes.priority ?? task.priority,
                estimatedMinutes:
                  changes.estimatedMinutes ?? task.estimatedMinutes,
                taskType: changes.taskType ?? task.taskType,
              }),
            })
          : task,
      ),
    );
  }

  function deleteTask(id: string) {
    saveTasks(readTasks().filter((task) => task.id !== id));
  }

  return {
    tasks: sortedTasks,
    addTask,
    updateTask,
    deleteTask,
  };
}

// --- Daily Planning ---

import type { DailyPlanRecord, DailyPlanStatus } from "@/types/atlas";

const INITIAL_DAILY_PLANS: DailyPlanRecord[] = [];

function normalizeDailyPlans(value: unknown): DailyPlanRecord[] {
  if (!Array.isArray(value)) return INITIAL_DAILY_PLANS;
  return value.map((record) => {
    const candidate =
      record && typeof record === "object"
        ? (record as Partial<DailyPlanRecord>)
        : {};
    return {
      date: candidate.date ?? "",
      status: (
        ["not_planned", "planned", "in_progress", "completed"] as DailyPlanStatus[]
      ).includes(candidate.status as DailyPlanStatus)
        ? (candidate.status as DailyPlanStatus)
        : "not_planned",
      completedAt: candidate.completedAt ?? undefined,
    };
  });
}

function readDailyPlans() {
  return readFromStorage(
    ATLAS_STORAGE_KEYS.dailyPlans,
    INITIAL_DAILY_PLANS,
    normalizeDailyPlans,
  );
}

/**
 * Derives the daily planning status from task state.
 */
export function derivePlanStatus(
  tasks: AtlasTask[],
  date = todayISO(),
): DailyPlanStatus {
  const todayTasks = tasks.filter((t) => isTaskForToday(t, date));
  if (todayTasks.length === 0) return "not_planned";

  const completed = todayTasks.filter(
    (t) => t.status === "completed" || t.status === "skipped",
  );
  const inProgress = todayTasks.filter((t) => t.status === "in_progress");

  if (completed.length === todayTasks.length) return "completed";
  if (inProgress.length > 0 || completed.length > 0) return "in_progress";
  return "planned";
}

export function useDailyPlan() {
  const plans = useStoredValue(
    ATLAS_STORAGE_KEYS.dailyPlans,
    INITIAL_DAILY_PLANS,
    normalizeDailyPlans,
  );

  const today = todayISO();
  const todayPlan = plans.find((p) => p.date === today);
  const isCompletedToday = todayPlan?.status === "completed";

  function completeDailyPlanning(): boolean {
    if (isCompletedToday) return false;

    const current = readDailyPlans();
    const existing = current.findIndex((p) => p.date === today);
    const record: DailyPlanRecord = {
      date: today,
      status: "completed",
      completedAt: new Date().toISOString(),
    };

    if (existing >= 0) {
      current[existing] = record;
    } else {
      current.push(record);
    }

    // Keep only last 30 days of records
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    const pruned = current.filter((p) => p.date >= cutoffStr);

    writeToStorage(ATLAS_STORAGE_KEYS.dailyPlans, pruned);
    return true;
  }

  return {
    plans,
    todayPlan,
    isCompletedToday,
    completeDailyPlanning,
  };
}

// ==========================================
// Recurring Tasks Foundation Helpers
// ==========================================

function parseDateUTC(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDateUTC(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getUTCMonday(date: Date): Date {
  const d = new Date(date.getTime());
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function normalizeTaskRecurrence(rec: unknown): TaskRecurrence | undefined {
  if (!rec || typeof rec !== "object" || Array.isArray(rec)) {
    return undefined;
  }

  const typedRec = rec as Record<string, unknown>;
  const frequency = typedRec.frequency;
  if (frequency !== "daily" && frequency !== "weekly" && frequency !== "monthly") {
    return undefined;
  }

  let interval = typeof typedRec.interval === "number" ? Math.floor(typedRec.interval) : 1;
  if (interval < 1) {
    interval = 1;
  }

  let daysOfWeek: number[] | undefined = undefined;
  if (Array.isArray(typedRec.daysOfWeek)) {
    const validDays = typedRec.daysOfWeek
      .map(d => typeof d === "number" ? Math.floor(d) : parseInt(String(d), 10))
      .filter(d => !isNaN(d) && d >= 0 && d <= 6);
    
    const uniqueDays = Array.from(new Set(validDays)).sort();
    if (uniqueDays.length > 0) {
      daysOfWeek = uniqueDays;
    }
  }

  let endDate: string | undefined = undefined;
  if (typeof typedRec.endDate === "string") {
    const isYmd = /^\d{4}-\d{2}-\d{2}$/.test(typedRec.endDate);
    if (isYmd) {
      endDate = typedRec.endDate;
    }
  }

  return {
    frequency: frequency as RecurrenceFrequency,
    interval,
    ...(daysOfWeek ? { daysOfWeek } : {}),
    ...(endDate ? { endDate } : {}),
  };
}

export function calculateNextOccurrenceDate(currentDateStr: string, recurrence: TaskRecurrence): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(currentDateStr)) {
    return null;
  }

  const current = parseDateUTC(currentDateStr);
  const frequency = recurrence.frequency;
  const interval = recurrence.interval ?? 1;

  if (frequency === "daily") {
    current.setUTCDate(current.getUTCDate() + interval);
  } else if (frequency === "weekly") {
    if (recurrence.daysOfWeek && recurrence.daysOfWeek.length > 0) {
      const days = recurrence.daysOfWeek;
      const startMonday = getUTCMonday(parseDateUTC(currentDateStr));
      let found = false;
      const iterationCap = 366 * 2; // Up to 2 years safety limit
      
      for (let i = 1; i <= iterationCap; i++) {
        current.setUTCDate(current.getUTCDate() + 1);
        const dayOfWeek = current.getUTCDay();
        if (days.includes(dayOfWeek)) {
          const currentMonday = getUTCMonday(current);
          const elapsedMs = currentMonday.getTime() - startMonday.getTime();
          const elapsedWeeks = Math.round(elapsedMs / (7 * 24 * 60 * 60 * 1000));
          
          if (elapsedWeeks >= 0 && elapsedWeeks % interval === 0) {
            found = true;
            break;
          }
        }
      }
      
      if (!found) {
        return null;
      }
    } else {
      current.setUTCDate(current.getUTCDate() + 7 * interval);
    }
  } else if (frequency === "monthly") {
    const targetDay = current.getUTCDate();
    current.setUTCMonth(current.getUTCMonth() + interval);
    if (current.getUTCDate() !== targetDay) {
      current.setUTCDate(0); // Rollback to last day of target month
    }
  } else {
    return null;
  }

  const nextDateStr = formatDateUTC(current);

  if (recurrence.endDate && nextDateStr > recurrence.endDate) {
    return null;
  }

  return nextDateStr;
}

export function getRecurrenceLabel(
  rec: TaskRecurrence | undefined,
  language: string
): string {
  if (!rec || !rec.frequency) {
    return "";
  }

  const freq = rec.frequency;
  const interval = rec.interval ?? 1;
  const isEs = language.toLowerCase().startsWith("es");

  if (freq === "daily") {
    if (interval === 1) {
      return t(language, "task.recurrence.repeatsDaily", "Repeats daily");
    }
    const repeatsEvery = t(language, "task.recurrence.interval", "Repeat every");
    const unit = t(language, "task.recurrence.days", "days");
    return isEs
      ? `Se repite cada ${interval} días`
      : `${repeatsEvery} ${interval} ${unit}`;
  }

  if (freq === "weekly") {
    let dayStr = "";
    if (rec.daysOfWeek && rec.daysOfWeek.length > 0) {
      const dayNamesEn = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const dayNamesEs = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
      const names = rec.daysOfWeek.map((d) => (isEs ? dayNamesEs[d] : dayNamesEn[d]));
      dayStr = isEs ? ` los ${names.join(", ")}` : ` on ${names.join(", ")}`;
    }

    if (interval === 1) {
      const label = t(language, "task.recurrence.repeatsWeekly", "Repeats weekly");
      return `${label}${dayStr}`;
    }
    const repeatsEvery = t(language, "task.recurrence.interval", "Repeat every");
    const unit = t(language, "task.recurrence.weeks", "weeks");
    return isEs
      ? `Se repite cada ${interval} semanas${dayStr}`
      : `${repeatsEvery} ${interval} ${unit}${dayStr}`;
  }

  if (freq === "monthly") {
    if (interval === 1) {
      return t(language, "task.recurrence.repeatsMonthly", "Repeats monthly");
    }
    const repeatsEvery = t(language, "task.recurrence.interval", "Repeat every");
    const unit = t(language, "task.recurrence.months", "months");
    return isEs
      ? `Se repite cada ${interval} meses`
      : `${repeatsEvery} ${interval} ${unit}`;
  }

  return "";
}
