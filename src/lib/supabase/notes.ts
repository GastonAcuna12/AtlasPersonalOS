"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Note, NoteDraft } from "@/types/atlas";

const CLOUD_NOTE_COLUMNS =
  "id,user_id,title,content,area,tags,created_at,updated_at,deleted_at";

export type CloudNoteRow = {
  id: string;
  user_id: string;
  title: string;
  content: string;
  area: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  local_id?: string | null;
  synced_at?: string | null;
  conflict_state?: string | null;
};

export type CloudNoteInsert = {
  user_id: string;
  title: string;
  content: string;
  area: string | null;
  tags: string[];
};

export type CloudNoteUpdate = Partial<
  Pick<CloudNoteRow, "title" | "content" | "area" | "tags" | "deleted_at">
>;

export type CloudNotesResult<T> =
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

type CloudNotesContext =
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

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function normalizeCloudNoteRow(value: unknown): CloudNoteRow | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = value.id;
  const userId = value.user_id;
  const title = value.title;
  const content = value.content;
  const createdAt = value.created_at;
  const updatedAt = value.updated_at;

  if (
    typeof id !== "string" ||
    typeof userId !== "string" ||
    typeof title !== "string" ||
    typeof content !== "string" ||
    typeof createdAt !== "string" ||
    typeof updatedAt !== "string"
  ) {
    return null;
  }

  return {
    id,
    user_id: userId,
    title,
    content,
    area: typeof value.area === "string" ? value.area : null,
    tags: toStringArray(value.tags),
    created_at: createdAt,
    updated_at: updatedAt,
    deleted_at:
      typeof value.deleted_at === "string" ? value.deleted_at : null,
    local_id:
      typeof value.local_id === "string" ? value.local_id : null,
    synced_at:
      typeof value.synced_at === "string" ? value.synced_at : null,
    conflict_state:
      typeof value.conflict_state === "string" ? value.conflict_state : null,
  };
}

async function getCloudNotesContext(): Promise<CloudNotesContext> {
  const client = getSupabaseBrowserClient();

  if (!client) {
    return {
      ok: false,
      error: "Cloud notes are unavailable because Supabase is not configured.",
    };
  }

  const { data, error } = await client.auth.getSession();

  if (error) {
    return {
      ok: false,
      error: error.message,
    };
  }

  const userId = data.session?.user.id;

  if (!userId) {
    return {
      ok: false,
      error: "Sign in before using cloud notes.",
    };
  }

  return {
    ok: true,
    client,
    userId,
  };
}

export function mapCloudNoteToAtlasNote(row: CloudNoteRow): Note {
  return {
    id: row.id,
    title: row.title,
    area: row.area ?? "Personal",
    tags: row.tags ?? [],
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    localId: row.local_id ?? undefined,
  };
}

export function mapAtlasNoteToCloudInsert(
  note: Note | NoteDraft,
  userId: string,
): CloudNoteInsert {
  return {
    user_id: userId,
    title: note.title.trim() || "Untitled note",
    content: note.content.trim(),
    area: note.area.trim() || null,
    tags: note.tags.map((tag) => tag.trim()).filter(Boolean),
  };
}

