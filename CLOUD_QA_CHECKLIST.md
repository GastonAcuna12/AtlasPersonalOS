# Atlas Cloud QA Checklist

## 1. Purpose

Every future Atlas cloud module must pass this checklist before moving to the
next module. The goal is to preserve Atlas' local-first stability while adding
Supabase support one module at a time.

This checklist applies to any module that introduces cloud tables, cloud CRUD,
manual uploads, migration prompts, or sync behavior.

Atlas also includes a lightweight manual helper in Settings:

- Location: `/settings` > `Cloud QA Checklist`.
- Purpose: guide the same manual module checks from inside the app.
- It does not run SQL.
- It does not test RLS automatically.
- It does not access secrets.
- It does not read private record contents.
- It does not change app data, sync state, XP, streaks, dashboard, or module
  logic.
- Checkbox completion is stored locally under `atlas.cloudQaChecklist` as
  dev-helper state only.
- Current helper cards cover Notes, Tasks, Goals, Academics, and Gym POCs.

## 2. Pre-Flight Checks

- [ ] Confirm the current branch.
- [ ] Confirm `git status` is clean or every dirty file is intentional.
- [ ] Confirm `.env.local` exists locally when testing Supabase.
- [ ] Confirm `.env.local` is ignored and not tracked.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Confirm local-first mode still works without Supabase env vars.
- [ ] Confirm the module still works signed out.

## 3. Supabase Table Checks

For each table:

- [ ] Table exists.
- [ ] `user_id` exists.
- [ ] `user_id` references `auth.users(id)`.
- [ ] `created_at` exists.
- [ ] `updated_at` exists.
- [ ] `deleted_at` exists if soft delete is used.
- [ ] Index exists for `user_id`.
- [ ] Index exists for `updated_at` when sorting by recency.
- [ ] Additional indexes are documented and justified.
- [ ] No unnecessary public access exists.

## 4. RLS Checks

For every user-owned table:

- [ ] Row Level Security is enabled.
- [ ] `SELECT` allows own rows only.
- [ ] `INSERT` allows own rows only.
- [ ] `UPDATE` allows own rows only.
- [ ] `DELETE` allows own rows only.
- [ ] Policies use the `auth.uid() = user_id` ownership pattern.
- [ ] Anonymous access is blocked unless intentionally documented.
- [ ] Service role access is not used in client-side code.

## 5. Two-User Isolation Test

Run this exact test before considering a module safe:

- [ ] User A signs in.
- [ ] User A creates a record.
- [ ] User A can load that record.
- [ ] User A signs out.
- [ ] User B signs in.
- [ ] User B cannot load User A's record.
- [ ] User B creates their own record.
- [ ] User B can load their own record.
- [ ] User B signs out.
- [ ] User A signs in again.
- [ ] User A cannot load User B's record.

## 6. Local-First Checks

- [ ] App works signed out.
- [ ] App works with Supabase unconfigured.
- [ ] Existing local data is not overwritten.
- [ ] Existing local data is not auto-uploaded.
- [ ] Cloud data is visually separated unless migration is explicitly implemented.
- [ ] No module becomes login-required unless intentionally decided and documented.
- [ ] Local JSON export/import still works.
- [ ] Markdown exports still work if the module participates in Markdown export.

## 7. Migration Safety Checks

- [ ] No auto-upload happens after sign-in.
- [ ] Upload selected requires confirmation.
- [ ] Upload all requires a preview and confirmation.
- [ ] Merge requires a preview.
- [ ] Replace requires destructive confirmation.
- [ ] Local backup/export prompt exists before migration.
- [ ] Record counts are shown before migration.
- [ ] Record counts are shown after migration.
- [ ] Local data is not auto-deleted after migration.
- [ ] Merge/replace behavior is explicit and documented.

## 8. Error Handling Checks

- [ ] Missing env vars are handled safely.
- [ ] Missing table is handled safely.
- [ ] Signed-out state is handled safely.
- [ ] RLS denial is handled safely.
- [ ] Network errors are handled safely.
- [ ] UI shows a useful error.
- [ ] UI does not expose secrets, keys, tokens, SQL internals, or private data.
- [ ] Failed cloud actions do not mutate local data.

## 9. Git Safety Checks

- [ ] `.env.local` is not tracked.
- [ ] No service role keys are present.
- [ ] No secret keys are present.
- [ ] No real exports or backups are tracked.
- [ ] No private screenshots are tracked.
- [ ] Scratch/dev logs are not committed.
- [ ] Sample data is fake and public-safe.
- [ ] SQL files contain schema/policy code only, not credentials.

## 10. Module Graduation Criteria

A module can be considered cloud-ready only when:

- [ ] Manual CRUD works.
- [ ] RLS passes the two-user isolation test.
- [ ] Local-first fallback works.
- [ ] Migration behavior is explicit.
- [ ] No automatic sync or migration happens unless intentionally implemented.
- [ ] `npm run lint` passes.
- [ ] `npm run build` passes.
- [ ] Module documentation is updated.
- [ ] Security/privacy docs are updated if the module changes data sensitivity.

## 11. Notes POC Baseline

Notes was the first validated Atlas cloud module.

Verified baseline:

- Supabase project configured locally.
- Auth sign up and sign in work.
- `public.notes` table exists.
- Notes RLS policies exist.
- User A cannot see User B notes.
- User B cannot see User A notes.
- Local notes and cloud notes remain separate.
- No auto-sync exists.
- No auto-migration exists.
- Notes POC audit found no critical or medium blockers.

Future modules should follow the Notes pattern:

- Start with manual CRUD only.
- Keep local-first behavior intact.
- Separate cloud data visually from local data.
- Require explicit confirmation before any local-to-cloud upload.
- Prove RLS with two users before expanding scope.
