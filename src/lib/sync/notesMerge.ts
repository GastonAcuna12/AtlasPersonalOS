"use client";

import { readNotes, saveNotes, type Note } from "@/lib/notes";
import { uploadLocalNotesToCloud } from "@/lib/supabase/notes";

export type MergeExecutionResult = {
  uploadedCount: number;
  importedCount: number;
  conflictCopiesCreated: number;
  skippedCount: number;
  errors: string[];
};

/**
 * Controlled merge execution logic for Phase 6B.
 * Reconciles local and cloud notes lists safely.
 */
export async function executeControlledNotesMerge(
  localNotes: Note[],
  cloudNotes: Note[]
): Promise<MergeExecutionResult> {
  const result: MergeExecutionResult = {
    uploadedCount: 0,
    importedCount: 0,
    conflictCopiesCreated: 0,
    skippedCount: 0,
    errors: [],
  };

  try {
    const localActive = localNotes.filter((n) => !n.deletedAt);
    const cloudActive = cloudNotes.filter((n) => !n.deletedAt);

    // Track matching local/cloud records
    const matchedCloudIds = new Set<string>();
    const matchedLocalIds = new Set<string>();

    const localNotesToSave = [...readNotes()]; // load fresh copy of all notes

    // Helper to find local note by ID in our localNotesToSave mutable array
    const findLocalNoteMut = (id: string) => localNotesToSave.find((n) => n.id === id);

    // 1. Process matches and conflicts first
    for (const l of localActive) {
      const c = cloudActive.find(
        (cloudNote) =>
          cloudNote.localId === l.id ||
          cloudNote.localId === l.localId ||
          l.cloudId === cloudNote.id ||
          l.id === cloudNote.id
      );

      if (c) {
        matchedCloudIds.add(c.id);
        matchedLocalIds.add(l.id);

        const localTime = new Date(l.updatedAt).getTime();
        const cloudTime = new Date(c.updatedAt).getTime();
        const timeDiffSeconds = Math.abs(localTime - cloudTime) / 1000;

        if (timeDiffSeconds <= 5) {
          // A. Timestamps are close enough: No Action Needed
          result.skippedCount++;
        } else if (localTime > cloudTime) {
          // B. Local is clearly newer: Upload local version to cloud (idempotent upsert)
          const uploadResult = await uploadLocalNotesToCloud([l]);
          if (uploadResult.ok) {
            result.uploadedCount++;
            // Update local note reference to store the cloud ID if it was missing
            const localNoteMut = findLocalNoteMut(l.id);
            if (localNoteMut) {
              localNoteMut.cloudId = c.id;
              localNoteMut.localId = l.id;
              localNoteMut.syncState = "local_only";
            }
          } else {
            result.errors.push(`Upload matched note '${l.title}' failed: ${uploadResult.error}`);
          }
        } else {
          // C. Cloud is clearly newer: Create a local conflict copy from cloud instead of overwriting
          const alreadyConflict = localNotes.some(
            (n) =>
              !n.deletedAt &&
              n.cloudId === c.id &&
              (n.syncState === "conflict" || n.title.endsWith("[Conflict - Cloud]"))
          );

          if (alreadyConflict) {
            result.skippedCount++;
          } else {
            const conflictId = `${Date.now() + Math.random()}-note`;
            const conflictNote: Note = {
              id: conflictId,
              title: `${c.title} [Conflict - Cloud]`,
              area: c.area || "Personal",
              tags: [...(c.tags || [])],
              content: c.content,
              createdAt: c.createdAt,
              updatedAt: c.updatedAt,
              syncState: "conflict",
              cloudId: c.id,
              localId: conflictId,
            };
            localNotesToSave.push(conflictNote);
            result.conflictCopiesCreated++;
          }
        }
      }
    }

    // 2. Process Local-only Notes: Upload to Supabase
    const localOnlyNotes = localActive.filter((l) => !matchedLocalIds.has(l.id));
    if (localOnlyNotes.length > 0) {
      const uploadResult = await uploadLocalNotesToCloud(localOnlyNotes);
      if (uploadResult.ok) {
        result.uploadedCount += localOnlyNotes.length;
        for (const l of localOnlyNotes) {
          const localNoteMut = findLocalNoteMut(l.id);
          if (localNoteMut) {
            localNoteMut.localId = l.id;
            localNoteMut.syncState = "local_only";
          }
        }
      } else {
        result.errors.push(`Upload local-only notes failed: ${uploadResult.error}`);
      }
    }

    // 3. Process Cloud-only Notes: Download as local copies
    const cloudOnlyNotes = cloudActive.filter((c) => !matchedCloudIds.has(c.id));
    for (const c of cloudOnlyNotes) {
      const alreadyImported = localNotes.some(
        (n) => !n.deletedAt && (n.cloudId === c.id || n.id === c.id)
      );

      if (alreadyImported) {
        result.skippedCount++;
      } else {
        const generatedLocalId = `${Date.now() + Math.random()}-note`;
        const localCopy: Note = {
          id: generatedLocalId,
          title: `${c.title} [Cloud Copy]`,
          area: c.area || "Personal",
          tags: [...(c.tags || [])],
          content: c.content,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          syncState: "local_only",
          cloudId: c.id,
          localId: generatedLocalId,
        };
        localNotesToSave.push(localCopy);
        result.importedCount++;
      }
    }

    // Save all additions / modifications back to localStorage atomically
    saveNotes(localNotesToSave);

  } catch (err: unknown) {
    result.errors.push(err instanceof Error ? err.message : String(err));
  }

  return result;
}
