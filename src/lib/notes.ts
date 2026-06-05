"use client";

import { useMemo } from "react";
import {
  ATLAS_STORAGE_KEYS,
  readFromStorage,
  useStoredValue,
  writeToStorage,
} from "@/lib/storage";
import type { Note, NoteDraft } from "@/types/atlas";
import {
  isNotesCloudSynced,
  pushNoteToCloud,
  pushNoteDeleteToCloud,
} from "@/lib/sync/notesWriteThrough";

export type { Note, NoteDraft } from "@/types/atlas";

const INITIAL_NOTES: Note[] = [];

function normalizeNote(value: Partial<Note>): Note {
  const now = new Date().toISOString();

  return {
    id: value.id ?? `${Date.now()}-note`,
    title: value.title ?? "Untitled note",
    area: value.area ?? "Personal",
    tags: Array.isArray(value.tags) ? value.tags : [],
    content: value.content ?? "",
    createdAt: value.createdAt ?? now,
    updatedAt: value.updatedAt ?? value.createdAt ?? now,
    deletedAt: value.deletedAt ?? null,
    syncState: value.syncState ?? "local_only",
    cloudId: value.cloudId ?? undefined,
    lastSyncedAt: value.lastSyncedAt ?? undefined,
    localId: value.localId ?? undefined,
  };
}

function normalizeNotes(value: unknown) {
  if (!Array.isArray(value)) {
    return INITIAL_NOTES;
  }

  return value.map((note) =>
    normalizeNote(
      note && typeof note === "object" ? (note as Partial<Note>) : {},
    ),
  );
}

export function readNotes() {
  return readFromStorage(ATLAS_STORAGE_KEYS.notes, INITIAL_NOTES, normalizeNotes);
}

export function saveNotes(notes: Note[]) {
  writeToStorage(ATLAS_STORAGE_KEYS.notes, notes);
}

function markNoteSyncedLocally(id: string, cloudId?: string) {
  const current = readNotes();
  const updated = current.map((n) => {
    if (n.id !== id) return n;
    return {
      ...n,
      syncState: "synced" as const,
      cloudId: cloudId ?? n.cloudId,
      lastSyncedAt: new Date().toISOString(),
    };
  });
  saveNotes(updated);
}

function markNoteSyncErrorLocally(id: string) {
  const current = readNotes();
  const updated = current.map((n) => {
    if (n.id !== id) return n;
    return {
      ...n,
      syncState: "conflict" as const,
      lastSyncedAt: undefined,
    };
  });
  saveNotes(updated);
}

export function useNotes() {
  const notes = useStoredValue(
    ATLAS_STORAGE_KEYS.notes,
    INITIAL_NOTES,
    normalizeNotes,
  );
  
  // Exclude soft-deleted notes for local-first UI views (NotesPage, dashboard, etc.)
  const sortedNotes = useMemo(
    () =>
      [...notes]
        .filter((note) => !note.deletedAt)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [notes],
  );

  function addNote(draft: NoteDraft) {
    const now = new Date().toISOString();
    const isSynced = isNotesCloudSynced();
    const note: Note = {
      ...draft,
      id: `${Date.now()}-note`,
      title: draft.title.trim(),
      area: draft.area.trim() || "Personal",
      tags: draft.tags.map((tag) => tag.trim()).filter(Boolean),
      content: draft.content.trim(),
      createdAt: now,
      updatedAt: now,
      syncState: isSynced ? "dirty" : "local_only",
    };

    saveNotes([note, ...readNotes()]);

    if (isSynced) {
      pushNoteToCloud(note).then((res) => {
        if (res.ok) {
          markNoteSyncedLocally(note.id, res.cloudId);
        } else {
          markNoteSyncErrorLocally(note.id);
        }
      });
    }

    return note;
  }

  function updateNote(id: string, updates: Partial<NoteDraft>) {
    const isSynced = isNotesCloudSynced();
    const current = readNotes();
    let updatedNoteRef: Note | null = null;
    const updatedNotes = current.map((note) => {
      if (note.id !== id) return note;
      const updated = normalizeNote({
        ...note,
        ...updates,
        tags: updates.tags
          ? updates.tags.map((t) => t.trim()).filter(Boolean)
          : note.tags,
        updatedAt: new Date().toISOString(),
        syncState: isSynced ? "dirty" : note.syncState,
      });
      updatedNoteRef = updated;
      return updated;
    });

    saveNotes(updatedNotes);

    if (isSynced && updatedNoteRef) {
      const noteToPush = updatedNoteRef as Note;
      pushNoteToCloud(noteToPush).then((res) => {
        if (res.ok) {
          markNoteSyncedLocally(noteToPush.id, res.cloudId);
        } else {
          markNoteSyncErrorLocally(noteToPush.id);
        }
      });
    }
  }

  function deleteNote(id: string) {
    const isSynced = isNotesCloudSynced();
    const current = readNotes();
    const noteToDelete = current.find((n) => n.id === id);

    if (!noteToDelete) return;

    if (!isSynced) {
      // Local-only behavior: delete immediately
      saveNotes(current.filter((note) => note.id !== id));
      return;
    }

    // Cloud-synced behavior: soft-delete locally first
    const softDeletedNote = {
      ...noteToDelete,
      deletedAt: new Date().toISOString(),
      syncState: "dirty" as const,
    };

    const updatedNotes = current.map((n) => (n.id === id ? softDeletedNote : n));
    saveNotes(updatedNotes);

    pushNoteDeleteToCloud(softDeletedNote).then((res) => {
      if (res.ok) {
        // Remove completely from localStorage on success
        saveNotes(readNotes().filter((n) => n.id !== id));
      } else {
        // Keep soft-deleted but mark sync state as error/conflict
        markNoteSyncErrorLocally(softDeletedNote.id);
      }
    });
  }

  function importCloudNote(cloudNote: Note) {
    const generatedLocalId = `${Date.now()}-note`;
    const localCopy: Note = {
      id: generatedLocalId,
      title: `${cloudNote.title} [Cloud Copy]`,
      area: cloudNote.area || "Personal",
      tags: [...cloudNote.tags],
      content: cloudNote.content,
      createdAt: cloudNote.createdAt,
      updatedAt: cloudNote.updatedAt,
      syncState: "local_only",
      cloudId: cloudNote.id,
      localId: generatedLocalId,
    };
    saveNotes([normalizeNote(localCopy), ...readNotes()]);
  }

  return {
    notes: sortedNotes,
    addNote,
    importCloudNote,
    updateNote,
    deleteNote,
  };
}
