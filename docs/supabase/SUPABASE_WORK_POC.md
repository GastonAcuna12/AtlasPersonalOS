# Supabase Work POC

Atlas Work now has a manual cloud proof-of-concept that follows the Notes,
Tasks, Goals, Academics, and Gym pattern.

This is not sync. This is not migration. Local-first Work remains the default.

## What Was Implemented

- A manual SQL setup file at `supabase/sql/006_work.sql`.
- Cloud helper functions in `src/lib/supabase/work.ts`.
- A separate `Cloud Work Preview` panel on `/work`.
- A Work card in Settings > Cloud QA Checklist.
- English and Spanish labels for the Work cloud POC UI.

The cloud preview can manually:

- Load cloud work clients and work items.
- Create a test cloud client.
- Create a test cloud work item.
- Upload one selected local client copy after confirmation.
- Upload one selected local work item copy after confirmation.

Upload all remains disabled and marked Coming soon.

## What Remains Disabled

- No automatic upload after sign-in.
- No automatic merge.
- No automatic replace.
- No automatic delete.
- No local-to-cloud sync.
- No cloud-to-local sync.
- No Today integration.
- No Dashboard integration.
- No billing summary integration.
- No finance integration.
- No XP or streak changes.

Per `SYNC_ARCHITECTURE_AND_UX_PLAN.md`, visible POC panels are temporary and
should later move into diagnostics or be removed once unified sync is designed.

## Tables

The Work POC uses two user-owned tables:

- `public.work_clients`
- `public.work_items`

### `public.work_clients`

Columns:

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `name text not null`
- `client_type text`
- `status text not null default 'active'`
- `difficulty text`
- `billing_mode text not null default 'per_item'`
- `default_rate numeric`
- `hourly_rate numeric`
- `fixed_monthly_amount numeric`
- `currency text`
- `contact_name text`
- `contact_email text`
- `notes text not null default ''`
- `is_active boolean not null default true`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `deleted_at timestamptz`

`default_rate` maps to Atlas `Client.defaultRate` for per-item client defaults.
`fixed_monthly_amount` maps to Atlas `Client.monthlyRate`.
`hourly_rate` maps to Atlas `Client.hourlyRate`.

### `public.work_items`

Columns:

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `client_id uuid references public.work_clients(id) on delete set null`
- `title text not null`
- `description text not null default ''`
- `status text not null default 'backlog'`
- `priority text`
- `difficulty text`
- `item_type text`
- `estimated_minutes integer`
- `actual_minutes integer`
- `value numeric`
- `currency text`
- `planned_date date`
- `deadline date`
- `completed_at timestamptz`
- `reference_url text`
- `internal_notes text not null default ''`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `deleted_at timestamptz`

Local work item `notes` map to `internal_notes`. Local `referenceUrl` maps to
`reference_url`.

## Constraints

The SQL constrains closed values used by the local Atlas model:

- client type
- client status
- difficulty
- billing mode
- currency
- work item status
- work item priority
- work item type

It also enforces nonnegative numeric values for:

- default rates
- hourly rates
- fixed monthly amounts
- estimated minutes
- actual minutes
- item value

`reference_url` remains plain text for now. The POC does not overconstrain URL
format because local Work currently accepts flexible reference links.

## Ownership Protection

Every row has a `user_id` column.

RLS policies use:

```sql
auth.uid() = user_id
```

for SELECT, INSERT, UPDATE, and DELETE policies.

`work_items.client_id` is protected by a trigger:

- A work item may have `client_id = null`.
- If `client_id` is set, it must reference a non-deleted cloud client owned by
  the same `user_id`.

This prevents cross-user client associations during the POC.

## Manual SQL Setup

Run this file manually in the Supabase SQL Editor:

```text
supabase/sql/006_work.sql
```

Do not run it from app code.

After running it:

1. Confirm `public.work_clients` exists.
2. Confirm `public.work_items` exists.
3. Confirm RLS is enabled on both tables.
4. Confirm own-row policies exist for SELECT, INSERT, UPDATE, and DELETE.
5. Confirm the ownership trigger exists on `public.work_items`.

## Local-First Fallback

When Supabase is not configured:

- `/work` continues to use localStorage.
- The local Work board continues to work.
- No cloud operation runs.

When Supabase is configured but signed out:

- Local Work still works.
- The cloud panel explains that signing in is required for manual cloud testing.

When signed in:

- Cloud actions are manual.
- Cloud clients and items are shown separately.
- Local clients and work items are not overwritten.

## Manual Cloud Actions

The cloud preview supports:

- `Load cloud work data`
- `Create test cloud client`
- `Create test cloud work item`
- `Upload selected local client copy`
- `Upload selected local work item copy`

Selected uploads require browser confirmation and create cloud copies only.
They do not mark local records as synced and do not delete or modify local
records.

If a selected local work item references a local-only client id, the cloud copy
uses `client_id = null`. Local-to-cloud relationship mapping is intentionally
not implemented in this POC.

## Two-User RLS Testing Checklist

Use the Settings > Cloud QA Checklist helper and verify manually:

1. Run `supabase/sql/006_work.sql` in Supabase SQL Editor.
2. Sign in as User A.
3. Create a test cloud client and work item.
4. Load cloud work data and confirm User A sees it.
5. Sign out.
6. Sign in as User B.
7. Load cloud work data and confirm User B does not see User A data.
8. Create User B cloud client and item.
9. Sign out.
10. Sign in as User A again.
11. Confirm User A does not see User B data.
12. Confirm local Work data remains unchanged.
13. Confirm no auto-sync happened.

## Error Handling Checklist

The UI/helper layer should handle:

- missing Supabase env vars
- signed-out users
- missing Work tables
- RLS denial
- network errors
- rejected client/item relations

Errors should be useful without exposing secrets or private data.

## CLOUD_QA_CHECKLIST Alignment

This POC must pass `CLOUD_QA_CHECKLIST.md` before Work can be considered for a
real cloud-backed migration.

Graduation requires:

- manual CRUD works
- RLS passes the two-user test
- local-first fallback works
- migration behavior is explicit
- lint and build pass
- docs are updated

## Why Local Work Remains Untouched

Work is sensitive because it contains client names, references, billing modes,
values, deadlines, and internal notes.

For this POC:

- Cloud records are displayed only in `Cloud Work Preview`.
- Local Work remains powered by localStorage.
- Cloud Work does not affect Today.
- Cloud Work does not affect Dashboard.
- Cloud Work does not affect billing or finance summaries.
- Cloud Work does not award XP.
- Cloud Work does not affect streaks.
