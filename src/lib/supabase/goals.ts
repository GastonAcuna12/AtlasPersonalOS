"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Currency, Goal, GoalDraft, GoalStatus } from "@/types/atlas";

const CLOUD_GOAL_COLUMNS =
  "id,user_id,title,description,area,goal_type,status,priority,current_value,target_value,unit,currency,deadline,linked_metric,linked_source,progress,completed_at,created_at,updated_at,deleted_at";

const GOAL_STATUSES: GoalStatus[] = ["active", "completed", "paused"];
const CURRENCIES: Currency[] = ["PYG", "USD"];
const LINKED_METRICS: Array<NonNullable<Goal["linkedFinanceMetric"]>> = [
  "none",
  "savings",
];

export type CloudGoalRow = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  area: string | null;
  goal_type: string | null;
  status: string;
  priority: string | null;
  current_value: number | null;
  target_value: number | null;
  unit: string | null;
  currency: string | null;
  deadline: string | null;
  linked_metric: string | null;
  linked_source: string | null;
  progress: number | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type CloudGoalInsert = {
  user_id: string;
  title: string;
  description: string;
  area: string | null;
  goal_type: string | null;
  status: string;
  priority: string | null;
  current_value: number | null;
  target_value: number | null;
  unit: string | null;
  currency: string | null;
  deadline: string | null;
  linked_metric: string | null;
  linked_source: string | null;
  progress: number | null;
  completed_at: string | null;
};

export type CloudGoalUpdate = Partial<
  Pick<
    CloudGoalRow,
    | "title"
    | "description"
    | "area"
    | "goal_type"
    | "status"
    | "priority"
    | "current_value"
    | "target_value"
    | "unit"
    | "currency"
    | "deadline"
    | "linked_metric"
    | "linked_source"
    | "progress"
    | "completed_at"
    | "deleted_at"
  >
>;

export type CloudGoalsResult<T> =
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

type CloudGoalsContext =
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

function toNumberOrNull(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function sanitizeCloudGoalError(message: string) {
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes("relation") ||
    lowerMessage.includes("schema cache") ||
    lowerMessage.includes("could not find")
  ) {
    return "Cloud goals table is not available yet. Run supabase/sql/003_goals.sql manually in Supabase.";
  }

  if (
    lowerMessage.includes("row-level security") ||
    lowerMessage.includes("permission denied") ||
    lowerMessage.includes("policy")
  ) {
    return "Cloud goals request was blocked by Supabase security policies.";
  }

  if (
    lowerMessage.includes("network") ||
    lowerMessage.includes("failed to fetch")
  ) {
    return "Cloud goals request failed because the network or Supabase connection is unavailable.";
  }

  if (lowerMessage.includes("check constraint")) {
    return "Cloud goal action failed because one field does not match the approved Goals schema.";
  }

  return "Cloud goal action failed. Check Supabase configuration and RLS policies.";
}

function isGoalStatus(value: unknown): value is GoalStatus {
  return (
    typeof value === "string" && GOAL_STATUSES.includes(value as GoalStatus)
  );
}

function isCurrency(value: unknown): value is Currency {
  return typeof value === "string" && CURRENCIES.includes(value as Currency);
}

function isLinkedMetric(
  value: unknown,
): value is NonNullable<Goal["linkedFinanceMetric"]> {
  return (
    typeof value === "string" &&
    LINKED_METRICS.includes(
      value as NonNullable<Goal["linkedFinanceMetric"]>,
    )
  );
}

