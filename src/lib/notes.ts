"use client";

import { useMemo } from "react";
import {
  ATLAS_STORAGE_KEYS,
  readFromStorage,
  useStoredValue,
  writeToStorage,
} from "@/lib/storage";
import type { Note, NoteDraft } from "@/types/atlas";

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

function readNotes() {
  return readFromStorage(ATLAS_STORAGE_KEYS.notes, INITIAL_NOTES, normalizeNotes);
}

function saveNotes(notes: Note[]) {
  writeToStorage(ATLAS_STORAGE_KEYS.notes, notes);
}

export function useNotes() {
  const notes = useStoredValue(
    ATLAS_STORAGE_KEYS.notes,
    INITIAL_NOTES,
    normalizeNotes,
  );
  const sortedNotes = useMemo(
    () => [...notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [notes],
  );

  function addNote(draft: NoteDraft) {
    const now = new Date().toISOString();
    const note: Note = {
      ...draft,
      id: `${Date.now()}-note`,
      title: draft.title.trim(),
      area: draft.area.trim() || "Personal",
      tags: draft.tags.map((tag) => tag.trim()).filter(Boolean),
      content: draft.content.trim(),
      createdAt: now,
      updatedAt: now,
    };

    saveNotes([note, ...readNotes()]);
    return note;
  }

  function updateNote(id: string, updates: Partial<NoteDraft>) {
    const current = readNotes();
    const updatedNotes = current.map((note) => {
      if (note.id !== id) return note;
      return normalizeNote({
        ...note,
        ...updates,
        tags: updates.tags
          ? updates.tags.map((t) => t.trim()).filter(Boolean)
          : note.tags,
        updatedAt: new Date().toISOString(),
      });
    });
    saveNotes(updatedNotes);
  }

  function deleteNote(id: string) {
    saveNotes(readNotes().filter((note) => note.id !== id));
  }

  return {
    notes: sortedNotes,
    addNote,
    updateNote,
    deleteNote,
  };
}
