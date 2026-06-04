# Supabase Academics Proof Of Concept

Atlas now has a manual cloud-backed proof-of-concept for Academics only.

This is not a full migration. Local academic subjects, academic tasks, and
study sessions remain the default source of truth. Atlas does not automatically
upload, merge, replace, or delete local academic data.

Cloud academic data does not affect Today, Calendar, dashboard summaries, XP,
streaks, local academic workload, local deadlines, or local study statistics.

Per `SYNC_ARCHITECTURE_AND_UX_PLAN.md`, visible cloud POC panels are temporary
testing surfaces. They should eventually move to Settings, Cloud Diagnostics,
or disappear once unified cloud mode exists.

## What Was Implemented

- Academics-only Supabase helpers at `src/lib/supabase/academics.ts`.
- A manual Academics cloud panel on `/academics`.
- A non-running SQL setup file at `supabase/sql/004_academics.sql`.
- Separate display for loaded cloud subjects, tasks, and study sessions.
- Manual cloud actions only.
- SQL check constraints for closed academic values.
- Same-user subject ownership validation for cloud task/session references.

## What Remains Disabled

- No automatic localStorage-to-Supabase migration.
- No background sync.
- No cloud writes for finances, work, gym, calendar, dashboard, reviews,
  settings, or any other module.
- No automatic merge between local academics and cloud academics.
- No automatic deletion of local academics data.
- No upload-all workflow.
- No cloud academic tasks in Today.
- No cloud academic data in Calendar.
- No cloud academic data in dashboard widgets.
- No XP or streak changes from cloud academic actions.
- No local study stats updates from cloud study sessions.

## Academic Tables Schema

The POC uses three tables:

- `public.academic_subjects`
- `public.academic_tasks`
- `public.study_sessions`

### `public.academic_subjects`

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `name text not null`
- `color text`
- `professor text`
- `schedule text`
- `notes text not null default ''`
- `status text not null default 'active'`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `deleted_at timestamptz`

### `public.academic_tasks`

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `subject_id uuid references public.academic_subjects(id) on delete set null`
- `title text not null`
- `description text not null default ''`
- `status text not null default 'backlog'`
- `priority text`
- `due_date date`
- `planned_date date`
- `task_type text`
- `estimated_minutes integer`
- `energy_required text`
- `grade text`
- `completed_at timestamptz`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `deleted_at timestamptz`

`academic_tasks` maps to the current Atlas shared task model where academic
tasks are local `AtlasTask` records with `area: "Academic"`.

### `public.study_sessions`

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `subject_id uuid references public.academic_subjects(id) on delete set null`
- `title text`
- `notes text not null default ''`
- `date date not null`
- `duration_minutes integer`
- `focus_score integer`
- `created_from text`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `deleted_at timestamptz`

## Indexes

Each table includes indexes for:

- `user_id`
- `updated_at desc`
- `deleted_at`

Additional indexes:

- `academic_tasks.subject_id`
- `academic_tasks.due_date`
- `academic_tasks.status`
- `study_sessions.subject_id`
- `study_sessions.date`

## Data Constraints

The SQL constrains values that are closed in Atlas today:

- Subject `status`: `active`, `archived`
- Academic task `status`: `backlog`, `today`, `in_progress`, `completed`,
  `skipped`
- Academic task `priority`: `low`, `medium`, `high`, `critical`
- Academic task `task_type`: `Assignment`, `Exam`, `Reading`, `Project`,
  `Presentation`, `Practice`, `Other`
- Academic task `energy_required`: `low`, `medium`, `high`
- Academic task `estimated_minutes`: null or greater than or equal to `0`
- Study session `duration_minutes`: null or greater than or equal to `0`
- Study session `focus_score`: null or between `1` and `10`

The following fields remain intentionally flexible:

- Subject `color`, because current Atlas stores Tailwind accent classes and may
  later support custom colors.
- Subject `professor`, `schedule`, and `notes`.
- Academic task `description` and `grade`.
- Study session `title`, `notes`, and `created_from`.

## Subject Ownership Safety

