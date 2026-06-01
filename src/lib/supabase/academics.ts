"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { calculateTaskXP, todayISO } from "@/lib/tasks";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  AcademicTaskDraft,
  AcademicTaskType,
  AtlasTask,
  StudySession,
  StudySessionDraft,
  Subject,
  SubjectDraft,
  SubjectStatus,
  TaskEnergy,
  TaskPriority,
  TaskStatus,
  TaskType,
} from "@/types/atlas";

const CLOUD_SUBJECT_COLUMNS =
  "id,user_id,name,color,professor,schedule,notes,status,created_at,updated_at,deleted_at";

const CLOUD_ACADEMIC_TASK_COLUMNS =
  "id,user_id,subject_id,title,description,status,priority,due_date,planned_date,task_type,estimated_minutes,energy_required,grade,completed_at,created_at,updated_at,deleted_at";

const CLOUD_STUDY_SESSION_COLUMNS =
  "id,user_id,subject_id,title,notes,date,duration_minutes,focus_score,created_from,created_at,updated_at,deleted_at";

const SUBJECT_STATUSES: SubjectStatus[] = ["active", "archived"];
const TASK_STATUSES: TaskStatus[] = [
  "backlog",
  "today",
  "in_progress",
  "completed",
  "skipped",
];
const TASK_PRIORITIES: TaskPriority[] = [
  "low",
  "medium",
  "high",
  "critical",
];
const TASK_ENERGY_LEVELS: TaskEnergy[] = ["low", "medium", "high"];
const ACADEMIC_TYPES: AcademicTaskType[] = [
  "Assignment",
  "Exam",
  "Reading",
  "Project",
  "Presentation",
  "Practice",
  "Other",
];

