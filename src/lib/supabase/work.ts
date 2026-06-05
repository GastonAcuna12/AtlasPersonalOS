"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  BillingType,
  Client,
  ClientDraft,
  ClientStatus,
  ClientType,
  Currency,
  Difficulty,
  TaskPriority,
  WorkItem,
  WorkItemDraft,
  WorkItemStatus,
  WorkItemType,
} from "@/types/atlas";

const CLOUD_CLIENT_COLUMNS =
  "id,user_id,name,client_type,status,difficulty,billing_mode,default_rate,hourly_rate,fixed_monthly_amount,currency,contact_name,contact_email,notes,is_active,created_at,updated_at,deleted_at";

const CLOUD_WORK_ITEM_COLUMNS =
  "id,user_id,client_id,title,description,status,priority,difficulty,item_type,estimated_minutes,actual_minutes,value,currency,planned_date,deadline,completed_at,reference_url,internal_notes,created_at,updated_at,deleted_at";

const CLIENT_TYPES: ClientType[] = [
  "Agency",
  "Direct Client",
  "Freelance Platform",
  "Personal Project",
  "Other",
];

const CLIENT_STATUSES: ClientStatus[] = ["active", "paused", "archived"];
const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard", "intense"];
const BILLING_TYPES: BillingType[] = [
  "per_item",
  "fixed_monthly",
  "hourly",
  "non_billable",
];
const CURRENCIES: Currency[] = ["PYG", "USD"];
const WORK_ITEM_TYPES: WorkItemType[] = [
  "Video",
  "Resize",
  "Motion",
  "B-roll",
  "Design",
  "Revision",
  "Admin",
  "Other",
];
const WORK_ITEM_STATUSES: WorkItemStatus[] = [
  "backlog",
  "planned",
  "in_progress",
  "waiting_feedback",
  "completed",
  "archived",
];
const PRIORITIES: TaskPriority[] = ["low", "medium", "high", "critical"];

