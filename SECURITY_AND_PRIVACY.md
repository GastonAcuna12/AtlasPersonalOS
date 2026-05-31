# Atlas Security and Privacy

Atlas is a private personal operating system. This document defines the security
and privacy rules for the current local-first MVP and for future cloud, auth,
and AI work.

## 1. Privacy Philosophy

- Atlas is private-first.
- The current MVP is local-first.
- User data remains in browser `localStorage` unless the user explicitly exports
  it or chooses a future migration path.
- Atlas does not automatically upload local data to any cloud service.
- AI analysis should not be added until database, authentication, and privacy
  boundaries are stable and verified.

## 2. Data Sensitivity Map

### High Sensitivity

- Finance transactions
- Savings
- Notes
- Daily wraps
- Weekly reviews
- Work and client information
- Goals
- Personal settings
- JSON and Markdown exports

### Medium Sensitivity

- Gym logs
- Academic tasks
- Study sessions
- XP events
- Streaks
- Calendar events

### Low Sensitivity

- Fake sample data
- UI preferences
- Documentation
- Schema and migration plans

## 3. Public Repository Safety Rules

### Never Commit

- `.env`
- `.env.local`
- Supabase keys
- Supabase service role keys
- OpenAI or other API keys
- Exported JSON backups
- Exported Markdown notes or reviews
- Real financial data
- Real client names
- Private notes
- Real daily reviews
- Screenshots with private data

### Safe To Commit

- App code
- Documentation
- Fake sample data
- `.env.example`
- Schema plans
- Migration plans
- Public-safe placeholder values

## 4. Environment Variable Policy

- `.env.local` is local only and must not be committed.
- `.env.example` may be committed with placeholder values.
- A Supabase anon key can be public only if Row Level Security is correct and
  verified.
- A Supabase service role key must never be used in client-side code.
- A Supabase service role key must never be committed.

## 5. LocalStorage Privacy

Atlas currently stores MVP data in browser `localStorage`.

Important limits:

- `localStorage` is browser-local, but it is not encrypted.
- Anyone with access to the same device and browser profile may be able to
  inspect the data.
- Shared computers are a privacy risk.
- Browser extensions can be a privacy risk.
- JSON and Markdown exports should be stored privately and cleared carefully
  when no longer needed.
- Clearing browser data can remove Atlas local data unless the user has a
  private backup.

## 6. Supabase RLS Safety Checklist

Before any real cloud data is stored:

- Enable Row Level Security on every user-owned table.
- Add `SELECT`, `INSERT`, `UPDATE`, and `DELETE` policies for each user-owned
  table.
- Test with two separate users.
- Confirm user A cannot read user B data.
- Confirm user A cannot update or delete user B data.
- Confirm inserts attach or validate `auth.uid()`.
- Confirm no user-owned table is accidentally public.
- Never use the service role key in the browser.

## 7. Migration Safety

- Never auto-upload `localStorage` data.
- Always ask for user confirmation before migration.
- Always offer a JSON export before migration.
- Always keep a local backup.
- Never auto-delete local data after migration.
- Verify record counts after migration.
- Make merge, replace, and upload behavior explicit before any write happens.

## 8. Export / Import Safety

- JSON exports may contain the full private Atlas workspace.
- Markdown exports may contain notes, reviews, reflections, goals, and summaries.
- Exports should never be committed to the public repository.
- Imports and replaces should require confirmation.
- Merge and replace behavior must be explicit.
- Bad or malformed imports should fail safely without overwriting existing data.

## 9. AI / Jarvis Safety Rules

AI should only be added after:

- Authentication works.
- RLS is verified.
- The data model is stable.
- The user understands what data is being analyzed.

AI features must:

- Avoid sending unnecessary data.
- Clearly explain what data they use.
- Avoid exposing private data in logs.
- Allow disabling AI features.
- Be opt-in for sensitive analysis.

## 10. Threat Model

Known risks include:

- Accidental GitHub leak
- Bad RLS policy
- Exposed service role key
- Cloud migration overwrite
- Shared browser or `localStorage` exposure
- Malicious browser extensions
- Accidental export sharing
- Wrong account sync
- Screenshots with private data
- Timezone or date sync issues

## 11. Personal Data Hygiene Checklist

Before deployment or public sharing:

- Clear local test data if needed.
- Inspect git status if a git repository is available.
- Verify no `.env` files are staged or present in public artifacts.
- Verify no exports or backups are staged.
- Verify no real screenshots are staged.
- Verify sample data is fake.
- Verify there are no real clients or finance entries in committed files.
- Verify there are no service role keys or API keys.

## 12. Future Security Roadmap

- Supabase authentication
- RLS tests
- Migration scripts
- Account and data deletion plan
- Backup and export warnings
- Optional encryption research later
- AI privacy boundaries later

## Related Documents

- [README.md](./README.md)
- [DATA_ARCHITECTURE.md](./DATA_ARCHITECTURE.md)
- [DATA_PRIVACY.md](./DATA_PRIVACY.md)
- [SUPABASE_PLAN.md](./SUPABASE_PLAN.md)