export type CloudAcademicSubjectRow = {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
  professor: string | null;
  schedule: string | null;
  notes: string;
  status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type CloudAcademicTaskRow = {
  id: string;
  user_id: string;
  subject_id: string | null;
  title: string;
  description: string;
  status: string;
  priority: string | null;
  due_date: string | null;
  planned_date: string | null;
  task_type: string | null;
  estimated_minutes: number | null;
  energy_required: string | null;
  grade: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type CloudStudySessionRow = {
  id: string;
  user_id: string;
  subject_id: string | null;
  title: string | null;
  notes: string;
  date: string;
  duration_minutes: number | null;
  focus_score: number | null;
  created_from: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type CloudAcademicSubjectInsert = {
  user_id: string;
  name: string;
  color: string | null;
  professor: string | null;
  schedule: string | null;
  notes: string;
  status: string;
};

export type CloudAcademicTaskInsert = {
  user_id: string;
  subject_id: string | null;
  title: string;
  description: string;
  status: string;
  priority: string | null;
  due_date: string | null;
  planned_date: string | null;
  task_type: string | null;
  estimated_minutes: number | null;
  energy_required: string | null;
  grade: string | null;
  completed_at: string | null;
};

export type CloudStudySessionInsert = {
  user_id: string;
  subject_id: string | null;
  title: string | null;
  notes: string;
  date: string;
  duration_minutes: number | null;
  focus_score: number | null;
  created_from: string | null;
};

export type CloudAcademicSubjectUpdate = Partial<
  Pick<
    CloudAcademicSubjectRow,
    | "name"
    | "color"
    | "professor"
    | "schedule"
    | "notes"
    | "status"
    | "deleted_at"
  >
>;

export type CloudAcademicTaskUpdate = Partial<
  Pick<
    CloudAcademicTaskRow,
    | "subject_id"
    | "title"
    | "description"
    | "status"
    | "priority"
    | "due_date"
    | "planned_date"
    | "task_type"
    | "estimated_minutes"
    | "energy_required"
    | "grade"
    | "completed_at"
    | "deleted_at"
  >
>;

export type CloudStudySessionUpdate = Partial<
  Pick<
    CloudStudySessionRow,
    | "subject_id"
    | "title"
    | "notes"
    | "date"
    | "duration_minutes"
    | "focus_score"
    | "created_from"
    | "deleted_at"
  >
>;

export type CloudAcademicsResult<T> =
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

type CloudAcademicsContext =
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

function sanitizeCloudAcademicsError(message: string) {
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes("relation") ||
    lowerMessage.includes("schema cache") ||
    lowerMessage.includes("could not find")
  ) {
    return "Cloud academics tables are not available yet. Run supabase/sql/004_academics.sql manually in Supabase.";
  }

  if (
    lowerMessage.includes("row-level security") ||
    lowerMessage.includes("permission denied") ||
    lowerMessage.includes("policy")
  ) {
    return "Cloud academics request was blocked by Supabase security policies.";
  }

  if (
    lowerMessage.includes("subject_id") ||
    lowerMessage.includes("foreign key")
  ) {
    return "Cloud academic relation was rejected. The referenced cloud subject must belong to the signed-in user.";
  }

  if (
    lowerMessage.includes("network") ||
    lowerMessage.includes("failed to fetch")
  ) {
    return "Cloud academics request failed because the network or Supabase connection is unavailable.";
  }

  if (lowerMessage.includes("check constraint")) {
    return "Cloud academics action failed because one field does not match the approved Academics schema.";
  }

  return "Cloud academics action failed. Check Supabase configuration and RLS policies.";
}

function isSubjectStatus(value: unknown): value is SubjectStatus {
  return (
    typeof value === "string" &&
    SUBJECT_STATUSES.includes(value as SubjectStatus)
  );
}

function isTaskStatus(value: unknown): value is TaskStatus {
  return (
    typeof value === "string" && TASK_STATUSES.includes(value as TaskStatus)
  );
}

function isTaskPriority(value: unknown): value is TaskPriority {
  return (
    typeof value === "string" &&
    TASK_PRIORITIES.includes(value as TaskPriority)
  );
}

function isTaskEnergy(value: unknown): value is TaskEnergy {
  return (
    typeof value === "string" &&
    TASK_ENERGY_LEVELS.includes(value as TaskEnergy)
  );
}

function isAcademicType(value: unknown): value is AcademicTaskType {
  return (
    typeof value === "string" &&
    ACADEMIC_TYPES.includes(value as AcademicTaskType)
  );
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function normalizeSubjectId(value: string | undefined) {
  return value && isUuid(value) ? value : null;
}

function getAcademicTaskType(type: AcademicTaskType): TaskType {
  return type === "Exam" ? "Deep Work" : "University";
}

function normalizeCloudSubjectRow(value: unknown): CloudAcademicSubjectRow | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = value.id;
  const userId = value.user_id;
  const name = value.name;
  const notes = value.notes;
  const status = value.status;
  const createdAt = value.created_at;
  const updatedAt = value.updated_at;

  if (
    typeof id !== "string" ||
    typeof userId !== "string" ||
    typeof name !== "string" ||
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
    name,
    color: typeof value.color === "string" ? value.color : null,
    professor: typeof value.professor === "string" ? value.professor : null,
    schedule: typeof value.schedule === "string" ? value.schedule : null,
    notes,
    status,
    created_at: createdAt,
    updated_at: updatedAt,
    deleted_at:
      typeof value.deleted_at === "string" ? value.deleted_at : null,
  };
}

function normalizeCloudAcademicTaskRow(
  value: unknown,
): CloudAcademicTaskRow | null {
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
    subject_id: typeof value.subject_id === "string" ? value.subject_id : null,
    title,
    description,
    status,
    priority: typeof value.priority === "string" ? value.priority : null,
    due_date: typeof value.due_date === "string" ? value.due_date : null,
    planned_date:
      typeof value.planned_date === "string" ? value.planned_date : null,
    task_type: typeof value.task_type === "string" ? value.task_type : null,
    estimated_minutes: toNumberOrNull(value.estimated_minutes),
    energy_required:
      typeof value.energy_required === "string"
        ? value.energy_required
        : null,
    grade: typeof value.grade === "string" ? value.grade : null,
    completed_at:
      typeof value.completed_at === "string" ? value.completed_at : null,
    created_at: createdAt,
    updated_at: updatedAt,
    deleted_at:
      typeof value.deleted_at === "string" ? value.deleted_at : null,
  };
}

function normalizeCloudStudySessionRow(
  value: unknown,
): CloudStudySessionRow | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = value.id;
  const userId = value.user_id;
  const notes = value.notes;
  const date = value.date;
  const createdAt = value.created_at;
  const updatedAt = value.updated_at;

  if (
    typeof id !== "string" ||
    typeof userId !== "string" ||
    typeof notes !== "string" ||
    typeof date !== "string" ||
    typeof createdAt !== "string" ||
    typeof updatedAt !== "string"
  ) {
    return null;
  }

  return {
    id,
    user_id: userId,
    subject_id: typeof value.subject_id === "string" ? value.subject_id : null,
    title: typeof value.title === "string" ? value.title : null,
    notes,
    date,
    duration_minutes: toNumberOrNull(value.duration_minutes),
    focus_score: toNumberOrNull(value.focus_score),
    created_from:
      typeof value.created_from === "string" ? value.created_from : null,
    created_at: createdAt,
    updated_at: updatedAt,
    deleted_at:
      typeof value.deleted_at === "string" ? value.deleted_at : null,
  };
}