export type CloudWorkClientRow = {
  id: string;
  user_id: string;
  name: string;
  client_type: string | null;
  status: string;
  difficulty: string | null;
  billing_mode: string;
  default_rate: number | null;
  hourly_rate: number | null;
  fixed_monthly_amount: number | null;
  currency: string | null;
  contact_name: string | null;
  contact_email: string | null;
  notes: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type CloudWorkItemRow = {
  id: string;
  user_id: string;
  client_id: string | null;
  title: string;
  description: string;
  status: string;
  priority: string | null;
  difficulty: string | null;
  item_type: string | null;
  estimated_minutes: number | null;
  actual_minutes: number | null;
  value: number | null;
  currency: string | null;
  planned_date: string | null;
  deadline: string | null;
  completed_at: string | null;
  reference_url: string | null;
  internal_notes: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type CloudWorkClientInsert = {
  user_id: string;
  name: string;
  client_type: string | null;
  status: string;
  difficulty: string | null;
  billing_mode: string;
  default_rate: number | null;
  hourly_rate: number | null;
  fixed_monthly_amount: number | null;
  currency: string | null;
  contact_name: string | null;
  contact_email: string | null;
  notes: string;
  is_active: boolean;
};

export type CloudWorkItemInsert = {
  user_id: string;
  client_id: string | null;
  title: string;
  description: string;
  status: string;
  priority: string | null;
  difficulty: string | null;
  item_type: string | null;
  estimated_minutes: number | null;
  actual_minutes: number | null;
  value: number | null;
  currency: string | null;
  planned_date: string | null;
  deadline: string | null;
  completed_at: string | null;
  reference_url: string | null;
  internal_notes: string;
};

export type CloudWorkClientUpdate = Partial<
  Pick<
    CloudWorkClientRow,
    | "name"
    | "client_type"
    | "status"
    | "difficulty"
    | "billing_mode"
    | "default_rate"
    | "hourly_rate"
    | "fixed_monthly_amount"
    | "currency"
    | "contact_name"
    | "contact_email"
    | "notes"
    | "is_active"
    | "deleted_at"
  >
>;

export type CloudWorkItemUpdate = Partial<
  Pick<
    CloudWorkItemRow,
    | "client_id"
    | "title"
    | "description"
    | "status"
    | "priority"
    | "difficulty"
    | "item_type"
    | "estimated_minutes"
    | "actual_minutes"
    | "value"
    | "currency"
    | "planned_date"
    | "deadline"
    | "completed_at"
    | "reference_url"
    | "internal_notes"
    | "deleted_at"
  >
>;

export type CloudWorkResult<T> =
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

type CloudWorkContext =
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

function sanitizeCloudWorkError(message: string) {
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes("relation") ||
    lowerMessage.includes("schema cache") ||
    lowerMessage.includes("could not find")
  ) {
    return "Cloud work tables are not available yet. Run supabase/sql/006_work.sql manually in Supabase.";
  }

  if (
    lowerMessage.includes("row-level security") ||
    lowerMessage.includes("permission denied") ||
    lowerMessage.includes("policy")
  ) {
    return "Cloud work request was blocked by Supabase security policies.";
  }

  if (
    lowerMessage.includes("client_id") ||
    lowerMessage.includes("foreign key")
  ) {
    return "Cloud work relation was rejected. The referenced cloud client must belong to the signed-in user.";
  }

  if (
    lowerMessage.includes("network") ||
    lowerMessage.includes("failed to fetch")
  ) {
    return "Cloud work request failed because the network or Supabase connection is unavailable.";
  }

  if (lowerMessage.includes("check constraint")) {
    return "Cloud work action failed because one field does not match the approved Work schema.";
  }

  return "Cloud work action failed. Check Supabase configuration and RLS policies.";
}

function isClientType(value: unknown): value is ClientType {
  return typeof value === "string" && CLIENT_TYPES.includes(value as ClientType);
}

function isClientStatus(value: unknown): value is ClientStatus {
  return (
    typeof value === "string" &&
    CLIENT_STATUSES.includes(value as ClientStatus)
  );
}

function isDifficulty(value: unknown): value is Difficulty {
  return (
    typeof value === "string" &&
    DIFFICULTIES.includes(value as Difficulty)
  );
}

function isBillingType(value: unknown): value is BillingType {
  return (
    typeof value === "string" &&
    BILLING_TYPES.includes(value as BillingType)
  );
}

function isCurrency(value: unknown): value is Currency {
  return typeof value === "string" && CURRENCIES.includes(value as Currency);
}

function isWorkItemType(value: unknown): value is WorkItemType {
  return (
    typeof value === "string" &&
    WORK_ITEM_TYPES.includes(value as WorkItemType)
  );
}

function isWorkItemStatus(value: unknown): value is WorkItemStatus {
  return (
    typeof value === "string" &&
    WORK_ITEM_STATUSES.includes(value as WorkItemStatus)
  );
}

function isPriority(value: unknown): value is TaskPriority {
  return typeof value === "string" && PRIORITIES.includes(value as TaskPriority);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function normalizeClientId(value: string | undefined) {
  return value && isUuid(value) ? value : null;
}

function normalizeCloudClientRow(value: unknown): CloudWorkClientRow | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = value.id;
  const userId = value.user_id;
  const name = value.name;
  const status = value.status;
  const billingMode = value.billing_mode;
  const notes = value.notes;
  const isActive = value.is_active;
  const createdAt = value.created_at;
  const updatedAt = value.updated_at;

  if (
    typeof id !== "string" ||
    typeof userId !== "string" ||
    typeof name !== "string" ||
    typeof status !== "string" ||
    typeof billingMode !== "string" ||
    typeof notes !== "string" ||
    typeof isActive !== "boolean" ||
    typeof createdAt !== "string" ||
    typeof updatedAt !== "string"
  ) {
    return null;
  }

  return {
    id,
    user_id: userId,
    name,
    client_type:
      typeof value.client_type === "string" ? value.client_type : null,
    status,
    difficulty:
      typeof value.difficulty === "string" ? value.difficulty : null,
    billing_mode: billingMode,
    default_rate: toNumberOrNull(value.default_rate),
    hourly_rate: toNumberOrNull(value.hourly_rate),
    fixed_monthly_amount: toNumberOrNull(value.fixed_monthly_amount),
    currency: typeof value.currency === "string" ? value.currency : null,
    contact_name:
      typeof value.contact_name === "string" ? value.contact_name : null,
    contact_email:
      typeof value.contact_email === "string" ? value.contact_email : null,
    notes,
    is_active: isActive,
    created_at: createdAt,
    updated_at: updatedAt,
    deleted_at:
      typeof value.deleted_at === "string" ? value.deleted_at : null,
  };
}

function normalizeCloudWorkItemRow(value: unknown): CloudWorkItemRow | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = value.id;
  const userId = value.user_id;
  const title = value.title;
  const description = value.description;
  const status = value.status;
  const internalNotes = value.internal_notes;
  const createdAt = value.created_at;
  const updatedAt = value.updated_at;

  if (
    typeof id !== "string" ||
    typeof userId !== "string" ||
    typeof title !== "string" ||
    typeof description !== "string" ||
    typeof status !== "string" ||
    typeof internalNotes !== "string" ||
    typeof createdAt !== "string" ||
    typeof updatedAt !== "string"
  ) {
    return null;
  }

  return {
    id,
    user_id: userId,
    client_id: typeof value.client_id === "string" ? value.client_id : null,
    title,
    description,
    status,
    priority: typeof value.priority === "string" ? value.priority : null,
    difficulty:
      typeof value.difficulty === "string" ? value.difficulty : null,
    item_type: typeof value.item_type === "string" ? value.item_type : null,
    estimated_minutes: toNumberOrNull(value.estimated_minutes),
    actual_minutes: toNumberOrNull(value.actual_minutes),
    value: toNumberOrNull(value.value),
    currency: typeof value.currency === "string" ? value.currency : null,
    planned_date:
      typeof value.planned_date === "string" ? value.planned_date : null,
    deadline: typeof value.deadline === "string" ? value.deadline : null,
    completed_at:
      typeof value.completed_at === "string" ? value.completed_at : null,
    reference_url:
      typeof value.reference_url === "string" ? value.reference_url : null,
    internal_notes: internalNotes,
    created_at: createdAt,
    updated_at: updatedAt,
    deleted_at:
      typeof value.deleted_at === "string" ? value.deleted_at : null,
  };
}

