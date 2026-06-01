"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { WorkoutDraft, WorkoutLog, WorkoutType } from "@/types/atlas";

const CLOUD_GYM_LOG_COLUMNS =
  "id,user_id,workout_date,workout_type,title,notes,duration_minutes,energy_score,intensity_score,intensity,exercises,is_rest_day,completed_at,created_at,updated_at,deleted_at";

const WORKOUT_TYPES: WorkoutType[] = [
  "Push",
  "Pull",
  "Legs",
  "Full Body",
  "Cardio",
  "Rest",
  "Other",
];

export type CloudGymLogRow = {
  id: string;
  user_id: string;
  workout_date: string;
  workout_type: string;
  title: string | null;
  notes: string;
  duration_minutes: number | null;
  energy_score: number | null;
  intensity_score: number | null;
  intensity: string | null;
  exercises: unknown[];
  is_rest_day: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type CloudGymLogInsert = {
  user_id: string;
  workout_date: string;
  workout_type: string;
  title: string | null;
  notes: string;
  duration_minutes: number | null;
  energy_score: number | null;
  intensity_score: number | null;
  intensity: string | null;
  exercises: unknown[];
  is_rest_day: boolean;
  completed_at: string | null;
};

export type CloudGymLogUpdate = Partial<
  Pick<
    CloudGymLogRow,
    | "workout_date"
    | "workout_type"
    | "title"
    | "notes"
    | "duration_minutes"
    | "energy_score"
    | "intensity_score"
    | "intensity"
    | "exercises"
    | "is_rest_day"
    | "completed_at"
    | "deleted_at"
  >
>;

export type CloudGymResult<T> =
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

type CloudGymContext =
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

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function sanitizeCloudGymError(message: string) {
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes("relation") ||
    lowerMessage.includes("schema cache") ||
    lowerMessage.includes("could not find")
  ) {
    return "Cloud gym table is not available yet. Run supabase/sql/005_gym.sql manually in Supabase.";
  }

  if (
    lowerMessage.includes("row-level security") ||
    lowerMessage.includes("permission denied") ||
    lowerMessage.includes("policy")
  ) {
    return "Cloud gym request was blocked by Supabase security policies.";
  }

  if (
    lowerMessage.includes("network") ||
    lowerMessage.includes("failed to fetch")
  ) {
    return "Cloud gym request failed because the network or Supabase connection is unavailable.";
  }

  if (lowerMessage.includes("check constraint")) {
    return "Cloud gym action failed because one field does not match the approved Gym schema.";
  }

  return "Cloud gym action failed. Check Supabase configuration and RLS policies.";
}

function isWorkoutType(value: unknown): value is WorkoutType {
  return (
    typeof value === "string" &&
    WORKOUT_TYPES.includes(value as WorkoutType)
  );
}

function normalizeScore(value: unknown, fallback: number) {
  const score = toNumberOrNull(value);

  if (score === null) {
    return fallback;
  }

  return Math.min(Math.max(Math.round(score), 1), 10);
}

function getIntensityDescriptor(intensity: number) {
  if (intensity >= 8) return "high";
  if (intensity >= 5) return "moderate";
  return "light";
}

function normalizeCloudGymLogRow(value: unknown): CloudGymLogRow | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = value.id;
  const userId = value.user_id;
  const workoutDate = value.workout_date;
  const workoutType = value.workout_type;
  const notes = value.notes;
  const isRestDay = value.is_rest_day;
  const createdAt = value.created_at;
  const updatedAt = value.updated_at;

  if (
    typeof id !== "string" ||
    typeof userId !== "string" ||
    typeof workoutDate !== "string" ||
    typeof workoutType !== "string" ||
    typeof notes !== "string" ||
    typeof isRestDay !== "boolean" ||
    typeof createdAt !== "string" ||
    typeof updatedAt !== "string"
  ) {
    return null;
  }

  return {
    id,
    user_id: userId,
    workout_date: workoutDate,
    workout_type: workoutType,
    title: typeof value.title === "string" ? value.title : null,
    notes,
    duration_minutes: toNumberOrNull(value.duration_minutes),
    energy_score: toNumberOrNull(value.energy_score),
    intensity_score: toNumberOrNull(value.intensity_score),
    intensity: typeof value.intensity === "string" ? value.intensity : null,
    exercises: Array.isArray(value.exercises) ? value.exercises : [],
    is_rest_day: isRestDay,
    completed_at:
      typeof value.completed_at === "string" ? value.completed_at : null,
    created_at: createdAt,
    updated_at: updatedAt,
    deleted_at:
      typeof value.deleted_at === "string" ? value.deleted_at : null,
  };
}

async function getCloudGymContext(): Promise<CloudGymContext> {
  const client = getSupabaseBrowserClient();

  if (!client) {
    return {
      ok: false,
      error: "Cloud gym is unavailable because Supabase is not configured.",
    };
  }

  const { data, error } = await client.auth.getSession();

  if (error) {
    return {
      ok: false,
      error: sanitizeCloudGymError(error.message),
    };
  }

  const userId = data.session?.user.id;

  if (!userId) {
    return {
      ok: false,
      error: "Sign in before using cloud gym logs.",
    };
  }

  return {
    ok: true,
    client,
    userId,
  };
}

