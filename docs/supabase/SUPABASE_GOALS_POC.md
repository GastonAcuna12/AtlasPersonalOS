# Supabase Goals Proof Of Concept

Atlas now has a manual cloud-backed proof-of-concept for Goals only.

This is not a full migration. Local goals remain the default source of truth,
and Atlas does not automatically upload, merge, replace, or delete local goals.
Cloud goals do not affect dashboard summaries, finances, Savings Vault,
deadline widgets, XP, streaks, or local goal progress.

Per `SYNC_ARCHITECTURE_AND_UX_PLAN.md`, visible cloud POC panels are temporary
testing surfaces. They should eventually move to Settings, Cloud Diagnostics,
or disappear once unified cloud mode exists.

## What Was Implemented

- A Goals-only Supabase helper at `src/lib/supabase/goals.ts`.
- A manual Goals cloud panel on `/goals`.
- A non-running SQL setup file at `supabase/sql/003_goals.sql`.
- Separate display for loaded cloud goals.
- Manual cloud actions only.
- SQL check constraints for Atlas goal status, currency, linked metric, and
  bounded progress.

## What Remains Disabled

- No automatic localStorage-to-Supabase migration.
- No background sync.
- No cloud writes for finances, Savings Vault, work, gym, academics, calendar,
  reviews, settings, or any other module.
- No automatic merge between local goals and cloud goals.
- No automatic deletion of local goals.
- No upload-all workflow.
- No cloud goals in dashboard goal widgets.
- No cloud goals in deadline widgets.
- No cloud goals in finance or savings calculations.
- No XP or streak changes from cloud goal actions.

## Goals Table Schema

Suggested table: `public.goals`

Columns:

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `title text not null`
- `description text not null default ''`
- `area text`
- `goal_type text`
- `status text not null default 'active'`
- `priority text`
- `current_value numeric`
- `target_value numeric`
- `unit text`
- `currency text`
- `deadline date`
- `linked_metric text`
- `linked_source text`
- `progress numeric`
- `completed_at timestamptz`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `deleted_at timestamptz`

Indexes:

- `user_id`
- `updated_at desc`
- `deadline`
- `status`
- `area`
- `deleted_at`

`description` stores the current Atlas local goal `notes` field. `linked_metric`
stores the current local `linkedFinanceMetric` value, but this POC does not
migrate Savings Vault data or calculate financial goal progress from cloud data.

## Data Constraints

The SQL constrains values that are closed in the Atlas app today:

- `status`: `active`, `completed`, `paused`
- `currency`: `PYG`, `USD`
- `linked_metric`: `none`, `savings`
- `progress`: must be null or between `0` and `100`

The following fields remain intentionally flexible:

- `area`: user-entered text in the current Goals UI.
- `goal_type`: reserved for future classification.
- `priority`: reserved for future goal prioritization.
- `unit`: user-entered text.
- `linked_source`: reserved for future source details.

Nullable fields still allow `null`.

## RLS Policy Plan

Every cloud goal must be owned by a Supabase Auth user through `user_id`.

Required policies:

- `SELECT`: users can read only goals where `auth.uid() = user_id`.
- `INSERT`: users can insert only goals where `auth.uid() = user_id`.
- `UPDATE`: users can update only goals where `auth.uid() = user_id`.
- `DELETE`: users can delete only goals where `auth.uid() = user_id`.

Authentication alone is not enough. RLS must be enabled before real personal
goals are stored in Supabase.

## SQL Setup

The SQL file is documentation plus a ready-to-review migration script:

`supabase/sql/003_goals.sql`

To test manually:

1. Open the Supabase SQL editor for the intended project.
2. Review the SQL file.
3. Run it manually.
4. Confirm RLS is enabled on `public.goals`.
5. Confirm all four ownership policies exist.
6. Rerun the two-user RLS test after applying SQL updates.

Do not add service role keys to Atlas client code.

## Local-First Fallback

When Supabase is not configured or the user is signed out:

- `/goals` continues using localStorage.
- Local goal creation, editing, deletion, Savings Vault behavior, XP, and
  dashboard behavior remain unchanged.
- Cloud goal actions are hidden or unavailable.
- No cloud helper writes run.

When signed in:

- Cloud actions are still manual.
- Loaded cloud goals appear in a separate `Cloud Goals Preview` section.
- Local goals are not overwritten by cloud goals.
- Cloud goals are not merged into local goals.
- Cloud goals are not added to local dashboard, finance, savings, or deadline
  calculations.

## Manual Cloud Actions

The current POC supports:

- Load cloud goals.
- Create a safe test cloud goal.
- Upload one selected local goal copy after confirmation.

The upload-selected action sends that goal's title, notes, area, status,
current value, target value, unit, currency, deadline, and linked metric to
Supabase. It does not modify, mark, or delete the local goal.

Upload all local goals is intentionally disabled and marked as coming soon.

## Migration Safety Rules

Future migration must follow `CLOUD_QA_CHECKLIST.md` and these rules:

- Never auto-upload local goals.
- Always ask for explicit confirmation.
- Always preserve a local JSON export path.
- Always show record counts before and after migration.
- Never delete local goals immediately after upload.
- Make merge/replace behavior explicit.
- Keep cloud goals visually separated until a real migration is implemented.
- Do not sync Savings Vault or savings-linked progress until finance and goals
  source-of-truth rules are settled.
- Test RLS with at least two users before storing real goals.

## Two-User RLS Testing Checklist

- [ ] User A signs in.
- [ ] User A creates a cloud goal.
- [ ] User A can load that cloud goal.
- [ ] User A signs out.
- [ ] User B signs in.
- [ ] User B cannot load User A's cloud goal.
- [ ] User B creates their own cloud goal.
- [ ] User B can load their own cloud goal.
- [ ] User B signs out.
- [ ] User A signs in again.
- [ ] User A cannot load User B's cloud goal.

## Error Handling Checklist

- [ ] Missing env vars show local-only goals status.
- [ ] Signed-out users see Account guidance and no cloud actions.
- [ ] Missing `public.goals` table shows a safe setup error.
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

## Why Local Goals Remain Untouched

This proof-of-concept validates Supabase client access, auth ownership, and RLS
shape for a third module. It is intentionally separate from the local Goals data
layer so Atlas can keep its stable local-first goals, Savings Vault, finance,
and dashboard behavior while cloud storage is tested carefully.