async function getCloudWorkContext(): Promise<CloudWorkContext> {
  const client = getSupabaseBrowserClient();

  if (!client) {
    return {
      ok: false,
      error: "Cloud work is unavailable because Supabase is not configured.",
    };
  }

  const { data, error } = await client.auth.getSession();

  if (error) {
    return {
      ok: false,
      error: sanitizeCloudWorkError(error.message),
    };
  }

  const userId = data.session?.user.id;

  if (!userId) {
    return {
      ok: false,
      error: "Sign in before using cloud work.",
    };
  }

  return {
    ok: true,
    client,
    userId,
  };
}

export function mapCloudClientToAtlasClient(row: CloudWorkClientRow): Client {
  const billingType = isBillingType(row.billing_mode)
    ? row.billing_mode
    : "per_item";

  return {
    id: row.id,
    name: row.name,
    type: isClientType(row.client_type) ? row.client_type : "Other",
    status: isClientStatus(row.status)
      ? row.status
      : row.is_active
        ? "active"
        : "paused",
    difficulty: isDifficulty(row.difficulty) ? row.difficulty : "medium",
    defaultRate: row.default_rate ?? undefined,
    notes: row.notes,
    createdAt: row.created_at,
    billingType,
    monthlyRate: row.fixed_monthly_amount ?? undefined,
    hourlyRate: row.hourly_rate ?? undefined,
    currency: isCurrency(row.currency) ? row.currency : undefined,
  };
}

export function mapAtlasClientToCloudInsert(
  client: Client | ClientDraft,
  userId: string,
): CloudWorkClientInsert {
  const billingType = isBillingType(client.billingType)
    ? client.billingType
    : "per_item";
  const status = "status" in client ? client.status : "active";

  return {
    user_id: userId,
    name: client.name.trim() || "Untitled client",
    client_type: isClientType(client.type) ? client.type : "Other",
    status: isClientStatus(status) ? status : "active",
    difficulty: isDifficulty(client.difficulty) ? client.difficulty : "medium",
    billing_mode: billingType,
    default_rate:
      typeof client.defaultRate === "number" && Number.isFinite(client.defaultRate)
        ? client.defaultRate
        : null,
    hourly_rate:
      typeof client.hourlyRate === "number" && Number.isFinite(client.hourlyRate)
        ? client.hourlyRate
        : null,
    fixed_monthly_amount:
      typeof client.monthlyRate === "number" && Number.isFinite(client.monthlyRate)
        ? client.monthlyRate
        : null,
    currency: isCurrency(client.currency) ? client.currency : null,
    contact_name: null,
    contact_email: null,
    notes: client.notes?.trim() || "",
    is_active: status === "active",
  };
}

