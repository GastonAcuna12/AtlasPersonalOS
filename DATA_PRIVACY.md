# Atlas Data Privacy

Atlas is being developed in a public GitHub repository. Treat the repository as public by default.

## Safe To Commit

- Source code
- UI copy that does not include personal details
- Mock data that is clearly fictional
- Documentation
- `.env.example` files with placeholder values only

## Never Commit

- Real financial records
- Personal notes, goals, weekly reviews, or health/gym history
- Client names, private contacts, or academic records
- API keys, access tokens, passwords, private URLs, or database credentials
- Browser exports, local backups, screenshots, or files containing real personal data
- Real `.env`, `.env.local`, or `.env.*.local` files

## Current Local Storage

Atlas currently stores user-created data in the browser through `localStorage`.

Current Atlas-owned keys:

- `atlas.transactions`
- `atlas.savings`
- `atlas.financeSettings`
- `atlas.gymLogs`
- `atlas.tasks`
- `atlas.dailyPlans`
- `atlas.dailyWraps`
- `atlas.subjects`
- `atlas.academicTasks`
- `atlas.studySessions`
- `atlas.notes`
- `atlas.goals`
- `atlas.weeklyReviews`
- `atlas.clients`
- `atlas.workItems`
- `atlas.xp`
- `atlas.xpEvents`
- `atlas.appSettings`

Older localStorage keys may be migrated automatically by `src/lib/storage.ts`
for backward compatibility, but the keys above are the current canonical keys.

This keeps the app local-only for now, but it also means data lives in the browser profile on the current device. Use the Settings data export if you want a private backup, and keep that backup outside the public repository.

## Future Database Plan

When Atlas adds a database, it should use a private project with environment variables stored only in local `.env` files or a deployment provider's secret manager. Real production data should never be seeded into this repository.

Before database work begins, add:

- `.env.example` with placeholder variable names only
- A private database migration strategy
- A clear separation between mock development data and real user data

## Future Obsidian / Markdown Export

Atlas may later support Markdown export for notes, weekly reviews, goals, and summaries. That export should be treated as private user data. Generated Markdown vaults, exports, and backups should stay outside Git unless they contain only fictional demo content.

## Related Documents

- [README.md](./README.md)
- [DATA_ARCHITECTURE.md](./DATA_ARCHITECTURE.md)
- [SECURITY_AND_PRIVACY.md](./SECURITY_AND_PRIVACY.md)
- [SUPABASE_PLAN.md](./SUPABASE_PLAN.md)
