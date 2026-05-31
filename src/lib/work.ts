"use client";

import { useMemo } from "react";
import {
  ATLAS_STORAGE_KEYS,
  readFromStorage,
  useStoredValue,
  writeToStorage,
} from "@/lib/storage";
import type {
  BillingType,
  Client,
  ClientDraft,
  ClientStatus,
  ClientType,
  Difficulty,
  TaskPriority,
  WorkItem,
  WorkItemDraft,
  WorkItemStatus,
  WorkItemType,
} from "@/types/atlas";

export type {
  BillingType,
  Client,
  ClientDraft,
  ClientStatus,
  ClientType,
  Difficulty,
  WorkItem,
  WorkItemDraft,
  WorkItemStatus,
  WorkItemType,
} from "@/types/atlas";

const INITIAL_CLIENTS: Client[] = [];
const INITIAL_WORK_ITEMS: WorkItem[] = [];

export const CLIENT_TYPES: ClientType[] = [
  "Agency",
  "Direct Client",
  "Freelance Platform",
  "Personal Project",
  "Other",
];

export const WORK_ITEM_TYPES: WorkItemType[] = [
  "Video",
  "Resize",
  "Motion",
  "B-roll",
  "Design",
  "Revision",
  "Admin",
  "Other",
];

export const WORK_ITEM_STATUSES: WorkItemStatus[] = [
  "backlog",
  "planned",
  "in_progress",
  "waiting_feedback",
  "completed",
  "archived",
];

export const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard", "intense"];

export const PRIORITIES: TaskPriority[] = ["low", "medium", "high", "critical"];

function normalizeClient(value: Partial<Client>): Client {
  const now = new Date().toISOString();
  return {
    id: value.id ?? `${Date.now()}-client`,
    name: value.name ?? "Unnamed client",
    type: CLIENT_TYPES.includes(value.type as ClientType)
      ? (value.type as ClientType)
      : "Other",
    status: (["active", "paused", "archived"] as ClientStatus[]).includes(
      value.status as ClientStatus,
    )
      ? (value.status as ClientStatus)
      : "active",
    difficulty: DIFFICULTIES.includes(value.difficulty as Difficulty)
      ? (value.difficulty as Difficulty)
      : "medium",
    defaultRate: typeof value.defaultRate === "number" ? value.defaultRate : undefined,
    notes: value.notes ?? "",
    createdAt: value.createdAt ?? now,
    billingType: (["per_item", "fixed_monthly", "hourly", "non_billable"] as BillingType[]).includes(
      value.billingType as BillingType,
    )
      ? (value.billingType as BillingType)
      : "per_item",
    monthlyRate: typeof value.monthlyRate === "number" ? value.monthlyRate : undefined,
    hourlyRate: typeof value.hourlyRate === "number" ? value.hourlyRate : undefined,
    currency: (value.currency === "USD" || value.currency === "PYG") ? value.currency : undefined,
  };
}

function normalizeClients(value: unknown): Client[] {
  if (!Array.isArray(value)) return INITIAL_CLIENTS;
  return value.map((c) =>
    normalizeClient(c && typeof c === "object" ? (c as Partial<Client>) : {}),
  );
}

function normalizeWorkItem(value: Partial<WorkItem>): WorkItem {
  const now = new Date().toISOString();
  return {
    id: value.id ?? `${Date.now()}-workitem`,
    clientId: value.clientId ?? "",
    title: value.title ?? "Untitled item",
    description: value.description ?? "",
    type: WORK_ITEM_TYPES.includes(value.type as WorkItemType)
      ? (value.type as WorkItemType)
      : "Other",
    status: WORK_ITEM_STATUSES.includes(value.status as WorkItemStatus)
      ? (value.status as WorkItemStatus)
      : "backlog",
    priority: PRIORITIES.includes(value.priority as TaskPriority)
      ? (value.priority as TaskPriority)
      : "medium",
    difficulty: DIFFICULTIES.includes(value.difficulty as Difficulty)
      ? (value.difficulty as Difficulty)
      : "medium",
    estimatedMinutes:
      typeof value.estimatedMinutes === "number" ? value.estimatedMinutes : undefined,
    deadline: value.deadline ?? undefined,
    plannedDate: value.plannedDate ?? undefined,
    value: typeof value.value === "number" ? value.value : undefined,
    currency: (value.currency === "USD" || value.currency === "PYG")
      ? value.currency
      : undefined,
    notes: value.notes ?? "",
    createdAt: value.createdAt ?? now,
    completedAt: value.completedAt ?? undefined,
    xpAwarded: typeof value.xpAwarded === "boolean" ? value.xpAwarded : undefined,
    referenceUrl: value.referenceUrl ?? "",
  };
}

function normalizeWorkItems(value: unknown): WorkItem[] {
  if (!Array.isArray(value)) return INITIAL_WORK_ITEMS;
  return value.map((w) =>
    normalizeWorkItem(w && typeof w === "object" ? (w as Partial<WorkItem>) : {}),
  );
}

function readClients() {
  return readFromStorage(ATLAS_STORAGE_KEYS.clients, INITIAL_CLIENTS, normalizeClients);
}

function saveClients(clients: Client[]) {
  writeToStorage(ATLAS_STORAGE_KEYS.clients, clients);
}

function readWorkItems() {
  return readFromStorage(
    ATLAS_STORAGE_KEYS.workItems,
    INITIAL_WORK_ITEMS,
    normalizeWorkItems,
  );
}