export function mapCloudGymLogToAtlasGymLog(row: CloudGymLogRow): WorkoutLog {
  const workoutType = isWorkoutType(row.workout_type)
    ? row.workout_type
    : "Other";
  const isRest = workoutType === "Rest" || row.is_rest_day;

  return {
    id: row.id,
    date: row.workout_date,
    workoutType: isRest ? "Rest" : workoutType,
    duration: isRest ? 0 : row.duration_minutes ?? 0,
    energy: normalizeScore(row.energy_score, 5),
    intensity: normalizeScore(row.intensity_score, 5),
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export function mapAtlasGymLogToCloudInsert(
  workout: WorkoutLog | WorkoutDraft,
  userId: string,
): CloudGymLogInsert {
  const workoutType = workout.workoutType;
  const isRestDay = workoutType === "Rest";
  const duration = isRestDay ? 0 : Math.max(Math.round(workout.duration), 0);
  const energy = normalizeScore(workout.energy, 5);
  const intensity = normalizeScore(workout.intensity, 5);
  const completedAt =
    "createdAt" in workout && typeof workout.createdAt === "string"
      ? workout.createdAt
      : new Date().toISOString();

  return {
    user_id: userId,
    workout_date: workout.date || todayISO(),
    workout_type: workoutType,
    title: `${workoutType} workout`,
    notes: workout.notes.trim(),
    duration_minutes: duration,
    energy_score: energy,
    intensity_score: intensity,
    intensity: getIntensityDescriptor(intensity),
    exercises: [],
    is_rest_day: isRestDay,
    completed_at: completedAt,
  };
}

export async function listCloudGymLogs(): Promise<
  CloudGymResult<WorkoutLog[]>
> {
  const context = await getCloudGymContext();

  if (!context.ok) {
    return {
      ok: false,
      data: [],
      error: context.error,
    };
  }

  const { data, error } = await context.client
    .from("gym_logs")
    .select(CLOUD_GYM_LOG_COLUMNS)
    .eq("user_id", context.userId)
    .is("deleted_at", null)
    .order("workout_date", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) {
    return {
      ok: false,
      data: [],
      error: sanitizeCloudGymError(error.message),
    };
  }

  const workouts = Array.isArray(data)
    ? data
        .map(normalizeCloudGymLogRow)
        .filter((workout): workout is CloudGymLogRow => workout !== null)
        .map(mapCloudGymLogToAtlasGymLog)
    : [];

  return {
    ok: true,
    data: workouts,
    message: `Loaded ${workouts.length} cloud gym ${workouts.length === 1 ? "log" : "logs"}.`,
  };
}

export async function createCloudGymLog(
  workout: WorkoutLog | WorkoutDraft,
): Promise<CloudGymResult<WorkoutLog | null>> {
  const context = await getCloudGymContext();

  if (!context.ok) {
    return {
      ok: false,
      data: null,
      error: context.error,
    };
  }

  const insert = mapAtlasGymLogToCloudInsert(workout, context.userId);

  const { data, error } = await context.client
    .from("gym_logs")
    .insert(insert)
    .select(CLOUD_GYM_LOG_COLUMNS)
    .single();

  if (error) {
    return {
      ok: false,
      data: null,
      error: sanitizeCloudGymError(error.message),
    };
  }

  const row = normalizeCloudGymLogRow(data);

  if (!row) {
    return {
      ok: false,
      data: null,
      error:
        "Cloud gym log was created, but Atlas could not read the returned row.",
    };
  }

  return {
    ok: true,
    data: mapCloudGymLogToAtlasGymLog(row),
    message: "Created cloud gym log. Local gym logs were not changed.",
  };
}

export async function updateCloudGymLog(
  id: string,
  updates: Partial<WorkoutDraft>,
): Promise<CloudGymResult<WorkoutLog | null>> {
  const context = await getCloudGymContext();

  if (!context.ok) {
    return {
      ok: false,
      data: null,
      error: context.error,
    };
  }

  const update: CloudGymLogUpdate = {};

  if (typeof updates.date === "string") {
    update.workout_date = updates.date || todayISO();
  }

  if (typeof updates.workoutType === "string") {
    update.workout_type = updates.workoutType;
    update.is_rest_day = updates.workoutType === "Rest";
    update.title = `${updates.workoutType} workout`;
  }

  if (typeof updates.notes === "string") {
    update.notes = updates.notes.trim();
  }

  if (typeof updates.duration === "number") {
    update.duration_minutes = Math.max(Math.round(updates.duration), 0);
  }

  if (typeof updates.energy === "number") {
    update.energy_score = normalizeScore(updates.energy, 5);
  }

  if (typeof updates.intensity === "number") {
    const intensity = normalizeScore(updates.intensity, 5);
    update.intensity_score = intensity;
    update.intensity = getIntensityDescriptor(intensity);
  }

  const { data, error } = await context.client
    .from("gym_logs")
    .update(update)
    .eq("id", id)
    .eq("user_id", context.userId)
    .is("deleted_at", null)
    .select(CLOUD_GYM_LOG_COLUMNS)
    .single();

  if (error) {
    return {
      ok: false,
      data: null,
      error: sanitizeCloudGymError(error.message),
    };
  }

  const row = normalizeCloudGymLogRow(data);

  if (!row) {
    return {
      ok: false,
      data: null,
      error:
        "Cloud gym log updated, but Atlas could not read the returned row.",
    };
  }

  return {
    ok: true,
    data: mapCloudGymLogToAtlasGymLog(row),
    message: "Updated cloud gym log. Local gym logs were not changed.",
  };
}

export async function deleteCloudGymLog(
  id: string,
): Promise<CloudGymResult<null>> {
  const context = await getCloudGymContext();

  if (!context.ok) {
    return {
      ok: false,
      data: null,
      error: context.error,
    };
  }

  const { error } = await context.client
    .from("gym_logs")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", context.userId);

  if (error) {
    return {
      ok: false,
      data: null,
      error: sanitizeCloudGymError(error.message),
    };
  }

  return {
    ok: true,
    data: null,
    message: "Deleted cloud gym log. Local gym logs were not changed.",
  };
}