function normalizeCloudGoalRow(value: unknown): CloudGoalRow | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = value.id;
  const userId = value.user_id;
  const title = value.title;
  const description = value.description;
  const status = value.status;
  const createdAt = value.created_at;
  const updatedAt = value.updated_at;

  if (
    typeof id !== "string" ||
    typeof userId !== "string" ||
    typeof title !== "string" ||
    typeof description !== "string" ||
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
    description,
    area: typeof value.area === "string" ? value.area : null,
    goal_type: typeof value.goal_type === "string" ? value.goal_type : null,
    status,
    priority: typeof value.priority === "string" ? value.priority : null,
    current_value: toNumberOrNull(value.current_value),
    target_value: toNumberOrNull(value.target_value),
    unit: typeof value.unit === "string" ? value.unit : null,
    currency: typeof value.currency === "string" ? value.currency : null,
    deadline: typeof value.deadline === "string" ? value.deadline : null,
    linked_metric:
      typeof value.linked_metric === "string" ? value.linked_metric : null,
    linked_source:
      typeof value.linked_source === "string" ? value.linked_source : null,
    progress: toNumberOrNull(value.progress),
    completed_at:
      typeof value.completed_at === "string" ? value.completed_at : null,
    created_at: createdAt,
    updated_at: updatedAt,
    deleted_at:
      typeof value.deleted_at === "string" ? value.deleted_at : null,
  };
}

async function getCloudGoalsContext(): Promise<CloudGoalsContext> {
  const client = getSupabaseBrowserClient();

  if (!client) {
    return {
      ok: false,
      error: "Cloud goals are unavailable because Supabase is not configured.",
    };
  }

  const { data, error } = await client.auth.getSession();

  if (error) {
    return {
      ok: false,
      error: sanitizeCloudGoalError(error.message),
    };
  }

  const userId = data.session?.user.id;

  if (!userId) {
    return {
      ok: false,
      error: "Sign in before using cloud goals.",
    };
  }

  return {
    ok: true,
    client,
    userId,
  };
}

function getCloudProgress(goal: Goal | GoalDraft) {
  if (goal.linkedFinanceMetric === "savings" || goal.targetValue <= 0) {
    return null;
  }

  return Math.min(
    Math.max(Math.round((goal.currentValue / goal.targetValue) * 100), 0),
    100,
  );
}

export function mapCloudGoalToAtlasGoal(row: CloudGoalRow): Goal {
  return {
    id: row.id,
    title: row.title,
    area: row.area ?? "Personal",
    status: isGoalStatus(row.status) ? row.status : "active",
    currentValue: row.current_value ?? 0,
    targetValue: row.target_value ?? 100,
    deadline: row.deadline ?? "",
    notes: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    linkedFinanceMetric: isLinkedMetric(row.linked_metric)
      ? row.linked_metric
      : "none",
    currency: isCurrency(row.currency) ? row.currency : "PYG",
    unit: row.unit ?? "",
  };
}

export function mapAtlasGoalToCloudInsert(
  goal: Goal | GoalDraft,
  userId: string,
): CloudGoalInsert {
  const status = goal.status;
  const progress = getCloudProgress(goal);
  const completedAt =
    status === "completed" && "updatedAt" in goal
      ? goal.updatedAt
      : status === "completed"
        ? new Date().toISOString()
        : null;

  return {
    user_id: userId,
    title: goal.title.trim() || "Untitled goal",
    description: goal.notes.trim(),
    area: goal.area.trim() || null,
    goal_type: null,
    status,
    priority: null,
    current_value: Number.isFinite(goal.currentValue)
      ? goal.currentValue
      : null,
    target_value: Number.isFinite(goal.targetValue) ? goal.targetValue : null,
    unit: goal.unit?.trim() || null,
    currency: goal.currency ?? null,
    deadline: goal.deadline || null,
    linked_metric: goal.linkedFinanceMetric ?? "none",
    linked_source: null,
    progress,
    completed_at: completedAt,
  };
}