export function mapCloudWorkItemToAtlasWorkItem(
  row: CloudWorkItemRow,
): WorkItem {
  return {
    id: row.id,
    clientId: row.client_id ?? "",
    title: row.title,
    description: row.description,
    type: isWorkItemType(row.item_type) ? row.item_type : "Other",
    status: isWorkItemStatus(row.status) ? row.status : "backlog",
    priority: isPriority(row.priority) ? row.priority : "medium",
    difficulty: isDifficulty(row.difficulty) ? row.difficulty : "medium",
    estimatedMinutes: row.estimated_minutes ?? undefined,
    deadline: row.deadline ?? undefined,
    plannedDate: row.planned_date ?? undefined,
    value: row.value ?? undefined,
    currency: isCurrency(row.currency) ? row.currency : undefined,
    notes: row.internal_notes,
    createdAt: row.created_at,
    completedAt: row.completed_at ?? undefined,
    referenceUrl: row.reference_url ?? "",
  };
}

export function mapAtlasWorkItemToCloudInsert(
  item: WorkItem | WorkItemDraft,
  userId: string,
): CloudWorkItemInsert {
  const status = "status" in item ? item.status : "backlog";
  const completedAt =
    "completedAt" in item && typeof item.completedAt === "string"
      ? item.completedAt
      : null;

  return {
    user_id: userId,
    client_id: normalizeClientId(item.clientId),
    title: item.title.trim() || "Untitled work item",
    description: item.description?.trim() || "",
    status: isWorkItemStatus(status) ? status : "backlog",
    priority: isPriority(item.priority) ? item.priority : null,
    difficulty: isDifficulty(item.difficulty) ? item.difficulty : null,
    item_type: isWorkItemType(item.type) ? item.type : "Other",
    estimated_minutes:
      typeof item.estimatedMinutes === "number" &&
      Number.isFinite(item.estimatedMinutes)
        ? item.estimatedMinutes
        : null,
    actual_minutes: null,
    value:
      typeof item.value === "number" && Number.isFinite(item.value)
        ? item.value
        : null,
    currency: isCurrency(item.currency) ? item.currency : null,
    planned_date: item.plannedDate || null,
    deadline: item.deadline || null,
    completed_at: completedAt,
    reference_url: item.referenceUrl?.trim() || null,
    internal_notes: item.notes?.trim() || "",
  };
}

export async function listCloudClients(): Promise<
  CloudWorkResult<Client[]>