async function getCloudAcademicsContext(): Promise<CloudAcademicsContext> {
  const client = getSupabaseBrowserClient();

  if (!client) {
    return {
      ok: false,
      error:
        "Cloud academics are unavailable because Supabase is not configured.",
    };
  }

  const { data, error } = await client.auth.getSession();

  if (error) {
    return {
      ok: false,
      error: sanitizeCloudAcademicsError(error.message),
    };
  }

  const userId = data.session?.user.id;

  if (!userId) {
    return {
      ok: false,
      error: "Sign in before using cloud academics.",
    };
  }

  return {
    ok: true,
    client,
    userId,
  };
}

export function mapCloudSubjectToAtlasSubject(
  row: CloudAcademicSubjectRow,
): Subject {
  return {
    id: row.id,
    name: row.name,
    professor: row.professor ?? "",
    schedule: row.schedule ?? "",
    accent: row.color ?? "",
    status: isSubjectStatus(row.status) ? row.status : "active",
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export function mapAtlasSubjectToCloudInsert(
  subject: Subject | SubjectDraft,
  userId: string,
): CloudAcademicSubjectInsert {
  return {
    user_id: userId,
    name: subject.name.trim() || "Untitled subject",
    color: subject.accent?.trim() || null,
    professor: subject.professor?.trim() || null,
    schedule: subject.schedule?.trim() || null,
    notes: subject.notes?.trim() || "",
    status: "status" in subject ? subject.status : "active",
  };
}

export function mapCloudAcademicTaskToAtlasTask(
  row: CloudAcademicTaskRow,
): AtlasTask {
  const priority = isTaskPriority(row.priority) ? row.priority : "medium";
  const academicType = isAcademicType(row.task_type)
    ? row.task_type
    : "Other";
  const taskType = getAcademicTaskType(academicType);
  const estimatedMinutes = row.estimated_minutes ?? 45;

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    area: "Academic",
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
    subjectId: row.subject_id ?? "",
    academicType,
    grade: row.grade ?? "",
  };
}

export function mapAtlasAcademicTaskToCloudInsert(
  task: AtlasTask | AcademicTaskDraft,
  userId: string,
): CloudAcademicTaskInsert {
  const academicType = isAcademicType(task.academicType)
    ? task.academicType
    : "Other";
  const status = "status" in task ? task.status : "backlog";
  const completedAt =
    "completedAt" in task && typeof task.completedAt === "string"
      ? task.completedAt
      : null;
  const description = "description" in task ? task.description : task.notes;

  return {
    user_id: userId,
    subject_id: normalizeSubjectId(task.subjectId),
    title: task.title.trim() || "Untitled academic task",
    description: description.trim(),
    status,
    priority: task.priority || null,
    due_date: task.dueDate || null,
    planned_date: task.plannedDate || null,
    task_type: academicType,
    estimated_minutes: Number.isFinite(task.estimatedMinutes)
      ? task.estimatedMinutes
      : null,
    energy_required: task.energyRequired || null,
    grade: task.grade?.trim() || null,
    completed_at: completedAt,
  };
}

export function mapCloudStudySessionToAtlasSession(
  row: CloudStudySessionRow,
): StudySession {
  return {
    id: row.id,
    subjectId: row.subject_id ?? "",
    date: row.date,
    durationMinutes: row.duration_minutes ?? 0,
    focusLevel: row.focus_score ?? 5,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export function mapAtlasStudySessionToCloudInsert(
  session: StudySession | StudySessionDraft,
  userId: string,
): CloudStudySessionInsert {
  return {
    user_id: userId,
    subject_id: normalizeSubjectId(session.subjectId),
    title: "Study session",
    notes: session.notes?.trim() || "",
    date: session.date || todayISO(),
    duration_minutes: Number.isFinite(session.durationMinutes)
      ? session.durationMinutes
      : null,
    focus_score: Number.isFinite(session.focusLevel)
      ? session.focusLevel
      : null,
    created_from: "atlas-poc",
  };
}

export async function listCloudSubjects(): Promise<
  CloudAcademicsResult<Subject[]>
> {
  const context = await getCloudAcademicsContext();

  if (!context.ok) {
    return {
      ok: false,
      data: [],
      error: context.error,
    };
  }

  const { data, error } = await context.client
    .from("academic_subjects")
    .select(CLOUD_SUBJECT_COLUMNS)
    .eq("user_id", context.userId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  if (error) {
    return {
      ok: false,
      data: [],
      error: sanitizeCloudAcademicsError(error.message),
    };
  }

  const subjects = Array.isArray(data)
    ? data
        .map(normalizeCloudSubjectRow)
        .filter((subject): subject is CloudAcademicSubjectRow => subject !== null)
        .map(mapCloudSubjectToAtlasSubject)
    : [];

  return {
    ok: true,
    data: subjects,
    message: `Loaded ${subjects.length} cloud ${subjects.length === 1 ? "subject" : "subjects"}.`,
  };
}

export async function createCloudSubject(
  subject: Subject | SubjectDraft,
): Promise<CloudAcademicsResult<Subject | null>> {
  const context = await getCloudAcademicsContext();

  if (!context.ok) {
    return {
      ok: false,
      data: null,
      error: context.error,
    };
  }

  const insert = mapAtlasSubjectToCloudInsert(subject, context.userId);

  const { data, error } = await context.client
    .from("academic_subjects")
    .insert(insert)
    .select(CLOUD_SUBJECT_COLUMNS)
    .single();

  if (error) {
    return {
      ok: false,
      data: null,
      error: sanitizeCloudAcademicsError(error.message),
    };
  }

  const row = normalizeCloudSubjectRow(data);

  if (!row) {
    return {
      ok: false,
      data: null,
      error:
        "Cloud subject was created, but Atlas could not read the returned row.",
    };
  }

  return {
    ok: true,
    data: mapCloudSubjectToAtlasSubject(row),
    message: "Created cloud subject. Local academics were not changed.",
  };
}

export async function updateCloudSubject(
  id: string,
  updates: Partial<SubjectDraft> & { status?: SubjectStatus },
): Promise<CloudAcademicsResult<Subject | null>> {
  const context = await getCloudAcademicsContext();

  if (!context.ok) {
    return {
      ok: false,
      data: null,
      error: context.error,
    };
  }

  const update: CloudAcademicSubjectUpdate = {};

  if (typeof updates.name === "string") {
    update.name = updates.name.trim() || "Untitled subject";
  }

  if (typeof updates.accent === "string") {
    update.color = updates.accent.trim() || null;
  }

  if (typeof updates.professor === "string") {
    update.professor = updates.professor.trim() || null;
  }

  if (typeof updates.schedule === "string") {
    update.schedule = updates.schedule.trim() || null;
  }

  if (typeof updates.notes === "string") {
    update.notes = updates.notes.trim();
  }

  if (typeof updates.status === "string") {
    update.status = updates.status;
  }

  const { data, error } = await context.client
    .from("academic_subjects")
    .update(update)
    .eq("id", id)
    .eq("user_id", context.userId)
    .is("deleted_at", null)
    .select(CLOUD_SUBJECT_COLUMNS)
    .single();

  if (error) {
    return {
      ok: false,
      data: null,
      error: sanitizeCloudAcademicsError(error.message),
    };
  }

  const row = normalizeCloudSubjectRow(data);

  if (!row) {
    return {
      ok: false,
      data: null,
      error:
        "Cloud subject updated, but Atlas could not read the returned row.",
    };
  }

  return {
    ok: true,
    data: mapCloudSubjectToAtlasSubject(row),
    message: "Updated cloud subject. Local academics were not changed.",
  };
}

export async function deleteCloudSubject(
  id: string,
): Promise<CloudAcademicsResult<null>> {
  const context = await getCloudAcademicsContext();

  if (!context.ok) {
    return {
      ok: false,
      data: null,
      error: context.error,
    };
  }

  const { error } = await context.client
    .from("academic_subjects")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", context.userId);

  if (error) {
    return {
      ok: false,
      data: null,
      error: sanitizeCloudAcademicsError(error.message),
    };
  }

  return {
    ok: true,
    data: null,
    message: "Deleted cloud subject. Local academics were not changed.",
  };
}

export async function listCloudAcademicTasks(): Promise<
  CloudAcademicsResult<AtlasTask[]>
> {
  const context = await getCloudAcademicsContext();

  if (!context.ok) {
    return {
      ok: false,
      data: [],
      error: context.error,
    };
  }

  const { data, error } = await context.client
    .from("academic_tasks")
    .select(CLOUD_ACADEMIC_TASK_COLUMNS)
    .eq("user_id", context.userId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  if (error) {
    return {
      ok: false,
      data: [],
      error: sanitizeCloudAcademicsError(error.message),
    };
  }

  const tasks = Array.isArray(data)
    ? data
        .map(normalizeCloudAcademicTaskRow)
        .filter((task): task is CloudAcademicTaskRow => task !== null)
        .map(mapCloudAcademicTaskToAtlasTask)
    : [];

  return {
    ok: true,
    data: tasks,
    message: `Loaded ${tasks.length} cloud academic ${tasks.length === 1 ? "task" : "tasks"}.`,
  };
}

export async function createCloudAcademicTask(
  task: AtlasTask | AcademicTaskDraft,
): Promise<CloudAcademicsResult<AtlasTask | null>> {
  const context = await getCloudAcademicsContext();

  if (!context.ok) {
    return {
      ok: false,
      data: null,
      error: context.error,
    };
  }

  const insert = mapAtlasAcademicTaskToCloudInsert(task, context.userId);

  const { data, error } = await context.client
    .from("academic_tasks")
    .insert(insert)
    .select(CLOUD_ACADEMIC_TASK_COLUMNS)
    .single();

  if (error) {
    return {
      ok: false,
      data: null,
      error: sanitizeCloudAcademicsError(error.message),
    };
  }

  const row = normalizeCloudAcademicTaskRow(data);

  if (!row) {
    return {
      ok: false,
      data: null,
      error:
        "Cloud academic task was created, but Atlas could not read the returned row.",
    };
  }

  return {
    ok: true,
    data: mapCloudAcademicTaskToAtlasTask(row),
    message: "Created cloud academic task. Local academics were not changed.",
  };
}

export async function updateCloudAcademicTask(
  id: string,
  updates: Partial<AcademicTaskDraft> & {
    status?: TaskStatus;
    completedAt?: string | null;
  },
): Promise<CloudAcademicsResult<AtlasTask | null>> {
  const context = await getCloudAcademicsContext();

  if (!context.ok) {
    return {
      ok: false,
      data: null,
      error: context.error,
    };
  }

  const update: CloudAcademicTaskUpdate = {};

  if (typeof updates.subjectId === "string") {
    update.subject_id = normalizeSubjectId(updates.subjectId);
  }

  if (typeof updates.title === "string") {
    update.title = updates.title.trim() || "Untitled academic task";
  }

  if (typeof updates.notes === "string") {
    update.description = updates.notes.trim();
  }

  if (typeof updates.status === "string") {
    update.status = updates.status;
  }

  if (typeof updates.priority === "string") {
    update.priority = updates.priority;
  }

  if (typeof updates.dueDate === "string") {
    update.due_date = updates.dueDate || null;
  }

  if (typeof updates.plannedDate === "string") {
    update.planned_date = updates.plannedDate || null;
  }

  if (typeof updates.academicType === "string") {
    update.task_type = updates.academicType;
  }

  if (typeof updates.estimatedMinutes === "number") {
    update.estimated_minutes = updates.estimatedMinutes;
  }

  if (typeof updates.energyRequired === "string") {
    update.energy_required = updates.energyRequired;
  }

  if (typeof updates.grade === "string") {
    update.grade = updates.grade.trim() || null;
  }

  if ("completedAt" in updates) {
    update.completed_at = updates.completedAt ?? null;
  }

  const { data, error } = await context.client
    .from("academic_tasks")
    .update(update)
    .eq("id", id)
    .eq("user_id", context.userId)
    .is("deleted_at", null)
    .select(CLOUD_ACADEMIC_TASK_COLUMNS)
    .single();

  if (error) {
    return {
      ok: false,
      data: null,
      error: sanitizeCloudAcademicsError(error.message),
    };
  }

  const row = normalizeCloudAcademicTaskRow(data);

  if (!row) {
    return {
      ok: false,
      data: null,
      error:
        "Cloud academic task updated, but Atlas could not read the returned row.",
    };
  }

  return {
    ok: true,
    data: mapCloudAcademicTaskToAtlasTask(row),
    message: "Updated cloud academic task. Local academics were not changed.",
  };
}

export async function deleteCloudAcademicTask(
  id: string,
): Promise<CloudAcademicsResult<null>> {
  const context = await getCloudAcademicsContext();

  if (!context.ok) {
    return {
      ok: false,
      data: null,
      error: context.error,
    };
  }

  const { error } = await context.client
    .from("academic_tasks")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", context.userId);

  if (error) {
    return {
      ok: false,
      data: null,
      error: sanitizeCloudAcademicsError(error.message),
    };
  }

  return {
    ok: true,
    data: null,
    message: "Deleted cloud academic task. Local academics were not changed.",
  };
}

export async function listCloudStudySessions(): Promise<
  CloudAcademicsResult<StudySession[]>
> {
  const context = await getCloudAcademicsContext();

  if (!context.ok) {
    return {
      ok: false,
      data: [],
      error: context.error,
    };
  }

  const { data, error } = await context.client
    .from("study_sessions")
    .select(CLOUD_STUDY_SESSION_COLUMNS)
    .eq("user_id", context.userId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  if (error) {
    return {
      ok: false,
      data: [],
      error: sanitizeCloudAcademicsError(error.message),
    };
  }

  const sessions = Array.isArray(data)
    ? data
        .map(normalizeCloudStudySessionRow)
        .filter((session): session is CloudStudySessionRow => session !== null)
        .map(mapCloudStudySessionToAtlasSession)
    : [];

  return {
    ok: true,
    data: sessions,
    message: `Loaded ${sessions.length} cloud study ${sessions.length === 1 ? "session" : "sessions"}.`,
  };
}

export async function createCloudStudySession(
  session: StudySession | StudySessionDraft,
): Promise<CloudAcademicsResult<StudySession | null>> {
  const context = await getCloudAcademicsContext();

  if (!context.ok) {
    return {
      ok: false,
      data: null,
      error: context.error,
    };
  }

  const insert = mapAtlasStudySessionToCloudInsert(session, context.userId);

  const { data, error } = await context.client
    .from("study_sessions")
    .insert(insert)
    .select(CLOUD_STUDY_SESSION_COLUMNS)
    .single();

  if (error) {
    return {
      ok: false,
      data: null,
      error: sanitizeCloudAcademicsError(error.message),
    };
  }

  const row = normalizeCloudStudySessionRow(data);

  if (!row) {
    return {
      ok: false,
      data: null,
      error:
        "Cloud study session was created, but Atlas could not read the returned row.",
    };
  }

  return {
    ok: true,
    data: mapCloudStudySessionToAtlasSession(row),
    message: "Created cloud study session. Local academics were not changed.",
  };
}

export async function updateCloudStudySession(
  id: string,
  updates: Partial<StudySessionDraft>,
): Promise<CloudAcademicsResult<StudySession | null>> {
  const context = await getCloudAcademicsContext();

  if (!context.ok) {
    return {
      ok: false,
      data: null,
      error: context.error,
    };
  }

  const update: CloudStudySessionUpdate = {};

  if (typeof updates.subjectId === "string") {
    update.subject_id = normalizeSubjectId(updates.subjectId);
  }

  if (typeof updates.notes === "string") {
    update.notes = updates.notes.trim();
  }

  if (typeof updates.date === "string") {
    update.date = updates.date || todayISO();
  }

  if (typeof updates.durationMinutes === "number") {
    update.duration_minutes = updates.durationMinutes;
  }

  if (typeof updates.focusLevel === "number") {
    update.focus_score = updates.focusLevel;
  }

  const { data, error } = await context.client
    .from("study_sessions")
    .update(update)
    .eq("id", id)
    .eq("user_id", context.userId)
    .is("deleted_at", null)
    .select(CLOUD_STUDY_SESSION_COLUMNS)
    .single();

  if (error) {
    return {
      ok: false,
      data: null,
      error: sanitizeCloudAcademicsError(error.message),
    };
  }

  const row = normalizeCloudStudySessionRow(data);

  if (!row) {
    return {
      ok: false,
      data: null,
      error:
        "Cloud study session updated, but Atlas could not read the returned row.",
    };
  }

  return {
    ok: true,
    data: mapCloudStudySessionToAtlasSession(row),
    message: "Updated cloud study session. Local academics were not changed.",
  };
}

export async function deleteCloudStudySession(
  id: string,
): Promise<CloudAcademicsResult<null>> {
  const context = await getCloudAcademicsContext();

  if (!context.ok) {
    return {
      ok: false,
      data: null,
      error: context.error,
    };
  }

  const { error } = await context.client
    .from("study_sessions")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", context.userId);

  if (error) {
    return {
      ok: false,
      data: null,
      error: sanitizeCloudAcademicsError(error.message),
    };
  }

  return {
    ok: true,
    data: null,
    message: "Deleted cloud study session. Local academics were not changed.",
  };
}
