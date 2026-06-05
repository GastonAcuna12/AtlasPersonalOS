# Supabase Notes Proof Of Concept

Atlas now has a manual cloud-backed proof-of-concept for Notes only.

This is not a full migration. Local notes remain the default source of truth,
and Atlas does not automatically upload, merge, replace, or delete local notes.

## What Was Implemented

- A Notes-only Supabase helper at `src/lib/supabase/notes.ts`.
- A manual Notes cloud panel on `/notes`.
- A non-running SQL setup file at `supabase/sql/001_notes.sql`.
- Separate display for loaded cloud notes.
- Manual cloud actions only.

## What Is Still Disabled

- No automatic localStorage-to-Supabase migration.
- No background sync.
- No cloud writes for finances, work, goals, tasks, gym, academics, reviews, or settings.
- No automatic merge between local notes and cloud notes.
- No automatic deletion of local notes.
- No upload-all workflow.

## Notes Table Schema

Suggested table: `public.notes`

Columns:

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `title text not null`
- `content text not null default ''`
- `area text`
- `tags text[] not null default '{}'`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `deleted_at timestamptz`

Indexes:

- `user_id`
- `updated_at`
- `deleted_at`
- `tags` using GIN for later tag search

## RLS Policy Plan

Every cloud note must be owned by a Supabase Auth user through `user_id`.

Required policies:

- `SELECT`: users can read only notes where `auth.uid() = user_id`.
- `INSERT`: users can insert only notes where `auth.uid() = user_id`.
- `UPDATE`: users can update only notes where `auth.uid() = user_id`.
- `DELETE`: users can delete only notes where `auth.uid() = user_id`.

Authentication alone is not enough. RLS must be enabled before real personal
notes are stored in Supabase.

## SQL Setup

The SQL file is documentation plus a ready-to-review migration script:

`supabase/sql/001_notes.sql`

To test manually:

1. Open the Supabase SQL editor for the intended project.
2. Review the SQL file.
3. Run it manually.
4. Confirm RLS is enabled on `public.notes`.
5. Confirm all four ownership policies exist.

Do not add service role keys to Atlas client code.

## Local-First Fallback

When Supabase is not configured or the user is signed out:

- `/notes` continues using localStorage.
- Local note create/delete/export behavior remains unchanged.
- Cloud actions are hidden or unavailable.
- No cloud helper writes run.

When signed in:

- Cloud actions are still manual.
- Loaded cloud notes appear in a separate `Cloud Notes` section.
- Local notes are not overwritten by cloud notes.
- Cloud notes are not merged into local notes.

## Manual Cloud Actions

The current POC supports:

- Load cloud notes.
- Create a safe test cloud note.
- Upload one selected local note after confirmation.

The upload-selected action sends that note's title, content, area, and tags to
Supabase. It does not modify or delete the local note.

Upload all local notes is intentionally disabled and marked as coming soon.

## Migration Rules

Future migration must follow these rules:

- Never auto-upload local notes.
- Always ask for explicit confirmation.
- Always preserve a local JSON export path.
- Always show record counts before and after migration.
- Never delete local notes immediately after upload.
- Make merge/replace behavior explicit.
- Test RLS with at least two users before storing real notes.

## Testing Checklist

No env vars:

- `/notes` loads.
- Local notes work.
- No cloud actions run.
- No crashes.

Env vars configured, signed out:

- `/notes` loads.
- Local notes work.
- Cloud note actions are unavailable.

Env vars configured, signed in, table exists:

- Load cloud notes manually.
- Create a test cloud note manually.
- Upload one selected local note only after confirmation.
- Confirm local notes remain unchanged.

Table missing:

- Cloud helper returns a safe error.
- The app does not crash.

Two-user RLS test:

- User A can create and read User A notes.
- User B can create and read User B notes.
- User A cannot read, update, or delete User B notes.
- User B cannot read, update, or delete User A notes.

## Why Local Notes Remain Untouched

This proof-of-concept validates Supabase client access, auth ownership, and RLS
shape for one low-risk module. It is intentionally separate from the local Notes
data layer so Atlas can keep its stable local-first behavior while cloud storage
is tested carefully.
