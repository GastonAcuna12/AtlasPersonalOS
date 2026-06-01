# Atlas Sync Architecture And UX Plan

Atlas began as a stable local-first personal operating system. Supabase is being
introduced carefully as an optional sync layer, not as a replacement for the
local-first product philosophy.

This document defines the intended architecture and user experience before more
modules are migrated to cloud storage.

## 1. Product Principle

Atlas should remain local-first, private, and portable.

Supabase should become an optional sync layer. It should not become the visible
center of the product, and daily-use screens should not feel like database test
tools.

The final experience should feel like one Atlas workspace:

- one set of notes
- one task system
- one Today command center
- one goals experience
- one coherent personal operating system

Users should understand where their data lives, but they should not have to
manage separate local and cloud panels in every module forever.

## 2. Current Temporary State

The current state is intentionally conservative:

- Local data is the default source of truth.
- Notes has a visible Cloud Notes proof-of-concept panel.
- Tasks has a visible Cloud Tasks Preview proof-of-concept panel.
- Cloud data is visually separated from local data for safety.
- No automatic sync exists.
- No automatic migration exists.
- No module uploads local data without explicit manual action.
- No cloud data is merged into local daily workflows.

This split UI is useful during the POC phase because it makes cloud behavior,
RLS, and two-user isolation easier to test. It is not the intended long-term
product experience.

## 3. Final Desired State

The final app should show one unified experience per module:

- one Notes experience
- one Tasks experience
- one Today experience
- one Goals experience
- one Academics experience
- one Work experience
- one Finances experience

The user should not usually see:

- Cloud Notes POC
- Cloud Tasks Preview
- Load cloud tasks
- Create test cloud record
- upload test record controls in daily-use pages

Instead, the product should show clear workspace-level state:

- Sync status
- Last synced
- Pending changes
- Local-only mode
- Cloud-ready mode
- Cloud-synced mode
- Sync error, if any

Technical cloud controls should eventually move out of daily-use screens and
into Settings, Account & Sync, or a Developer / Cloud Diagnostics area.

## 4. Workspace Modes

Atlas should explicitly model workspace sync state.

### local_only

- Data is stored in browser localStorage.
- No login is required.
- JSON export is available.
- Markdown / Obsidian export is available.
- Supabase may be unconfigured or unused.
- This remains a first-class Atlas mode, not a degraded fallback.

### cloud_ready

- User is signed in.
- Supabase is configured.
- No migration has been completed.
- Local data is still the source of truth.
- Migration prompt is available.
- No automatic upload, merge, or replace happens.

### cloud_synced

- Cloud storage is the active source of truth for migrated modules.
- Local cache may exist for responsiveness or offline support.
- Creates, updates, and deletes write to Supabase for migrated modules.
- UI should present one workspace, not separate local and cloud lists.

### offline_pending

- Cloud workspace is active, but network access failed or the app is offline.
- Changes are stored locally as pending operations.
- User can continue working if the module supports offline queueing.
- UI shows pending changes and sync error state.

### migration_pending

- User is signed in and local Atlas data is detected.
- Atlas has not been told whether to keep, upload, merge, or replace data.
- Workspace remains local-first until the user chooses.

## 5. Source Of Truth Model

Atlas should use a clear source-of-truth model:

- In `local_only`, localStorage is the source of truth.
- In `cloud_ready`, localStorage is still the source of truth.
- In `cloud_synced`, Supabase is the source of truth for migrated domains.
- In `offline_pending`, local pending changes are a temporary queue/cache.
- JSON export remains the technical backup format.
- Markdown / Obsidian export remains the human-readable backup format.

Later, local cache should be treated as a sync cache, not a second independent
workspace, once a module is fully cloud-synced.

## 6. Migration Flow

Migration from localStorage to Supabase must be explicit and reversible where
possible.

### Step 1: Detect

Atlas detects:

- signed-in user
- configured Supabase project
- local Atlas data
- existing cloud data, when safe to inspect

### Step 2: Ask

Show a migration prompt with clear choices:

- Keep local only
- Upload local data to cloud
- Merge local and cloud
- Replace cloud with local
- Skip for now

### Step 3: Preview And Confirm

Before upload, merge, or replace:

- show record counts by domain
- show whether cloud data already exists
- recommend JSON export
- require confirmation
- require stronger destructive confirmation for replace actions

No private record contents should be shown unless needed and intentionally
designed.

### Step 4: Verify And Preserve

After migration:

