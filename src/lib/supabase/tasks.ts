"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { calculateTaskXP } from "@/lib/tasks";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  AtlasTask,
  TaskArea,
  TaskDraft,
  TaskEnergy,
  TaskPriority,
  TaskStatus,
  TaskType,
} from "@/types/atlas";

const CLOUD_TASK_COLUMNS =
  "id,user_id,title,notes,area,task_type,priority,status,planned_date,due_date,estimated_minutes,energy_required,completed_at,skipped_at,created_at,updated_at,deleted_at";

const TASK_AREAS: TaskArea[] = [
  "Work",
  "Academic",
  "Personal",
  "Finance",
  "Fitness",
  "Atlas",
  "Content",
  "Other",
];

const TASK_TYPES: TaskType[] = [
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

const TASK_PRIORITIES: TaskPriority[] = [
  "low",
  "medium",
  "high",
  "critical",
];

const TASK_STATUSES: TaskStatus[] = [
  "backlog",
  "today",
  "in_progress",
  "completed",
  "skipped",
];

const TASK_ENERGY_LEVELS: TaskEnergy[] = ["low", "medium", "high"];

export type CloudTaskRow = {
  id: string;
  user_id: string;
  title: string;
  notes: string;
  area: string | null;
  task_type: string | null;
  priority: string | null;
  status: string;
  planned_date: string | null;
  due_date: string | null;
  estimated_minutes: number | null;
  energy_required: string | null;
  completed_at: string | null;
  skipped_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type CloudTaskInsert = {
  user_id: string;
  title: string;
  notes: string;
  area: string | null;
  task_type: string | null;
  priority: string | null;
  status: string;
  planned_date: string | null;
  due_date: string | null;
  estimated_minutes: number | null;
  energy_required: string | null;
  completed_at: string | null;
  skipped_at: string | null;
};

export type CloudTaskUpdate = Partial<
  Pick<
    CloudTaskRow,
    | "title"
    | "notes"
    | "area"
    | "task_type"
    | "priority"
    | "status"
    | "planned_date"
    | "due_date"
    | "estimated_minutes"
    | "energy_required"
    | "completed_at"
    | "skipped_at"
    | "deleted_at"
  >
>;

export type CloudTasksResult<T> =
  | {
      ok: true;
      data: T;
      message: string;
    }
  | {
      ok: false;
      data: T;
      error: string;
    };

type CloudTasksContext =
  | {
      ok: true;
      client: SupabaseClient;
      userId: string;
    }
  | {
      ok: false;
      error: string;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function sanitizeCloudTaskError(message: string) {
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes("relation") ||
    lowerMessage.includes("schema cache") ||
    lowerMessage.includes("could not find")
  ) {
    return "Cloud tasks table is not available yet. Run supabase/sql/002_tasks.sql manually in Supabase.";
  }

  if (
    lowerMessage.includes("row-level security") ||
    lowerMessage.includes("permission denied") ||
    lowerMessage.includes("policy")
  ) {
    return "Cloud tasks request was blocked by Supabase security policies.";
  }

  if (
    lowerMessage.includes("network") ||
    lowerMessage.includes("failed to fetch")
  ) {
    return "Cloud tasks request failed because the network or Supabase connection is unavailable.";
  }

  return "Cloud task action failed. Check Supabase configuration and RLS policies.";
}

function isTaskArea(value: unknown): value is TaskArea {
  return typeof value === "string" && TASK_AREAS.includes(value as TaskArea);
}

function isTaskType(value: unknown): value is TaskType {
  return typeof value === "string" && TASK_TYPES.includes(value as TaskType);
}

function isTaskPriority(value: unknown): value is TaskPriority {
  return (
    typeof value === "string" &&
    TASK_PRIORITIES.includes(value as TaskPriority)
  );
}

function isTaskStatus(value: unknown): value is TaskStatus {
  return (
    typeof value === "string" && TASK_STATUSES.includes(value as TaskStatus)
  );
}

function isTaskEnergy(value: unknown): value is TaskEnergy {
  return (
    typeof value === "string" &&
    TASK_ENERGY_LEVELS.includes(value as TaskEnergy)
  );
}

function normalizeCloudTaskRow(value: unknown): CloudTaskRow | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = value.id;
  const userId = value.user_id;
  const title = value.title;
  const notes = value.notes;
  const status = value.status;
  const createdAt = value.created_at;
  const updatedAt = value.updated_at;

  if (
    typeof id !== "string" ||
    typeof userId !== "string" ||
    typeof title !== "string" ||
    typeof notes !== "string" ||
    typeof status !== "string" ||
    typeof createdAt !== "string" ||
    typeof updatedAt !== "string"
  ) {
    return null;
  }

  return {
    id,
    user_id: userId,
    title,
    notes,
    area: typeof value.area === "string" ? value.area : null,
    task_type: typeof value.task_type === "string" ? value.task_type : null,
    priority: typeof value.priority === "string" ? value.priority : null,
    status,
    planned_date:
      typeof value.planned_date === "string" ? value.planned_date : null,
    due_date: typeof value.due_date === "string" ? value.due_date : null,
    estimated_minutes:
      typeof value.estimated_minutes === "number"
        ? value.estimated_minutes
        : null,
    energy_required:
      typeof value.energy_required === "string"
        ? value.energy_required
        : null,
    completed_at:
      typeof value.completed_at === "string" ? value.completed_at : null,
    skipped_at: typeof value.skipped_at === "string" ? value.skipped_at : null,
    created_at: createdAt,
    updated_at: updatedAt,
    deleted_at:
      typeof value.deleted_at === "string" ? value.deleted_at : null,
  };
}

async function getCloudTasksContext(): Promise<CloudTasksContext> {
  const client = getSupabaseBrowserClient();

  if (!client) {
    return {
      ok: false,
      error: "Cloud tasks are unavailable because Supabase is not configured.",
    };
  }

  const { data, error } = await client.auth.getSession();

  if (error) {
    return {
      ok: false,
      error: sanitizeCloudTaskError(error.message),
    };
  }

  const userId = data.session?.user.id;

  if (!userId) {
    return {
      ok: false,
      error: "Sign in before using cloud tasks.",
    };
  }

  return {
    ok: true,
    client,
    userId,
  };
}

export function mapCloudTaskToAtlasTask(row: CloudTaskRow): AtlasTask {
  const priority = isTaskPriority(row.priority) ? row.priority : "medium";
  const taskType = isTaskType(row.task_type) ? row.task_type : "Quick Task";
  const estimatedMinutes = row.estimated_minutes ?? 30;

  return {
    id: row.id,
    title: row.title,
    description: row.notes,
    area: isTaskArea(row.area) ? row.area : "Other",
    taskType,
    status: isTaskStatus(row.status) ? row.status : "backlog",
    priority,
    dueDate: row.due_date ?? "",
    plannedDate: row.planned_date ?? "",
    estimatedMinutes,
    energyRequired: isTaskEnergy(row.energy_required)
      ? row.energy_required
      : "medium",
    xpReward: calculateTaskXP({
      priority,
      estimatedMinutes,
      taskType,
    }),
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}

export function mapAtlasTaskToCloudInsert(
  task: AtlasTask | TaskDraft,
  userId: string,
): CloudTaskInsert {
  const status = "status" in task ? task.status : "backlog";
  const completedAt =
    "completedAt" in task && typeof task.completedAt === "string"
      ? task.completedAt
      : null;

  return {
    user_id: userId,
    title: task.title.trim() || "Untitled task",
    notes: task.description.trim(),
    area: task.area || null,
    task_type: task.taskType || null,
    priority: task.priority || null,
    status,
    planned_date: task.plannedDate || null,
    due_date: task.dueDate || null,
    estimated_minutes: task.estimatedMinutes || null,
    energy_required: task.energyRequired || null,
    completed_at: completedAt,
    skipped_at: status === "skipped" ? new Date().toISOString() : null,
  };
}

export async function listCloudTasks(): Promise<CloudTasksResult<AtlasTask[]>> {
  const context = await getCloudTasksContext();

  if (!context.ok) {
    return {
      ok: false,
      data: [],
      error: context.error,
    };
  }

  const { data, error } = await context.client
    .from("tasks")
    .select(CLOUD_TASK_COLUMNS)
    .eq("user_id", context.userId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  if (error) {
    return {
      ok: false,
      data: [],
      error: sanitizeCloudTaskError(error.message),
    };
  }

  const tasks = Array.isArray(data)
    ? data
        .map(normalizeCloudTaskRow)
        .filter((task): task is CloudTaskRow => task !== null)
        .map(mapCloudTaskToAtlasTask)
    : [];

  return {
    ok: true,
    data: tasks,
    message: `Loaded ${tasks.length} cloud ${tasks.length === 1 ? "task" : "tasks"}.`,
  };
}

export async function createCloudTask(
  task: AtlasTask | TaskDraft,
): Promise<CloudTasksResult<AtlasTask | null>> {
  const context = await getCloudTasksContext();

  if (!context.ok) {
    return {
      ok: false,
      data: null,
      error: context.error,
    };
  }

  const insert = mapAtlasTaskToCloudInsert(task, context.userId);

  const { data, error } = await context.client
    .from("tasks")
    .insert(insert)
    .select(CLOUD_TASK_COLUMNS)
    .single();

  if (error) {
    return {
      ok: false,
      data: null,
      error: sanitizeCloudTaskError(error.message),
    };
  }

  const row = normalizeCloudTaskRow(data);

  if (!row) {
    return {
      ok: false,
      data: null,
      error: "Cloud task was created, but Atlas could not read the returned row.",
    };
  }

  return {
    ok: true,
    data: mapCloudTaskToAtlasTask(row),
    message: "Created cloud task. Local tasks were not changed.",
  };
}

export async function updateCloudTask(
  id: string,
  updates: Partial<TaskDraft>,
): Promise<CloudTasksResult<AtlasTask | null>> {
  const context = await getCloudTasksContext();

  if (!context.ok) {
    return {
      ok: false,
      data: null,
      error: context.error,
    };
  }

  const update: CloudTaskUpdate = {};

  if (typeof updates.title === "string") {
    update.title = updates.title.trim() || "Untitled task";
  }

  if (typeof updates.description === "string") {
    update.notes = updates.description.trim();
  }

  if (typeof updates.area === "string") {
    update.area = updates.area || null;
  }

  if (typeof updates.taskType === "string") {
    update.task_type = updates.taskType || null;
  }

  if (typeof updates.priority === "string") {
    update.priority = updates.priority || null;
  }

  if (typeof updates.status === "string") {
    update.status = updates.status;
  }

  if (typeof updates.plannedDate === "string") {
    update.planned_date = updates.plannedDate || null;
  }

  if (typeof updates.dueDate === "string") {
    update.due_date = updates.dueDate || null;
  }

  if (typeof updates.estimatedMinutes === "number") {
    update.estimated_minutes = updates.estimatedMinutes;
  }

  if (typeof updates.energyRequired === "string") {
    update.energy_required = updates.energyRequired || null;
  }

  const { data, error } = await context.client
    .from("tasks")
    .update(update)
    .eq("id", id)
    .eq("user_id", context.userId)
    .is("deleted_at", null)
    .select(CLOUD_TASK_COLUMNS)
    .single();

  if (error) {
    return {
      ok: false,
      data: null,
      error: sanitizeCloudTaskError(error.message),
    };
  }

  const row = normalizeCloudTaskRow(data);

  if (!row) {
    return {
      ok: false,
      data: null,
      error: "Cloud task updated, but Atlas could not read the returned row.",
    };
  }

  return {
    ok: true,
    data: mapCloudTaskToAtlasTask(row),
    message: "Updated cloud task. Local tasks were not changed.",
  };
}

export async function deleteCloudTask(
  id: string,
): Promise<CloudTasksResult<null>> {
  const context = await getCloudTasksContext();

  if (!context.ok) {
    return {
      ok: false,
      data: null,
      error: context.error,
    };
  }

  const { error } = await context.client
    .from("tasks")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", context.userId);

  if (error) {
    return {
      ok: false,
      data: null,
      error: sanitizeCloudTaskError(error.message),
    };
  }

  return {
    ok: true,
    data: null,
    message: "Deleted cloud task. Local tasks were not changed.",
  };
}