export async function listCloudNotes(): Promise<CloudNotesResult<Note[]>> {
  const context = await getCloudNotesContext();

  if (!context.ok) {
    return {
      ok: false,
      data: [],
      error: context.error,
    };
  }

  const { data, error } = await context.client
    .from("notes")
    .select(CLOUD_NOTE_COLUMNS)
    .eq("user_id", context.userId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  if (error) {
    return {
      ok: false,
      data: [],
      error: error.message,
    };
  }

  const notes = Array.isArray(data)
    ? data
        .map(normalizeCloudNoteRow)
        .filter((note): note is CloudNoteRow => note !== null)
        .map(mapCloudNoteToAtlasNote)
    : [];

  return {
    ok: true,
    data: notes,
    message: `Loaded ${notes.length} cloud ${notes.length === 1 ? "note" : "notes"}.`,
  };
}

export async function createCloudNote(
  note: Note | NoteDraft,
): Promise<CloudNotesResult<Note | null>> {
  const context = await getCloudNotesContext();

  if (!context.ok) {
    return {
      ok: false,
      data: null,
      error: context.error,
    };
  }

  const insert = mapAtlasNoteToCloudInsert(note, context.userId);

  const { data, error } = await context.client
    .from("notes")
    .insert(insert)
    .select(CLOUD_NOTE_COLUMNS)
    .single();

  if (error) {
    return {
      ok: false,
      data: null,
      error: error.message,
    };
  }

  const row = normalizeCloudNoteRow(data);

  if (!row) {
    return {
      ok: false,
      data: null,
      error: "Cloud note was created, but Atlas could not read the returned row.",
    };
  }

  return {
    ok: true,
    data: mapCloudNoteToAtlasNote(row),
    message: "Created cloud note. Local notes were not changed.",
  };
}

export async function updateCloudNote(
  id: string,
  updates: Partial<NoteDraft>,
): Promise<CloudNotesResult<Note | null>> {
  const context = await getCloudNotesContext();

  if (!context.ok) {
    return {
      ok: false,
      data: null,
      error: context.error,
    };
  }

  const update: CloudNoteUpdate = {};

  if (typeof updates.title === "string") {
    update.title = updates.title.trim() || "Untitled note";
  }

  if (typeof updates.content === "string") {
    update.content = updates.content.trim();
  }

  if (typeof updates.area === "string") {
    update.area = updates.area.trim() || null;
  }

  if (Array.isArray(updates.tags)) {
    update.tags = updates.tags.map((tag) => tag.trim()).filter(Boolean);
  }

  const { data, error } = await context.client
    .from("notes")
    .update(update)
    .eq("id", id)
    .eq("user_id", context.userId)
    .is("deleted_at", null)
    .select(CLOUD_NOTE_COLUMNS)
    .single();

  if (error) {
    return {
      ok: false,
      data: null,
      error: error.message,
    };
  }

  const row = normalizeCloudNoteRow(data);

  if (!row) {
    return {
      ok: false,
      data: null,
      error: "Cloud note updated, but Atlas could not read the returned row.",
    };
  }

  return {
    ok: true,
    data: mapCloudNoteToAtlasNote(row),
    message: "Updated cloud note. Local notes were not changed.",
  };
}

export async function deleteCloudNote(
  id: string,
): Promise<CloudNotesResult<null>> {
  const context = await getCloudNotesContext();

  if (!context.ok) {
    return {
      ok: false,
      data: null,
      error: context.error,
    };
  }

  const { error } = await context.client
    .from("notes")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", context.userId);

  if (error) {
    return {
      ok: false,
      data: null,
      error: error.message,
    };
  }

  return {
    ok: true,
    data: null,
    message: "Deleted cloud note. Local notes were not changed.",
  };
}

export async function uploadLocalNotesToCloud(
  notes: Note[],
): Promise<CloudNotesResult<{ uploadedCount: number; updatedCount: number }>> {
  const context = await getCloudNotesContext();

  if (!context.ok) {
    return {
      ok: false,
      data: { uploadedCount: 0, updatedCount: 0 },
      error: context.error,
    };
  }

  const now = new Date().toISOString();

  const rows = notes.map((note) => ({
    user_id: context.userId,
    local_id: note.id,
    title: note.title.trim() || "Untitled note",
    content: note.content.trim(),
    area: note.area.trim() || null,
    tags: note.tags.map((t) => t.trim()).filter(Boolean),
    created_at: note.createdAt,
    updated_at: note.updatedAt,
    synced_at: now,
    deleted_at: note.deletedAt || null,
  }));

  if (rows.length === 0) {
    return {
      ok: true,
      data: { uploadedCount: 0, updatedCount: 0 },
      message: "No notes to upload.",
    };
  }

  const { data, error } = await context.client
    .from("notes")
    .upsert(rows, { onConflict: "user_id,local_id" })
    .select("id, local_id");

  if (error) {
    return {
      ok: false,
      data: { uploadedCount: 0, updatedCount: 0 },
      error: error.message,
    };
  }

  const upsertedCount = Array.isArray(data) ? data.length : rows.length;

  return {
    ok: true,
    data: { uploadedCount: upsertedCount, updatedCount: 0 },
    message: `Successfully uploaded ${upsertedCount} notes to Supabase.`,
  };
}