export async function listCloudGoals(): Promise<CloudGoalsResult<Goal[]>> {
  const context = await getCloudGoalsContext();

  if (!context.ok) {
    return {
      ok: false,
      data: [],
      error: context.error,
    };
  }

  const { data, error } = await context.client
    .from("goals")
    .select(CLOUD_GOAL_COLUMNS)
    .eq("user_id", context.userId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  if (error) {
    return {
      ok: false,
      data: [],
      error: sanitizeCloudGoalError(error.message),
    };
  }

  const goals = Array.isArray(data)
    ? data
        .map(normalizeCloudGoalRow)
        .filter((goal): goal is CloudGoalRow => goal !== null)
        .map(mapCloudGoalToAtlasGoal)
    : [];

  return {
    ok: true,
    data: goals,
    message: `Loaded ${goals.length} cloud ${goals.length === 1 ? "goal" : "goals"}.`,
  };
}

export async function createCloudGoal(
  goal: Goal | GoalDraft,
): Promise<CloudGoalsResult<Goal | null>> {
  const context = await getCloudGoalsContext();

  if (!context.ok) {
    return {
      ok: false,
      data: null,
      error: context.error,
    };
  }

  const insert = mapAtlasGoalToCloudInsert(goal, context.userId);

  const { data, error } = await context.client
    .from("goals")
    .insert(insert)
    .select(CLOUD_GOAL_COLUMNS)
    .single();

  if (error) {
    return {
      ok: false,
      data: null,
      error: sanitizeCloudGoalError(error.message),
    };
  }

  const row = normalizeCloudGoalRow(data);

  if (!row) {
    return {
      ok: false,
      data: null,
      error: "Cloud goal was created, but Atlas could not read the returned row.",
    };
  }

  return {
    ok: true,
    data: mapCloudGoalToAtlasGoal(row),
    message: "Created cloud goal. Local goals were not changed.",
  };
}

export async function updateCloudGoal(
  id: string,
  updates: Partial<GoalDraft>,
): Promise<CloudGoalsResult<Goal | null>> {
  const context = await getCloudGoalsContext();

  if (!context.ok) {
    return {
      ok: false,
      data: null,
      error: context.error,
    };
  }

  const update: CloudGoalUpdate = {};

  if (typeof updates.title === "string") {
    update.title = updates.title.trim() || "Untitled goal";
  }

  if (typeof updates.notes === "string") {
    update.description = updates.notes.trim();
  }

  if (typeof updates.area === "string") {
    update.area = updates.area.trim() || null;
  }

  if (typeof updates.status === "string") {
    update.status = updates.status;
    update.completed_at =
      updates.status === "completed" ? new Date().toISOString() : null;
  }

  if (typeof updates.currentValue === "number") {
    update.current_value = updates.currentValue;
  }

  if (typeof updates.targetValue === "number") {
    update.target_value = updates.targetValue;
  }

  if (typeof updates.unit === "string") {
    update.unit = updates.unit.trim() || null;
  }

  if (typeof updates.currency === "string") {
    update.currency = updates.currency;
  }

  if (typeof updates.deadline === "string") {
    update.deadline = updates.deadline || null;
  }

  if (typeof updates.linkedFinanceMetric === "string") {
    update.linked_metric = updates.linkedFinanceMetric;
    update.linked_source = null;
  }

  const { data, error } = await context.client
    .from("goals")
    .update(update)
    .eq("id", id)
    .eq("user_id", context.userId)
    .is("deleted_at", null)
    .select(CLOUD_GOAL_COLUMNS)
    .single();

  if (error) {
    return {
      ok: false,
      data: null,
      error: sanitizeCloudGoalError(error.message),
    };
  }

  const row = normalizeCloudGoalRow(data);

  if (!row) {
    return {
      ok: false,
      data: null,
      error: "Cloud goal updated, but Atlas could not read the returned row.",
    };
  }

  return {
    ok: true,
    data: mapCloudGoalToAtlasGoal(row),
    message: "Updated cloud goal. Local goals were not changed.",
  };
}

export async function deleteCloudGoal(
  id: string,
): Promise<CloudGoalsResult<null>> {
  const context = await getCloudGoalsContext();

  if (!context.ok) {
    return {
      ok: false,
      data: null,
      error: context.error,
    };
  }

  const { error } = await context.client
    .from("goals")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", context.userId);

  if (error) {
    return {
      ok: false,
      data: null,
      error: sanitizeCloudGoalError(error.message),
    };
  }

  return {
    ok: true,
    data: null,
    message: "Deleted cloud goal. Local goals were not changed.",
  };
}