> {
  const context = await getCloudWorkContext();

  if (!context.ok) {
    return {
      ok: false,
      data: [],
      error: context.error,
    };
  }

  const { data, error } = await context.client
    .from("work_clients")
    .select(CLOUD_CLIENT_COLUMNS)
    .eq("user_id", context.userId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  if (error) {
    return {
      ok: false,
      data: [],
      error: sanitizeCloudWorkError(error.message),
    };
  }

  const clients = Array.isArray(data)
    ? data
        .map(normalizeCloudClientRow)
        .filter((client): client is CloudWorkClientRow => client !== null)
        .map(mapCloudClientToAtlasClient)
    : [];

  return {
    ok: true,
    data: clients,
    message: `Loaded ${clients.length} cloud ${clients.length === 1 ? "client" : "clients"}.`,
  };
}

export async function createCloudClient(
  client: Client | ClientDraft,
): Promise<CloudWorkResult<Client | null>> {
  const context = await getCloudWorkContext();

  if (!context.ok) {
    return {
      ok: false,
      data: null,
      error: context.error,
    };
  }

  const insert = mapAtlasClientToCloudInsert(client, context.userId);

  const { data, error } = await context.client
    .from("work_clients")
    .insert(insert)
    .select(CLOUD_CLIENT_COLUMNS)
    .single();

  if (error) {
    return {
      ok: false,
      data: null,
      error: sanitizeCloudWorkError(error.message),
    };
  }

  const row = normalizeCloudClientRow(data);

  if (!row) {
    return {
      ok: false,
      data: null,
      error:
        "Cloud client was created, but Atlas could not read the returned row.",
    };
  }

  return {
    ok: true,
    data: mapCloudClientToAtlasClient(row),
    message: "Created cloud client. Local work data was not changed.",
  };
}

export async function updateCloudClient(
  id: string,
  updates: Partial<ClientDraft> & { status?: ClientStatus },
): Promise<CloudWorkResult<Client | null>> {
  const context = await getCloudWorkContext();

  if (!context.ok) {
    return {
      ok: false,
      data: null,
      error: context.error,
    };
  }

  const update: CloudWorkClientUpdate = {};

  if (typeof updates.name === "string") {
    update.name = updates.name.trim() || "Untitled client";
  }

  if (typeof updates.type === "string") {
    update.client_type = updates.type;
  }

  if (typeof updates.status === "string") {
    update.status = updates.status;
    update.is_active = updates.status === "active";
  }

  if (typeof updates.difficulty === "string") {
    update.difficulty = updates.difficulty;
  }

  if (typeof updates.billingType === "string") {
    update.billing_mode = updates.billingType;
  }

  if ("defaultRate" in updates) {
    update.default_rate =
      typeof updates.defaultRate === "number" ? updates.defaultRate : null;
  }

  if ("hourlyRate" in updates) {
    update.hourly_rate =
      typeof updates.hourlyRate === "number" ? updates.hourlyRate : null;
  }

  if ("monthlyRate" in updates) {
    update.fixed_monthly_amount =
      typeof updates.monthlyRate === "number" ? updates.monthlyRate : null;
  }

  if ("currency" in updates) {
    update.currency = isCurrency(updates.currency) ? updates.currency : null;
  }

  if (typeof updates.notes === "string") {
    update.notes = updates.notes.trim();
  }

  const { data, error } = await context.client
    .from("work_clients")
    .update(update)
    .eq("id", id)
    .eq("user_id", context.userId)
    .is("deleted_at", null)
    .select(CLOUD_CLIENT_COLUMNS)
    .single();

  if (error) {
    return {
      ok: false,
      data: null,
      error: sanitizeCloudWorkError(error.message),
    };
  }

  const row = normalizeCloudClientRow(data);

  if (!row) {
    return {
      ok: false,
      data: null,
      error:
        "Cloud client updated, but Atlas could not read the returned row.",
    };
  }

  return {
    ok: true,
    data: mapCloudClientToAtlasClient(row),
    message: "Updated cloud client. Local work data was not changed.",
  };
}

export async function deleteCloudClient(
  id: string,
): Promise<CloudWorkResult<null>> {
  const context = await getCloudWorkContext();

  if (!context.ok) {
    return {
      ok: false,
      data: null,
      error: context.error,
    };
  }

  const { error } = await context.client
    .from("work_clients")
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq("id", id)
    .eq("user_id", context.userId);

  if (error) {
    return {
      ok: false,
      data: null,
      error: sanitizeCloudWorkError(error.message),
    };
  }

  return {
    ok: true,
    data: null,
    message: "Deleted cloud client. Local work data was not changed.",
  };
}

export async function listCloudWorkItems(): Promise<
  CloudWorkResult<WorkItem[]>
> {
  const context = await getCloudWorkContext();

  if (!context.ok) {
    return {
      ok: false,
      data: [],
      error: context.error,
    };
  }

  const { data, error } = await context.client
    .from("work_items")
    .select(CLOUD_WORK_ITEM_COLUMNS)
    .eq("user_id", context.userId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  if (error) {
    return {
      ok: false,
      data: [],
      error: sanitizeCloudWorkError(error.message),
    };
  }

  const items = Array.isArray(data)
    ? data
        .map(normalizeCloudWorkItemRow)
        .filter((item): item is CloudWorkItemRow => item !== null)
        .map(mapCloudWorkItemToAtlasWorkItem)
    : [];

  return {
    ok: true,
    data: items,
    message: `Loaded ${items.length} cloud work ${items.length === 1 ? "item" : "items"}.`,
  };
}

export async function createCloudWorkItem(
  item: WorkItem | WorkItemDraft,
): Promise<CloudWorkResult<WorkItem | null>> {
  const context = await getCloudWorkContext();

  if (!context.ok) {
    return {
      ok: false,
      data: null,
      error: context.error,
    };
  }

  const insert = mapAtlasWorkItemToCloudInsert(item, context.userId);

  const { data, error } = await context.client
    .from("work_items")
    .insert(insert)
    .select(CLOUD_WORK_ITEM_COLUMNS)
    .single();

  if (error) {
    return {
      ok: false,
      data: null,
      error: sanitizeCloudWorkError(error.message),
    };
  }

  const row = normalizeCloudWorkItemRow(data);

  if (!row) {
    return {
      ok: false,
      data: null,
      error:
        "Cloud work item was created, but Atlas could not read the returned row.",
    };
  }

  return {
    ok: true,
    data: mapCloudWorkItemToAtlasWorkItem(row),
    message: "Created cloud work item. Local work data was not changed.",
  };
}

export async function updateCloudWorkItem(
  id: string,
  updates: Partial<WorkItemDraft> & {
    status?: WorkItemStatus;
    completedAt?: string | null;
  },
): Promise<CloudWorkResult<WorkItem | null>> {
  const context = await getCloudWorkContext();

  if (!context.ok) {
    return {
      ok: false,
      data: null,
      error: context.error,
    };
  }

  const update: CloudWorkItemUpdate = {};

  if (typeof updates.clientId === "string") {
    update.client_id = normalizeClientId(updates.clientId);
  }

  if (typeof updates.title === "string") {
    update.title = updates.title.trim() || "Untitled work item";
  }

  if (typeof updates.description === "string") {
    update.description = updates.description.trim();
  }

  if (typeof updates.status === "string") {
    update.status = updates.status;
  }

  if (typeof updates.priority === "string") {
    update.priority = updates.priority;
  }

  if (typeof updates.difficulty === "string") {
    update.difficulty = updates.difficulty;
  }

  if (typeof updates.type === "string") {
    update.item_type = updates.type;
  }

  if ("estimatedMinutes" in updates) {
    update.estimated_minutes =
      typeof updates.estimatedMinutes === "number"
        ? updates.estimatedMinutes
        : null;
  }

  if ("value" in updates) {
    update.value = typeof updates.value === "number" ? updates.value : null;
  }

  if ("currency" in updates) {
    update.currency = isCurrency(updates.currency) ? updates.currency : null;
  }

  if (typeof updates.plannedDate === "string") {
    update.planned_date = updates.plannedDate || null;
  }

  if (typeof updates.deadline === "string") {
    update.deadline = updates.deadline || null;
  }

  if ("completedAt" in updates) {
    update.completed_at = updates.completedAt ?? null;
  }

  if (typeof updates.referenceUrl === "string") {
    update.reference_url = updates.referenceUrl.trim() || null;
  }

  if (typeof updates.notes === "string") {
    update.internal_notes = updates.notes.trim();
  }

  const { data, error } = await context.client
    .from("work_items")
    .update(update)
    .eq("id", id)
    .eq("user_id", context.userId)
    .is("deleted_at", null)
    .select(CLOUD_WORK_ITEM_COLUMNS)
    .single();

  if (error) {
    return {
      ok: false,
      data: null,
      error: sanitizeCloudWorkError(error.message),
    };
  }

  const row = normalizeCloudWorkItemRow(data);

  if (!row) {
    return {
      ok: false,
      data: null,
      error:
        "Cloud work item updated, but Atlas could not read the returned row.",
    };
  }

  return {
    ok: true,
    data: mapCloudWorkItemToAtlasWorkItem(row),
    message: "Updated cloud work item. Local work data was not changed.",
  };
}

export async function deleteCloudWorkItem(
  id: string,
): Promise<CloudWorkResult<null>> {
  const context = await getCloudWorkContext();

  if (!context.ok) {
    return {
      ok: false,
      data: null,
      error: context.error,
    };
  }

  const { error } = await context.client
    .from("work_items")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", context.userId);

  if (error) {
    return {
      ok: false,
      data: null,
      error: sanitizeCloudWorkError(error.message),
    };
  }

  return {
    ok: true,
    data: null,
    message: "Deleted cloud work item. Local work data was not changed.",
  };
}