function saveWorkItems(items: WorkItem[]) {
  writeToStorage(ATLAS_STORAGE_KEYS.workItems, items);
}

/** Returns only non-archived clients. */
export function getActiveClients(clients: Client[]): Client[] {
  return clients.filter((c) => c.status === "active");
}

/** Returns work items due today. */
export function getWorkItemsDueToday(
  items: WorkItem[],
  date?: string,
): WorkItem[] {
  const today = date ?? new Date().toISOString().slice(0, 10);
  return items.filter(
    (item) =>
      item.status !== "completed" &&
      item.status !== "archived" &&
      (item.plannedDate === today ||
        item.deadline === today ||
        (item.deadline && item.deadline < today)),
  );
}

/** Returns work items due this week (Mon-Sun). */
export function getWorkItemsDueThisWeek(
  items: WorkItem[],
  date?: string,
): WorkItem[] {
  const now = date ? new Date(date) : new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const start = monday.toISOString().slice(0, 10);
  const end = sunday.toISOString().slice(0, 10);

  return items.filter((item) => {
    if (item.status === "completed" || item.status === "archived") return false;
    const d = item.deadline ?? item.plannedDate;
    return d && d >= start && d <= end;
  });
}

/** Returns estimated work minutes for this week. */
export function getWorkloadThisWeek(items: WorkItem[], date?: string): number {
  return getWorkItemsDueThisWeek(items, date).reduce(
    (sum, item) => sum + (item.estimatedMinutes ?? 0),
    0,
  );
}

/** Returns items waiting for feedback. */
export function getItemsWaitingFeedback(items: WorkItem[]): WorkItem[] {
  return items.filter((item) => item.status === "waiting_feedback");
}

/** Status display label for work items. */
export function getStatusLabel(status: WorkItemStatus): string {
  const labels: Record<WorkItemStatus, string> = {
    backlog: "Backlog",
    planned: "Planned",
    in_progress: "In Progress",
    waiting_feedback: "Waiting Feedback",
    completed: "Completed",
    archived: "Archived",
  };
  return labels[status] ?? status;
}

/** Difficulty display color. */
export function getDifficultyColor(difficulty: Difficulty): string {
  const colors: Record<Difficulty, string> = {
    easy: "text-green-600",
    medium: "text-amber-600",
    hard: "text-orange-600",
    intense: "text-red-600",
  };
  return colors[difficulty] ?? "text-stone-600";
}

/** Priority color for work items. */
export function getPriorityColor(priority: TaskPriority): string {
  const colors: Record<TaskPriority, string> = {
    low: "text-stone-500",
    medium: "text-amber-600",
    high: "text-orange-600",
    critical: "text-red-600",
  };
  return colors[priority] ?? "text-stone-500";
}

/** Calculate XP for completing a work item. */
export function calculateWorkXP(item: WorkItem): { amount: number; label: string } {
  let amount = 15;
  if (item.difficulty === "hard") amount += 5;
  if (item.difficulty === "intense") amount += 10;
  if ((item.estimatedMinutes ?? 0) >= 60) amount += 5;

  return {
    amount,
    label:
      amount > 15
        ? `Completed ${item.title} (high effort)`
        : `Completed ${item.title}`,
  };
}

export function useClients() {
  const clients = useStoredValue(
    ATLAS_STORAGE_KEYS.clients,
    INITIAL_CLIENTS,
    normalizeClients,
  );

  const sortedClients = useMemo(
    () => [...clients].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [clients],
  );

  const activeClients = useMemo(
    () => getActiveClients(sortedClients),
    [sortedClients],
  );

  function addClient(draft: ClientDraft) {
    const client: Client = {
      ...draft,
      id: `${Date.now()}-client`,
      name: draft.name.trim() || "Unnamed client",
      createdAt: new Date().toISOString(),
    };
    saveClients([client, ...readClients()]);
    return client;
  }

  function updateClient(id: string, updates: Partial<Client>) {
    const current = readClients();
    saveClients(
      current.map((c) =>
        c.id === id ? normalizeClient({ ...c, ...updates }) : c,
      ),
    );
  }

  function archiveClient(id: string) {
    updateClient(id, { status: "archived" });
  }

  return {
    clients: sortedClients,
    activeClients,
    addClient,
    updateClient,
    archiveClient,
  };
}

export function useWorkItems() {
  const items = useStoredValue(
    ATLAS_STORAGE_KEYS.workItems,
    INITIAL_WORK_ITEMS,
    normalizeWorkItems,
  );

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [items],
  );

  function addWorkItem(draft: WorkItemDraft) {
    const item: WorkItem = {
      ...draft,
      id: `${Date.now()}-workitem`,
      title: draft.title.trim() || "Untitled item",
      createdAt: new Date().toISOString(),
    };
    saveWorkItems([item, ...readWorkItems()]);
    return item;
  }

  function updateWorkItem(id: string, updates: Partial<WorkItem>) {
    const current = readWorkItems();
    saveWorkItems(
      current.map((w) =>
        w.id === id ? normalizeWorkItem({ ...w, ...updates }) : w,
      ),
    );
  }

  function completeWorkItem(id: string) {
    updateWorkItem(id, {
      status: "completed",
      completedAt: new Date().toISOString(),
      xpAwarded: true,
    });
  }

  function deleteWorkItem(id: string) {
    saveWorkItems(readWorkItems().filter((w) => w.id !== id));
  }

  return {
    workItems: sortedItems,
    addWorkItem,
    updateWorkItem,
    completeWorkItem,
    deleteWorkItem,
  };
}
