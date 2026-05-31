# Atlas Supabase Foundation

Atlas remains a local-first application. This foundation adds only the minimal
project preparation needed for a future Supabase integration.

## What Was Added

- `@supabase/supabase-js`
- Public Supabase placeholders in `.env.example`
- A client-safe Supabase config helper
- A disabled-safe browser client helper

No authentication, cloud sync, data migration, or module wiring is active yet.

## Required Environment Variables

Future Supabase work will require:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

These are public client variables. They must be configured only when Supabase is
ready to be enabled.

## Why Auth And Data Sync Are Not Active Yet

Atlas contains private personal data: finances, goals, notes, work items, daily
wraps, reviews, and exports. Cloud features should only become active after:

- Supabase tables exist.
- Row Level Security is enabled and tested.
- Auth/session behavior is designed.
- Local-to-cloud migration behavior is explicit and confirmed by the user.

Until then, Atlas should not upload, sync, or migrate local data.

## Local-First Mode Remains Unchanged

The current app still uses the centralized localStorage data layer. Existing
modules such as Today, Work, Finances, Goals, Notes, Gym, Academics, Reviews,
Settings, JSON export/import, and Markdown export continue to run locally.

If Supabase environment variables are missing, the helper returns `null` instead
of crashing the app. This keeps local-first mode intact while the project is
prepared for future cloud work.

## Auth Foundation Status

An inactive auth provider/session context now exists under `src/lib/auth`. It
can detect a Supabase session in the future without forcing login or changing
local-first behavior.

It is not mounted in the app yet and does not migrate any module.

## Next Planned Step

The next technical step should be login/account UI and explicit account state
surfaces, still without migrating any module until RLS and migration flows are
ready.

## Security Warning

Never use a Supabase service role key in client-side code.

Never commit:

- `.env`
- `.env.local`
- Supabase service role keys
- API keys
- Real user exports or backups

The Supabase anon key is only safe in the browser when Row Level Security is
correctly enabled and verified on every user-owned table.

## Related Documents

- [AUTH_PLAN.md](./AUTH_PLAN.md)
- [SECURITY_AND_PRIVACY.md](./SECURITY_AND_PRIVACY.md)
- [SUPABASE_PLAN.md](./SUPABASE_PLAN.md)
- [DATA_ARCHITECTURE.md](./DATA_ARCHITECTURE.md)
- [DATA_PRIVACY.md](./DATA_PRIVACY.md)