Academic tasks and study sessions may optionally reference a cloud subject.

The SQL includes a trigger that rejects inserts or updates when `subject_id`
does not belong to the same `user_id`. This prevents a cloud academic task or
study session from linking to another user's cloud subject, even if the subject
UUID is known.

Local Atlas subject IDs are not UUIDs, so manual local item uploads may create
unlinked cloud copies until a real migration maps local IDs to cloud UUIDs.

## RLS Policy Plan

Every cloud academic row must be owned by a Supabase Auth user through
`user_id`.

Required policies for each table:

- `SELECT`: users can read only rows where `auth.uid() = user_id`.
- `INSERT`: users can insert only rows where `auth.uid() = user_id`.
- `UPDATE`: users can update only rows where `auth.uid() = user_id`.
- `DELETE`: users can delete only rows where `auth.uid() = user_id`.

Authentication alone is not enough. RLS must be enabled before real academic
data is stored in Supabase.

## SQL Setup

The SQL file is documentation plus a ready-to-review migration script:

`supabase/sql/004_academics.sql`

To test manually:

1. Open the Supabase SQL editor for the intended project.
2. Review the SQL file.
3. Run it manually.
4. Confirm RLS is enabled on all three academic tables.
5. Confirm all ownership policies exist.
6. Rerun the two-user RLS test after applying SQL updates.

Do not add service role keys to Atlas client code.

## Local-First Fallback

When Supabase is not configured or the user is signed out:

- `/academics` continues using localStorage and local tasks.
- Local subject creation, archiving, academic task creation, task completion,
  study sessions, XP, Today, Calendar, and dashboard behavior remain unchanged.
- Cloud academic actions are hidden or unavailable.
- No cloud helper writes run.

When signed in:

- Cloud actions are still manual.
- Loaded cloud data appears in a separate `Cloud Academics Preview` section.
- Local academic data is not overwritten by cloud data.
- Cloud data is not merged into local Academics.
- Cloud academic tasks are not added to Today or Calendar.

## Manual Cloud Actions

The current POC supports:

- Load cloud academic data.
- Create a safe test cloud subject.
- Create a safe test cloud academic task.
- Create a safe test cloud study session.
- Upload one selected local subject copy after confirmation.
- Upload one selected local academic task copy after confirmation.
- Upload one selected local study session copy after confirmation.

Upload all local academic data is intentionally disabled and marked as coming
soon.

## Migration Safety Rules

Future migration must follow `CLOUD_QA_CHECKLIST.md` and these rules:

- Never auto-upload local academic data.
- Always ask for explicit confirmation.
- Always preserve a local JSON export path.
- Always show record counts before and after migration.
- Never delete local academic records immediately after upload.
- Make merge/replace behavior explicit.
- Keep cloud academic data visually separated until a real migration is
  implemented.
- Do not sync Today, Calendar, dashboard, or XP until source-of-truth rules are
  settled.
- Test RLS with at least two users before storing real academic data.

## Two-User RLS Testing Checklist

- [ ] User A signs in.
- [ ] User A creates a cloud subject, academic task, and study session.
- [ ] User A can load those cloud records.
- [ ] User A signs out.
- [ ] User B signs in.
- [ ] User B cannot load User A's academic data.
- [ ] User B creates their own cloud academic data.
- [ ] User B can load their own cloud academic data.
- [ ] User B signs out.
- [ ] User A signs in again.
- [ ] User A cannot load User B's academic data.

## Error Handling Checklist

- [ ] Missing env vars show local-only academics status.
- [ ] Signed-out users see Account guidance and no cloud actions.
- [ ] Missing academic tables show a safe setup error.
- [ ] RLS denial shows a safe security-policy error.
- [ ] Network errors show a safe connection error.
- [ ] Subject relation errors show a safe relation error.
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

## Why Local Academics Remain Untouched

This proof-of-concept validates Supabase client access, auth ownership, RLS, and
same-user subject relationships for Academics. It is intentionally separate
from the local Academics data layer so Atlas can keep its stable local-first
university planning workflow while cloud storage is tested carefully.
