# Supabase Gym Proof Of Concept

Atlas now has a manual cloud-backed proof-of-concept for Gym only.

This is not a full migration. Local gym logs remain the default source of
truth. Atlas does not automatically upload, merge, replace, or delete local
gym data.

Cloud gym logs do not affect Dashboard summaries, Calendar, XP, streaks, local
gym stats, workout calendar, daily wraps, or weekly reviews.

Per `SYNC_ARCHITECTURE_AND_UX_PLAN.md`, visible cloud POC panels are temporary
testing surfaces. They should eventually move to Settings, Cloud Diagnostics,
or disappear once unified cloud mode exists.

## What Was Implemented

- Gym-only Supabase helpers at `src/lib/supabase/gym.ts`.
- A manual Gym cloud panel on `/gym`.
- A non-running SQL setup file at `supabase/sql/005_gym.sql`.
- Separate display for loaded cloud gym logs.
- Manual cloud actions only.
- SQL check constraints for closed workout values and score bounds.
- Manual Cloud QA helper coverage for Gym in Settings.

## What Remains Disabled

- No automatic localStorage-to-Supabase migration.
- No background sync.
- No cloud writes for finances, work, calendar, dashboard, reviews, settings,
  or any other module.
- No automatic merge between local gym logs and cloud gym logs.
- No automatic deletion of local gym logs.
- No upload-all workflow.
- No cloud gym logs in Dashboard.
- No cloud gym logs in Calendar.
- No cloud gym logs in local streak calculations.
- No XP changes from cloud gym actions.

## Gym Table Schema

The POC uses one table:

- `public.gym_logs`

### `public.gym_logs`

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `workout_date date not null`
- `workout_type text not null`
- `title text`
- `notes text not null default ''`
- `duration_minutes integer`
- `energy_score integer`
- `intensity_score integer`
- `intensity text`
- `exercises jsonb not null default '[]'::jsonb`
- `is_rest_day boolean not null default false`
- `completed_at timestamptz`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `deleted_at timestamptz`

`energy_score` and `intensity_score` map to the current Atlas local Gym model,
which stores 1-10 numeric scores. The optional `intensity` text field is kept
flexible for future descriptive labels. `exercises` is reserved for future
structured exercise detail; current Atlas local Gym uses freeform notes.

## Indexes

The table includes indexes for:

- `user_id`
- `workout_date`
- `updated_at desc`
- `workout_type`
- `deleted_at`

## Data Constraints

The SQL constrains values that are closed in Atlas today:

- `workout_type`: `Push`, `Pull`, `Legs`, `Full Body`, `Cardio`, `Rest`,
  `Other`
- `duration_minutes`: null or greater than or equal to `0`
- `energy_score`: null or between `1` and `10`
- `intensity_score`: null or between `1` and `10`
- `exercises`: must be a JSON array
- `is_rest_day`: must match whether `workout_type` is `Rest`

The following fields remain intentionally flexible:

- `title`, because the local model does not currently require titles.
- `notes`, because Atlas stores freeform gym details there.
- `intensity`, because the local model uses numeric `intensity_score`.
- `exercises`, because structured exercise tracking is not implemented yet.

## RLS Policy Plan

Every cloud gym row must be owned by a Supabase Auth user through `user_id`.

Required policies:

- `SELECT`: users can read only rows where `auth.uid() = user_id`.
- `INSERT`: users can insert only rows where `auth.uid() = user_id`.
- `UPDATE`: users can update only rows where `auth.uid() = user_id`.
- `DELETE`: users can delete only rows where `auth.uid() = user_id`.

Authentication alone is not enough. RLS must be enabled before real gym data is
stored in Supabase.

## SQL Setup

The SQL file is documentation plus a ready-to-review migration script:

`supabase/sql/005_gym.sql`

To test manually:

1. Open the Supabase SQL editor for the intended project.
2. Review the SQL file.
3. Run it manually.
4. Confirm RLS is enabled on `public.gym_logs`.
5. Confirm all ownership policies exist.
6. Rerun the two-user RLS test after applying SQL updates.

Do not add service role keys to Atlas client code.

## Local-First Fallback

When Supabase is not configured or the user is signed out:

- `/gym` continues using localStorage.
- Local quick logging, detailed logging, delete, calendar, insights, XP,
  streaks, dashboard, and Calendar behavior remain unchanged.
- Cloud gym actions are hidden or unavailable.
- No cloud helper writes run.

When signed in:

- Cloud actions are still manual.
- Loaded cloud data appears in a separate `Cloud Gym Preview` section.
- Local gym data is not overwritten by cloud data.
- Cloud gym data is not merged into local Gym.
- Cloud gym data is not added to Dashboard, Calendar, XP, or streaks.

## Manual Cloud Actions

The current POC supports:

- Load cloud gym logs.
- Create a safe test cloud gym log.
- Upload one selected local gym log copy after confirmation.

Upload all local gym logs is intentionally disabled and marked as coming soon.

## Migration Safety Rules

Future migration must follow `CLOUD_QA_CHECKLIST.md` and these rules:

- Never auto-upload local gym logs.
- Always ask for explicit confirmation.
- Always preserve a local JSON export path.
- Always show record counts before and after migration.
- Never delete local gym records immediately after upload.
- Make merge/replace behavior explicit.
- Keep cloud gym data visually separated until a real migration is
  implemented.
- Do not sync Dashboard, Calendar, XP, streaks, or local gym stats until
  source-of-truth rules are settled.
- Test RLS with at least two users before storing real gym data.

## Two-User RLS Testing Checklist

- [ ] User A signs in.
- [ ] User A creates a cloud gym log.
- [ ] User A can load that cloud gym log.
- [ ] User A signs out.
- [ ] User B signs in.
- [ ] User B cannot load User A's cloud gym logs.
- [ ] User B creates their own cloud gym log.
- [ ] User B can load their own cloud gym log.
- [ ] User B signs out.
- [ ] User A signs in again.
- [ ] User A cannot load User B's cloud gym log.

## Error Handling Checklist

- [ ] Missing env vars show local-only Gym status.
- [ ] Signed-out users see Account guidance and no cloud actions.
- [ ] Missing `gym_logs` table shows a safe setup error.
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

## Why Local Gym Remains Untouched

This proof-of-concept validates Supabase client access, auth ownership, RLS,
and table constraints for Gym. It is intentionally separate from the local Gym
data layer so Atlas can keep its stable local-first training workflow while
cloud storage is tested carefully.
