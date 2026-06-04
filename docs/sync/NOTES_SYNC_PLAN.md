# Atlas Notes Cloud Sync Plan

This document outlines the architecture, data strategies, and migration pathways for transitioning the local-first Notes module into a fully cloud-synchronized experience with Supabase.

---

## 1. Current State

### Local-Only Behavior
* All user notes are created, edited, and deleted using local-first storage.
* Data is stored in browser `localStorage` under the key `atlas.notes`.
* The `useNotes` React hook ([src/lib/notes.ts](file:///C:/Users/Gast%C3%B3n/Documents/AppSeguimiento,Proyecto%20largo%20plazo/src/lib/notes.ts)) serves as the data coordination layer.

### Cloud POC Behavior
* A manual Cloud Notes test panel is centralized in **Settings > Cloud Diagnostics > Notes POC** ([src/components/NotesCloudPanel.tsx](file:///C:/Users/Gast%C3%B3n/Documents/AppSeguimiento,Proyecto%20largo%20plazo/src/components/NotesCloudPanel.tsx)).
* It lets signed-in users load test records and manually push a copy of a local note to a Supabase database table (`public.notes`), isolated by Row Level Security (RLS) policies.
* This POC has no automatic sync or background reconciliation.

---

## 2. Why Notes is the First Sync Candidate

Notes has been chosen as the first candidate to receive real background cloud synchronization for the following reasons:
1. **Low Relational Complexity:** Notes are self-contained records. They do not reference other modules (unlike Academics tasks referencing Subjects, or Work items referencing Clients).
2. **Low Trust/Financial Impact:** Notes are qualitative and descriptive. If sync drops or encounters conflicts, there is no risk of breaking core OS math (unlike the Finances ledger, Available Money, or Savings Vaults).
3. **Mature POC baseline:** The database tables, client connections, and RLS policies have already been deployed and manually tested.

---

## 3. SQL Hardening (Phase 1)

In Phase 1, we add sync-ready columns to `public.notes` via `supabase/sql/008_notes_sync_hardening.sql`:
* `local_id` (`text`): Stores the client's local storage identifier (e.g. `1713451234567-note`) to map database rows directly to client objects.
* `synced_at` (`timestamptz`): Tracks when the record was successfully written or confirmed by the sync engine.
* `conflict_state` (`text`): Captures temporary merge or conflict resolution flags.

### Performance and Safety Indices:
* An index is placed on `(user_id, local_id)` to speed up mapping lookups.
* A unique composite index on `(user_id, local_id) where local_id is not null` prevents duplicate record ingestion.

---

## 4. Sync Design Strategies

### Local ID Mapping Strategy
The primary key in local storage is a timestamp string (e.g. `1713451234567-note`). Supabase uses random UUIDs. The bridge is the `local_id` field on the database. When syncing, we query the DB by `local_id` to join, update, or overwrite existing client records.

### Soft Delete Strategy
To prevent deleted items on one client from being re-uploaded by another client during sync:
* Instead of purging records immediately on delete, we set `deletedAt` locally to the current ISO date.
* The sync engine replicates the deletion status by writing to the `deleted_at` field on Supabase.
* Once the soft delete is successfully written and acknowledged by the cloud database, the record is removed entirely from local storage.

### Duplicate Prevention Strategy
* Sync routines utilize Supabase `.upsert(...)` targeting the composite user/local identifier `(user_id, local_id)`.
* This allows network retries or multiple parallel sync requests to merge safely, performing database updates instead of adding duplicate records.

---

## 5. Migration Preview, One-Way Upload, Cloud Preview, Selected Import & Controlled Merge Preview (Phase 2, 3, 4, 5 & 6A Implementation)

A migration preview, one-way upload, read-only cloud metadata preview, selective cloud-to-local import copies, and a controlled merge preview have been implemented in **Settings > Account & Sync** (rendered under `SyncStatusPanel` using [NotesSyncPreviewPanel.tsx](file:///C:/Users/Gast%C3%B3n/Documents/AppSeguimiento,Proyecto%20largo%20plazo/src/components/NotesSyncPreviewPanel.tsx)).

* **Previews Available:**
  * **Config Validation:** If Supabase isn't configured, shows a local-only reminder.
  * **Session Validation:** If signed out, prompts the user to sign in to check counts.
  * **Live Note Counts:** If signed in, queries Supabase using the existing `listCloudNotes()` helper to retrieve active cloud note counts and contrasts them against the local `notes` count (excluding soft-deleted notes).
  * **Action Controls:** Provides a "Refresh Preview" trigger and a "Download JSON Backup" button.
* **One-Way Local-to-Cloud Upload (Phase 3):**
  * Enables a secure "Upload Local Notes to Cloud" migration button.
  * Requires checking an explicit checkbox acknowledgment ("I understand that this action copies my local notes...").
  * Shows a native browser confirmation warning detailing that this is an update/insert flow that prevents duplicate rows using `local_id` composite keys, and will not delete any local or cloud notes.
  * Calls `uploadLocalNotesToCloud` using Supabase `.upsert()` targeting the `(user_id, local_id)` index.
  * Safely updates counts and shows success/error alert feedback upon completion.
* **Cloud Notes Metadata Preview (Phase 4):**
  * Adds a read-only "Cloud notes preview" section allowing users to inspect cloud data before pulling or merging.
  * **Privacy-Preserving:** Avoids dumping private note contents or user IDs. Shows only note titles, areas, tag chips, updated dates, and client-generated mapping IDs.
  * **Local/Cloud Mapping Hints:** Compares cloud note `local_id` against active local notes `id` / `localId` to label them as:
    * `Matches local note`: The note exists locally and is mapped to this cloud record.
    * `Cloud-only`: The cloud record does not match any active local note.
  * **Local Upload Candidates:** Automatically displays active local notes that are not yet mapped on the cloud, labelling them as `Local upload candidate`.
  * **Read-Only / Safe:** No localStorage or Supabase mutations are performed by this preview. It is solely an informational grid.
* **Selected Cloud Note Import (Phase 5):**
  * Adds a selective "Import as local copy" trigger for cloud-only notes.
  * **Confirmation Guard:** Prompts the user with a translated dialog detailing that it creates a local note copy without replacing/deleting other items or activating automatic sync.
  * **Local Copy Metadata:** Generates a new client ID (`localId`), stores the source identifier under `cloudId`, keeps the original timestamps (`createdAt`/`updatedAt`), sets `syncState: "local_only"`, and suffixes the title with ` [Cloud Copy]` to prevent visual confusion.
  * **Duplicate Prevention:** Checks active local notes' `cloudId` matching the cloud row's ID. If a match exists, disables the button and displays `Already imported`.
  * **Read-Only on Cloud:** It consumes the loaded content to insert local notes but performs zero writes, updates, or deletes against Supabase rows.
* **Controlled Merge Preview (Phase 6A):**
  * Introduces a "Controlled Merge Preview" layout mapping active database items against browser items.
  * **Category Resolution:** Separates assets into five distinct categories:
    * *Local-only notes:* Active local notes without a corresponding cloud record (scheduled to upload).
    * *Cloud-only notes:* Active cloud notes without a corresponding local record (scheduled to download).
    * *Matched notes:* Notes where mapping IDs align and timestamps are synchronized.
    * *Potential conflicts:* Mapped notes whose local `updatedAt` and cloud `updated_at` timestamps differ by more than 5 seconds.
    * *Soft-deleted records:* Summary counts of pending deletions.
  * **Privacy Shield:** Leaks zero body details or raw data; presents compact scroll lists.
* **Controlled Merge Execution (Phase 6B):**
  * **Required Backup & Explicit Confirmation:** Requires the user to explicitly verify they have downloaded a backup and understand the merge operation by checking the checkbox ("I downloaded a backup and understand this will align local and cloud notes without deleting either side.") and confirming via a native prompt.
  * **Merge Actions:**
    * *Local-only notes:* Uploaded to Supabase using `uploadLocalNotesToCloud` (idempotent via `local_id`).
    * *Cloud-only notes:* Imported to localStorage as local copies, generating a local ID, mapping `cloudId`, and preserving content.
    * *Matched notes:* If timestamps are close (<= 5s), does nothing. If local is newer, uploads local to cloud. If cloud is newer, imports cloud as a local conflict copy.
    * *Potential conflicts:* Creates a local conflict copy (`"[Conflict - Cloud] Original Title"`, `syncState: "conflict"`, maps `cloudId`) instead of silently overwriting.
    * *Soft deletes:* Deferred in this phase. Soft deletes are counted and skipped.
  * **Idempotency & Safety:** Checks existing local notes matching `cloudId` and title suffixes/sync states to prevent duplicate conflict copy explosions on consecutive runs. Keeps NotesPage local-first (no global `cloud_synced` status or write-through sync yet).
  * **Result Summary:** Displays `uploadedCount`, `importedCount`, `conflictCopiesCreated`, `skippedCount`, and any errors upon completion.
* **Cloud Synced Write-Through Mode (Phase 7):**
  * **Status Activation:** User can activate Notes cloud sync from the settings preview page after a successful controlled merge reconciliation. Sets `atlas.syncState.modules.notes.status = "synced"`.
  * **Cache & Local First:** Local storage `localStorage` continues to act as a high-speed caching layer, rendering instantly in `NotesPage` to preserve the offline-first UX.
  * **Write-Through CRUD:**
    * *Create:* Saves the note locally immediately with `syncState = "dirty"`, pushes to Supabase, and updates to `"synced"` on success. On failure, note is marked `"conflict"`.
    * *Update:* Updates the note locally immediately with `syncState = "dirty"`, updates the cloud row, and marks `"synced"` on success or `"conflict"` on error.
    * *Delete:* Marks the note soft-deleted locally (`deletedAt = now`, `syncState = "dirty"`), hiding it from UI listings. Pushes `deleted_at = now` to Supabase. On success, removes it completely from `localStorage`. On failure, preserves the soft-deleted metadata locally.
  * **Sync Status Indicators:** Renders subtle colored dots on each note card in the `NotesPage` UI to represent sync states (`Synced`, `Pending sync`, `Sync error`, `Local only`).
  * **Safe Failures:** Network write failures, Supabase unconfigured states, or sign-out events do not block local database editing, delete local notes, or crash the application.
  * **Deferred:** Background auto-sync, interval pulls, conflict resolution UX, and automatic retry queues remain future work.

## 6. Future Sync Lifecycle (Unimplemented)

### Background Queue Sync
* Background auto-sync worker that retries pending local `"dirty"` and `"conflict"` state changes when page focus or network connection returns.
* Periodic reconciliation and background interval pulling for multi-device parity.

### Conflict Resolution UI
* Interactive conflict triage panel allowing users to compare local and cloud note fields side-by-side.

---

## 7. What is Intentionally NOT Implemented Yet

To preserve stability, the following sync actions are **explicitly blocked** in this phase:
* **No Real-time Sync for Other Modules:** Calendar, Finances, Gym, Academics, Goals, Tasks, and Work modules remain strictly local-first and local-only.
* **No global workspace cloud_synced mode:** Workspace operations remain local-first, avoiding automatic database locks or global Supabase rewrites.
* **No Automatic Reconciliation Pulls:** Local notes are only written to the cloud on user-triggered actions (controlled merge) or immediate write-through edits.
