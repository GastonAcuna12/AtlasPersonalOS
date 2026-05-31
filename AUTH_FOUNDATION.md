# Atlas Auth Foundation

Atlas now has an inactive authentication foundation. This prepares the app for a
future Supabase login flow without changing the current local-first behavior.

## What Is Mounted

`AtlasAuthProvider` is mounted near the app root in `src/app/layout.tsx`.

The provider:

- Does not block app rendering.
- Does not redirect.
- Does not require login.
- Does not upload, sync, migrate, or mutate Atlas data.
- Returns a local-only disabled state when Supabase env vars are missing.

## Settings Account & Sync Status

The Settings page now shows a read-only **Account & Sync** section.

It can display:

- Cloud sync not configured
- Cloud sync available, signed out
- Cloud session detected
- Cloud session check failed

It also shows a safe local workspace summary:

- Whether local Atlas data is detected
- Approximate local record count
- Number of populated Atlas storage keys

It never displays private record contents.

## What Does Not Exist Yet

- No login UI
- No signup UI
- No account route
- No route protection
- No cloud sync
- No Supabase data reads for Atlas modules
- No data migration
- No migration prompt

## Local-First Mode

Local-first mode remains unchanged. Existing modules still use the centralized
localStorage data layer.

If Supabase env vars are missing, Atlas stays in local-only mode and the app
continues to load normally.

## Next Step

The next planned step is optional login/signup UI and a visible account surface.
That should still avoid module migration until Row Level Security and migration
flows are ready.

## Related Documents

- [AUTH_PLAN.md](./AUTH_PLAN.md)
- [SUPABASE_FOUNDATION.md](./SUPABASE_FOUNDATION.md)
- [SECURITY_AND_PRIVACY.md](./SECURITY_AND_PRIVACY.md)
- [DATA_ARCHITECTURE.md](./DATA_ARCHITECTURE.md)
