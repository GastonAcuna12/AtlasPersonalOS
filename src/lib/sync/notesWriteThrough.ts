"use client";

import type { Note } from "@/types/atlas";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { readSyncState } from "@/lib/sync/state";

/**
 * Checks if the Notes module has cloud sync enabled in atlas.syncState.
 */
export function isNotesCloudSynced(): boolean {
  const syncState = readSyncState();
  return syncState.modules.notes.status === "synced";
}

/**
 * Pushes a note create or update to Supabase (idempotent upsert via local_id).
 */
export async function pushNoteToCloud(
  note: Note
): Promise<{ ok: boolean; error?: string; cloudId?: string }> {
  const client = getSupabaseBrowserClient();
  if (!client) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) {
    return { ok: false, error: sessionError.message };
  }

  const userId = sessionData.session?.user.id;
  if (!userId) {
    return { ok: false, error: "User is not signed in." };
  }

  const row = {
    user_id: userId,
    local_id: note.id,
    title: note.title.trim() || "Untitled note",
    content: note.content.trim(),
    area: note.area.trim() || null,
    tags: note.tags.map((t) => t.trim()).filter(Boolean),
    created_at: note.createdAt,
    updated_at: note.updatedAt,
    synced_at: new Date().toISOString(),
    deleted_at: note.deletedAt || null,
  };

  const { data, error } = await client
    .from("notes")
    .upsert(row, { onConflict: "user_id,local_id" })
    .select("id")
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, cloudId: data?.id };
}

/**
 * Pushes a soft-delete note state (deleted_at) to Supabase.
 */
export async function pushNoteDeleteToCloud(
  note: Note
): Promise<{ ok: boolean; error?: string }> {
  const client = getSupabaseBrowserClient();
  if (!client) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) {
    return { ok: false, error: sessionError.message };
  }

  const userId = sessionData.session?.user.id;
  if (!userId) {
    return { ok: false, error: "User is not signed in." };
  }

  const now = new Date().toISOString();
  const query = client.from("notes").update({ deleted_at: now }).eq("user_id", userId);

  if (note.cloudId) {
    query.eq("id", note.cloudId);
  } else {
    query.eq("local_id", note.id);
  }

  const { error } = await query;
  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
