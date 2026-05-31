# Supabase Tasks Proof Of Concept

Atlas now has a manual cloud-backed proof-of-concept for Tasks only.

This is not a full migration. Local tasks remain the default source of truth,
and Atlas does not automatically upload, merge, replace, or delete local tasks.
Cloud tasks do not affect Today statistics, XP, streaks, dashboard summaries,
Daily Wrap, or daily planning status.

## What Was Implemented

- A Tasks-only Supabase helper at `src/lib/supabase/tasks.ts`.
- A manual Tasks cloud panel on `/today`.
- A non-running SQL setup file at `supabase/sql/002_tasks.sql`.
- Separate display for loaded cloud tasks.
- Manual cloud actions only.

## What Remains Disabled

- No automatic localStorage-to-Supabase migration.
- No background sync.
- No cloud writes for Notes, finances, work, goals, gym, academics, calendar,
  reviews, settings, or any other module.
- No automatic merge between local tasks and cloud tasks.
- No automatic deletion of local tasks.
- No upload-all workflow.
- No cloud tasks in the local Today agenda.
- No XP, streak, dashboard, or Daily Wrap changes from cloud task actions.

## Tasks Table Schema

Suggested table: `public.tasks`

Columns:

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `title text not null`
- `notes text not null default ''`
- `area text`
- `task_type text`
- `priority text`
- `status text not null default 'backlog'`
- `planned_date date`
- `due_date date`
- `estimated_minutes integer`
- `energy_required text`
- `completed_at timestamptz`
- `skipped_at timestamptz`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `deleted_at timestamptz`

Indexes:

- `user_id`
- `updated_at desc`
- `planned_date`
- `due_date`
- `status`
- `deleted_at`

Atlas local task statuses are `backlog`, `today`, `in_progress`, `completed`,
and `skipped`, so the SQL default uses `backlog` instead of a generic `active`
status.

## RLS Policy Plan

Every cloud task must be owned by a Supabase Auth user through `user_id`.

Required policies:

- `SELECT`: users can read only tasks where `auth.uid() = user_id`.
- `INSERT`: users can insert only tasks where `auth.uid() = user_id`.
- `UPDATE`: users can update only tasks where `auth.uid() = user_id`.
- `DELETE`: users can delete only tasks where `auth.uid() = user_id`.

Authentication alone is not enough. RLS must be enabled before real personal
tasks are stored in Supabase.

## SQL Setup

The SQL file is documentation plus a ready-to-review migration script:

`supabase/sql/002_tasks.sql`

To test manually:

1. Open the Supabase SQL editor for the intended project.
2. Review the SQL file.
3. Run it manually.
4. Confirm RLS is enabled on `public.tasks`.
5. Confirm all four ownership policies exist.

Do not add service role keys to Atlas client code.

## Local-First Fallback

When Supabase is not configured or the user is signed out:

- `/today` continues using localStorage.
- Local task creation, status changes, XP, Daily Wrap, and planning behavior
  remain unchanged.
- Cloud task actions are hidden or unavailable.
- No cloud helper writes run.

When signed in:

- Cloud actions are still manual.
- Loaded cloud tasks appear in a separate `Cloud Tasks Preview` section.
- Local tasks are not overwritten by cloud tasks.
- Cloud tasks are not merged into local tasks.
- Cloud tasks are not added to the local Today agenda.

## Manual Cloud Actions

The current POC supports:

- Load cloud tasks.
- Create a safe test cloud task.
- Upload one selected local task copy after confirmation.

The upload-selected action sends that task's title, notes, area, type, priority,
status, dates, estimated minutes, and energy to Supabase. It does not modify,
mark, or delete the local task.

Upload all local tasks is intentionally disabled and marked as coming soon.

## Migration Safety Rules

Future migration must follow `CLOUD_QA_CHECKLIST.md` and these rules:

- Never auto-upload local tasks.
- Always ask for explicit confirmation.
- Always preserve a local JSON export path.
- Always show record counts before and after migration.
- Never delete local tasks immediately after upload.
- Make merge/replace behavior explicit.
- Keep cloud tasks visually separated until a real migration is implemented.
- Test RLS with at least two users before storing real tasks.

## Two-User RLS Testing Checklist

- [ ] User A signs in.
- [ ] User A creates a cloud task.
- [ ] User A can load that cloud task.
- [ ] User A signs out.
- [ ] User B signs in.
- [ ] User B cannot load User A's cloud task.
- [ ] User B creates their own cloud task.
- [ ] User B can load their own cloud task.
- [ ] User B signs out.
- [ ] User A signs in again.
- [ ] User A cannot load User B's cloud task.

## Error Handling Checklist

- [ ] Missing env vars show local-only tasks status.
- [ ] Signed-out users see Account guidance and no cloud actions.
- [ ] Missing `public.tasks` table shows a safe setup error.
- [ ] RLS denial shows a safe security-policy error.
- [ ] Network errors show a safe connection error.
- [ ] Failed cloud actions do not mutate local data.

## How This Follows CLOUD_QA_CHECKLIST.md

- Manual CRUD only.
- RLS ownership pattern uses `auth.uid() = user_id`.
- Two-user isolation test is required before graduation.
- Local-first mode remains default.
- Upload selected requires confirmation.
- Upload all is disabled.
- Cloud data is visually separated.
- Lint and build must pass after changes.

## Why Local Tasks Remain Untouched

This proof-of-concept validates Supabase client access, auth ownership, and RLS
shape for a second module. It is intentionally separate from the local Tasks
data layer so Atlas can keep its stable local-first daily planning workflow
while cloud storage is tested carefully.
