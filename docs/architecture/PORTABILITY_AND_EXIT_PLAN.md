# Atlas Portability And Exit Plan

Atlas should remain useful even if the cloud provider changes later. Supabase is
the planned optional sync layer, but Atlas should not become locked into
Supabase as the only way to access or preserve personal data.

## 1. Portability Principle

Atlas should be:

- local-first
- cloud-optional
- exportable
- understandable without vendor-specific infrastructure
- recoverable if a cloud project is deleted, moved, or replaced

The user should always have a path to export their Atlas data and keep using it
outside the current Supabase project.

## 2. Current Portability Layers

Atlas currently has several portability layers:

- Browser localStorage for local-first workspace data.
- JSON export for structured technical backups.
- Markdown / Obsidian export for human-readable backups and reflections.
- Supabase / Postgres as the optional cloud storage direction.
- SQL schema files in the repo for reviewed, repeatable cloud setup.

These layers should continue to coexist. Supabase should improve sync and
multi-device access without replacing local export options.

## 3. What Is Portable

The following parts of Atlas are designed to be portable:

- Postgres tables.
- SQL schema files.
- User-owned row model using `user_id`.
- JSON exports.
- Markdown exports.
- Domain data models such as notes, tasks, goals, reviews, finances, work,
  academics, gym logs, and settings.

The more Atlas keeps domain logic separate from provider-specific APIs, the
easier it will be to move data later.

## 4. What Is Supabase-Specific

Some parts of the future cloud implementation will be Supabase-specific:

- Supabase Auth.
- RLS policy syntax using `auth.uid()`.
- Supabase anon keys and project URLs.
- Storage buckets if files are added later.
- Edge Functions if backend logic is added later.
- Realtime subscriptions if live sync is added later.

These features are useful, but Atlas should avoid depending on them too heavily
before the core sync model is stable.

## 5. Export Methods

Future Atlas exits or backups can use several export paths.

### Atlas JSON Export

JSON export should remain the main structured app-level backup. It should include
known Atlas domains in a versioned format and avoid browser/system data.

### Atlas Markdown / Obsidian Export

Markdown export should remain the main human-readable backup for notes, weekly
reviews, daily wraps, goals, academic summaries, and planning reflections.

### Supabase Dashboard CSV Export

Supabase can export table data through the dashboard. This is useful for quick
inspection, but it is not enough by itself for a complete app migration.

### Supabase CLI Database Dump

The Supabase CLI can produce database dumps for project backup or migration.
This is a stronger option than table-by-table CSV export.

### pg_dump

Because Supabase is Postgres, standard `pg_dump` workflows should remain a
future option for full database export.

### Custom Export Scripts

Atlas may later add scripts or admin-only tools that export cloud data into the
same JSON format used by local-first backups.

## 6. Exit Scenarios

Atlas should be able to support these future exit paths.

### Supabase To Another Supabase Project

- Export schema and data from the source project.
- Restore into the target project.
- Recreate environment variables.
- Reapply RLS policies.
- Retest two-user isolation.

### Supabase To Self-Hosted Postgres

- Export with `pg_dump` or Supabase CLI.
- Restore to self-hosted Postgres.
- Replace Supabase Auth assumptions or bridge them through a new auth layer.
- Recreate ownership and security policies.

### Supabase To Another Postgres Provider

- Export schema and data.
- Restore to the new provider.
- Replace Supabase-specific auth/RLS pieces.
- Update the app data adapter.

### Supabase To Custom Backend

- Export domain data.
- Create custom API endpoints.
- Map existing `user_id` ownership into the new auth model.
- Preserve JSON and Markdown exports.

### Atlas Cloud Back To Local-Only Archive

- Export cloud data to Atlas JSON.
- Export Markdown where useful.
- Import JSON into a local-only Atlas workspace if supported.
- Keep cloud project temporarily as a backup until verified.

## 7. Recommended Exit Procedure

A safe provider exit should follow a deliberate process:

1. Freeze writes or place the workspace in maintenance mode.
2. Export JSON from Atlas when available.
3. Run `pg_dump` or Supabase database dump.
4. Verify table counts and important record counts.
5. Restore into the target Postgres database.
6. Recreate auth/user mapping.
7. Recreate the RLS or security model.
8. Test with two users.
9. Switch the app adapter or environment configuration.
10. Keep the old Supabase project temporarily as a backup.

Do not delete the old cloud project until the restored data, auth mapping, and
security model are verified.

## 8. Auth Migration Concern

Data is usually easier to migrate than authentication.

Supabase Auth users may require:

- export/import planning
- a replacement auth provider
- account relinking
- careful `user_id` mapping
- communication to the user before any account changes

Atlas data rows will depend on `user_id`, so account migration must preserve or
intentionally remap ownership. A bad user mapping can make data appear missing
or, worse, expose one user's records to another user.

## 9. Obsidian / Markdown Role

Obsidian-friendly Markdown exports are an important safety layer.

They are good for:

- notes
- weekly reviews
- daily wraps
- goals
- academic summaries
- planning reflections

They are not a full relational database replacement. Markdown is not ideal as
the only source for:

- finance calculations
- task status history
- work billing logic
- client/project boards
- relational academic planning

Markdown should be treated as a human-readable archive, not the only structured
backup path.

## 10. Anti-Lock-In Rules

Atlas should follow these rules as cloud support grows:

- Keep SQL files in the repo.
- Keep JSON export working.
- Keep Markdown export working.
- Avoid relying heavily on Edge Functions too early.
- Avoid relying heavily on Realtime too early.
- Keep Supabase isolated behind adapters.
- Keep local-first fallback.
- Never make cloud the only way to access data without an export path.
- Prefer standard Postgres-compatible schema choices where practical.
- Document any Supabase-specific dependency before expanding it.

## 11. Risks

Portability risks to watch:

- bad `user_id` mapping
- missing auth users
- RLS differences between providers
- deleted or soft-deleted records being mishandled
- duplicate records after import
- timezone/date conversion issues
- financial correctness errors
- file storage migration complexity if attachments are added later
- provider-specific functions becoming hard to replace
- incomplete exports that omit settings, XP, or hidden metadata

Finances require the highest caution because export/import mistakes can damage
trust in available money, currency conversion, savings, and goal progress.

## 12. Future Tasks

Future work should include:

- Add automated export tests.
- Add a cloud backup/export command.
- Add a more detailed Obsidian export plan.
- Add an adapter interface plan for local/Supabase/future providers.
- Add a disaster recovery checklist.
- Document how to restore from JSON into local-only mode.
- Document how to restore Supabase data into a new project.

Atlas should not expand broad cloud storage without preserving the user's exit
paths.
