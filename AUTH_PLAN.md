# Atlas Authentication Plan

Atlas is currently a stable local-first MVP. This document describes the future
authentication strategy only. It does not implement Supabase, authentication UI,
cloud sync, or account behavior.

## 1. Auth Goals

Authentication should support:

- A private user workspace
- Sync across devices
- Secure user-owned cloud data
- Migration from browser `localStorage` to cloud storage
- Optional local-only mode for users who do not want an account

Atlas should remain useful without login. Authentication is for sync, backup,
and private multi-device access, not for blocking the local-first product.

## 2. Auth Provider

Atlas plans to use Supabase Auth.

Initial supported methods:

- Email/password
- Magic link, optional
- Google OAuth, optional later

The inactive Supabase and auth foundation files now exist, but no login UI,
cloud sync, route protection, or data migration is active. Supabase should not
handle real Atlas data until the database, RLS policies, and privacy boundaries
are ready.

## 3. Auth States

Atlas should handle these states explicitly:

### Logged Out

- User can continue using Atlas locally.
- Data remains in browser `localStorage`.
- Cloud sync is unavailable.
- Login/signup prompts should be optional and non-blocking.

### Logged In

- User has a Supabase session.
- Cloud-owned operations become available.
- The app should know whether the active workspace is local-only, cloud-backed,
  or pending migration.

### Local-Only User

- No Supabase session is required.
- `localStorage` remains the source of truth.
- JSON and Markdown exports remain available.
- User can choose to migrate later.

### Logged In With Existing Local Data

- Atlas should detect local data after login.
- Atlas must not auto-upload data.
- Atlas should show a migration prompt with clear options.

### Logged In With Existing Cloud Data

- Atlas should load cloud data for the signed-in user.
- If local data also exists, Atlas should ask how to proceed.
- If no local data exists, cloud data can become the active workspace.

### Logged In With Both Local And Cloud Data

- Atlas must not guess destructive behavior.
- The user should choose between keeping local-only, uploading local data,
  merging, replacing cloud data, or skipping for now.

## 4. Local-Only Mode

Atlas should continue to work without login.

Behavior:

- `localStorage` continues to work.
- No cloud sync runs.
- User can export and import JSON backups.
- User can export Markdown for Obsidian or other local vaults.
- User can migrate later from Settings or Account.

Local-only mode should be treated as a first-class mode, not a degraded trial.

## 5. Signup / Login UX

Possible future routes:

- `/login`
- `/signup`
- `/account`
- `/settings/account`

Atlas should not force login on first app open.

Primary choices should be:

- Continue locally
- Sign in to sync

Login prompts should be calm and explicit. They should explain that signing in
enables cloud sync, but local mode remains available.

## 6. Post-Login Migration Prompt

If local data exists after login, Atlas should ask what to do.

Options:

- Keep local only
- Upload local data to cloud
- Merge with cloud
- Replace cloud with local
- Skip for now

The prompt should clearly explain what each choice does before writing any cloud
data. Destructive actions should require confirmation.

## 7. Profile Creation

On first login, Atlas should create a profile row.

Profile data should stay minimal:

- User id from Supabase Auth
- Display name if available
- Created timestamp
- Basic app preferences if needed

Avoid storing unnecessary personal information. Do not copy private local data
into the profile row.

## 8. Session Handling

Atlas should support:

- Persistent session
- Clear loading state while session is being resolved
- Logout button
- Account menu or account settings panel
- Protection around cloud-only operations

Local-only operations should not require a session. Cloud-only operations should
wait until the session is known and valid.

## 9. RLS Relationship

Supabase Auth only identifies the user. It does not protect data by itself.

Required model:

- `auth.uid()` maps to each table's `user_id`.
- Every cloud row must be user-owned.
- Every user-owned table must have Row Level Security enabled.
- SELECT, INSERT, UPDATE, and DELETE policies must verify ownership.

Authentication is unsafe without RLS. A working login form is not enough.

## 10. Testing Auth

Before shipping auth or cloud sync:

- Create user A.
- Create user B.
- Confirm user A cannot read user B data.
- Confirm user A cannot update or delete user B data.
- Confirm inserts attach or validate user A's `auth.uid()`.
- Confirm logout and login persistence work.
- Confirm the migration prompt appears when local data exists.
- Confirm local-only mode still works without login.
- Confirm no data leaks between accounts.

## 11. Implementation Roadmap

Recommended sequence:

1. Add environment variable placeholders to `.env.example`.
2. Install the Supabase client packages.
3. Create a Supabase browser client helper. Done as an inactive foundation.
4. Add an auth provider or session context. Done as an inactive foundation.
5. Add login/signup UI.
6. Add account settings.
7. Mount auth context only when Atlas is ready to expose account state.
8. Create profiles on first login.
9. Implement local-only versus cloud mode.
10. Build the post-login migration prompt.
11. Migrate Notes first.
12. Test RLS with two users.
13. Migrate remaining domains gradually after the first module is stable.

Notes should be the first migrated module because they are lower risk than
finances and have fewer relational dependencies.

## 12. Risks

Known risks:

- Accidentally forcing login
- Breaking the local-first app
- Overwriting local data
- Bad RLS policies
- Confusing sync states
- Hydration or session loading bugs
- Uploading local data without informed consent
- Mixing data between accounts
- Exposing service role keys

## Related Documents

- [README.md](./README.md)
- [DATA_ARCHITECTURE.md](./DATA_ARCHITECTURE.md)
- [DATA_PRIVACY.md](./DATA_PRIVACY.md)
- [SECURITY_AND_PRIVACY.md](./SECURITY_AND_PRIVACY.md)
- [SUPABASE_PLAN.md](./SUPABASE_PLAN.md)