- verify record counts
- report success/failure by domain
- mark workspace mode
- keep local backup available
- do not auto-delete local data
- do not silently overwrite cloud data

## 7. Sync Behavior

Sync should be introduced in phases.

### Phase 1: Manual Migration Only

- POC panels remain separated.
- Manual test records are allowed.
- No realtime.
- No background sync.
- No automatic migration.

### Phase 2: Cloud-Backed Modules One By One

- A migrated module writes creates, updates, and deletes to Supabase only when
  the workspace is in `cloud_synced` mode.
- The same UI works in local-only and cloud-synced modes.
- Module-level sync badges may show state without exposing technical controls.
- Local-only fallback must keep working.

### Phase 3: Optional Local Cache And Conflict Handling

- Local cache improves load speed and offline access.
- `updated_at` becomes the main conflict-resolution timestamp.
- Conflict handling starts simple and deterministic.
- Offline queueing can be added if needed.

Realtime subscriptions should wait until the core sync model is stable.

## 8. POC Panel Lifecycle

Cloud POC panels are temporary testing surfaces.

A module POC panel can be removed from daily-use UI when:

- SQL and RLS pass `CLOUD_QA_CHECKLIST.md`.
- Manual CRUD works.
- Two-user isolation has been tested.
- Migration behavior is decided.
- Unified module UI supports cloud mode.
- Local-only fallback still works.
- Errors are handled safely.

POC panels can later move to:

- Settings > Developer
- Settings > Cloud Diagnostics
- a hidden QA-only route
- or be removed entirely

Daily-use module pages should eventually show only the product experience and
subtle sync state.

## 9. Module Migration Order

Recommended cloud migration order:

1. Notes
2. Tasks
3. Goals
4. Academics
5. Gym
6. Work
7. Finances

Notes and Tasks are good early modules because they validate user-owned CRUD
without touching the most sensitive financial calculations.

Goals should come after Tasks because goals connect to planning, XP, and
financial targets, but are still less risky than the finance ledger.

Academics and Gym are useful next because they have structured records and
moderate sensitivity.

Work should come later because it may include client names, deadlines, rates,
brief links, and business-sensitive context.

Finances should be migrated last because it is the highest trust surface:

- highly sensitive records
- currency conversion
- available money calculations
- monthly flow calculations
- savings and financial goal relationships
- high cost of user confusion

## 10. UX Rules

Long-term sync UX should follow these rules:

- Do not show technical cloud controls in daily-use UI.
- Do not make users choose local or cloud per item forever.
- Use Account & Sync for workspace-level decisions.
- Use subtle sync badges only where useful.
- Never imply data is synced if it is not.
- Never upload data without consent.
- Never delete local data automatically after migration.
- Always show clear destructive warnings.
- Keep local-only mode understandable and respected.
- Keep cloud errors calm, actionable, and private.

## 11. Obsidian And Portability

Markdown / Obsidian export remains important even after Supabase sync exists.

Supabase should not be the only backup path. Atlas should continue supporting:

- JSON export as a technical backup
- Markdown export as a human-readable backup
- Obsidian-friendly notes, reviews, goals, and summaries
- local-only use without an account

This reduces lock-in and keeps Atlas aligned with its private, portable product
identity.

## 12. Exit Plan Connection

A future `PORTABILITY_AND_EXIT_PLAN.md` should cover:

- exporting Supabase data
- `pg_dump` or managed database export paths
- JSON export from cloud data
- migrating to another Postgres database
- moving to a self-hosted backend later
- account deletion and data deletion expectations

The exit plan should exist before Atlas stores broad real personal data in the
cloud.

## 13. Risks

Key risks to manage:

- duplicate records
- double XP awards
- local/cloud drift
- wrong source of truth
- accidental upload
- accidental destructive replace
- data loss during migration
- bad RLS policy
- hydration or session loading bugs
- confusing local/cloud UX
- finance miscalculation
- hidden failed sync
- offline edits overwriting newer cloud records

Finances, Work, and Goals require extra caution because they connect to money,
client trust, and long-term planning.

## 14. Recommended Next Steps

1. Harden Tasks SQL constraints and rerun the Tasks two-user RLS test after
   applying the updated SQL manually.
2. Keep this sync architecture and UX plan as the decision baseline.
3. Create `PORTABILITY_AND_EXIT_PLAN.md`.
4. Build a Cloud QA script or repeatable checklist runner for table, RLS, and
   policy checks.
5. Only then continue with a Goals cloud proof-of-concept.

No additional module should become cloud-backed until the source-of-truth model,
migration flow, and final UX direction are clear.
