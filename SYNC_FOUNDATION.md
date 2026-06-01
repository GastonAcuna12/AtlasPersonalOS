# Atlas Sync Foundation

Atlas now has a general sync foundation for metadata and status only. This is a
preparation layer for future module-by-module Supabase sync, not an active sync
system.

## What Was Added

- Shared sync TypeScript types in `src/types/sync.ts`.
- A module sync registry in `src/lib/sync/registry.ts`.
- Local sync metadata storage helpers in `src/lib/sync/state.ts`.
- Local migration preview count helpers in `src/lib/sync/preview.ts`.
- A read-only Sync Status panel in Settings.

## Metadata Only

This foundation does not sync records, migrate data, upload local records,
download cloud records into modules, or change any module source of truth.

All daily Atlas modules still use the existing localStorage data layer.

## `atlas.syncState`

Future sync metadata can be stored under:

```text
atlas.syncState
```

The shape includes:

- workspace mode
- per-module sync status
- last synced timestamp
- last error
- migration completed timestamp
- optional cloud workspace id
- record count metadata
- migration id map
- updated timestamp

If the key is missing or malformed, Atlas safely falls back to `local_only`.

The key is intentionally separate from the existing Atlas domain data export
shape for now. It is sync metadata, not user workspace content.

## Module Registry

The registry describes:

- Notes
- Tasks
- Goals
- Academics
- Gym
- Work
- Finances

Each module has a label key, sensitivity, local storage domains, Supabase POC
tables, rollout order, and current capabilities. All modules are marked as local
and cloud POC capable, but real sync is still not enabled.

Finances is high sensitivity and remains transactions-only for the cloud POC.
Savings and finance settings remain excluded from cloud sync.

## Migration Preview Counts

The preview framework reads local counts only:

- notes
- tasks
- goals
- academics subjects/tasks/sessions
- gym logs
- work clients/items
- finance transactions

It does not show private record contents. It does not call Supabase. It does not
write to localStorage.

## What This Does Not Do

- No real sync
- No migration
- No automatic upload
- No automatic download
- No merge
- No replace
- No realtime
- No offline queue
- No cloud-driven dashboard
- No cloud-driven XP or streaks
- No finance calculation changes

## Current Source Of Truth

Atlas still uses localStorage as the source of truth for every module.

Cloud Diagnostics remains a manual developer/testing area for Supabase POCs.
Those panels are separate from real sync and do not affect local module state.

## Next Step

The next safe product step is a Notes real sync plan or implementation. Notes
should graduate first because it is lower risk than tasks, goals, work, or
finances, and its RLS proof-of-concept has already passed manual testing.

## Safety Checklist

Before real sync is implemented:

- Confirm JSON export works.
- Confirm local-only mode works with no Supabase env vars.
- Confirm signed-out mode works.
- Confirm two-user RLS still passes.
- Confirm no module becomes login-required.
- Confirm no cloud data feeds dashboard, XP, streaks, Today, Calendar, or
  finance calculations until explicitly designed.
- Confirm every migration action has preview, backup prompt, and confirmation.
