# Atlas Personal OS — Antigravity Handoff

This document is a complete handoff for continuing Atlas Personal OS development safely in Antigravity. Atlas is now beyond a simple prototype. It has a stable local-first app, a mature localStorage data layer, multiple Supabase proof-of-concepts, i18n, module preferences, planned expenses, daily habit goals, and sync metadata. Treat the app as a working product.

The main rule: preserve local-first behavior above everything else.

## 1. Project Summary

Atlas Personal OS is a local-first personal operating system for managing daily life, work, money, goals, academics, fitness, notes, reviews, and planning. It is designed as a private personal command center with a premium slate dark interface, modular navigation, and localStorage-first persistence.

Atlas currently includes these modules:

- Dashboard / command center, served from `/`
- Today planning
- Work & Clients
- Finances
- Gym
- Academics
- Goals
- Notes
- Weekly Review / Review
- Calendar
- Settings
- Account

Atlas uses browser `localStorage` as the source of truth for normal app usage. Supabase exists as an optional future cloud/sync layer, but real sync is not active. Supabase proof-of-concepts exist for the major modules, and their panels have been centralized in Settings under Cloud Diagnostics.

The product direction is:

- Keep Atlas local-first and private by default.
- Make Supabase an optional sync layer, not the visible center of the product.
- Keep JSON export as a technical backup path.
- Keep Markdown / Obsidian export as a human-readable portability path.
- Avoid vendor lock-in.
- Support future commercial/general users through module preferences.
- Let users hide modules they do not need without deleting data.

Atlas has English and Spanish i18n support. Translation coverage is broad but should still be extended carefully in small passes.

## 2. Tech Stack

Detected stack:

- Next.js App Router
- Next.js `16.2.6`
- React `19.2.4`
- React DOM `19.2.4`
- TypeScript
- Tailwind CSS v4 via `@tailwindcss/postcss`
- ESLint
- npm with `package-lock.json`
- Supabase JS client foundation via `@supabase/supabase-js`
- Centralized localStorage data layer

Important package scripts:

```bash
npm run dev
npm run lint
npm run build
npm run start
```

Current `package.json` scripts:

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint"
}
```

Important repository note:

- `AGENTS.md` warns that this is not the Next.js version older agents may remember.
- Before changing Next.js code, read the relevant guide in `node_modules/next/dist/docs/`.
- Do not assume old App Router conventions are accurate without checking.

## 3. Current Architecture Overview

Important routes:

- `/` via `src/app/page.tsx` — Dashboard / home.
- `/today` — Daily planning and execution.
- `/work` — Work & Clients.
- `/finances` — Local finances.
- `/gym` — Gym logs.
- `/academics` — Subjects, tasks, study sessions.
- `/goals` — Goals, savings-linked goals, daily habit goals.
- `/notes` — Notes.
- `/review` — Weekly Review.
- `/calendar` — Unified calendar.
- `/settings` — Settings, data management, Cloud Diagnostics, Cloud QA, Sync Status.
- `/account` — Optional Supabase auth UI.

Important folders and files:

- `src/app` — App Router routes and root layout.
- `src/components` — Main UI components and module pages.
- `src/lib` — Domain helpers, localStorage data access, calculations, exports, i18n.
- `src/lib/supabase` — Supabase client/config and module POC helpers.
- `src/lib/sync` — Sync metadata/status foundation. No real sync execution.
- `src/lib/auth` — Auth provider/session/local data detection foundation.
- `src/types` — Shared Atlas and sync TypeScript types.
- `supabase/sql` — Manual SQL setup files for Supabase POCs.
- Root `*.md` files — Product, privacy, architecture, cloud, sync, and feature documentation.

Important data files:

- `src/lib/storage.ts`
- `src/types/atlas.ts`
- `src/lib/dataManagement.ts`
- `src/lib/settings.ts`
- `src/lib/modules.ts`
- `src/lib/finances.ts`
- `src/lib/goals.ts`
- `src/lib/tasks.ts`
- `src/lib/work.ts`
- `src/lib/gym.ts`
- `src/lib/academics.ts`
- `src/lib/reviews.ts`
- `src/lib/notes.ts`
- `src/lib/xp.ts`
- `src/lib/dailyWraps.ts`
- `src/lib/streaks.ts`
- `src/lib/dashboard.ts`
- `src/lib/sampleData.ts`
- `src/lib/markdownExport.ts`
- `src/lib/i18n.ts`

Important Supabase files:

- `src/lib/supabase/config.ts`
- `src/lib/supabase/client.ts`
- `src/lib/supabase/notes.ts`
- `src/lib/supabase/tasks.ts`
- `src/lib/supabase/goals.ts`
- `src/lib/supabase/academics.ts`
- `src/lib/supabase/gym.ts`
- `src/lib/supabase/work.ts`
- `src/lib/supabase/finances.ts`

Important sync files:

- `src/types/sync.ts`
- `src/lib/sync/registry.ts`
- `src/lib/sync/state.ts`
- `src/lib/sync/preview.ts`
- `src/components/SyncStatusPanel.tsx`

Important documents:

- `README.md`
- `DATA_ARCHITECTURE.md`
- `DATA_PRIVACY.md`
- `SECURITY_AND_PRIVACY.md`
- `SUPABASE_PLAN.md`
- `SUPABASE_FOUNDATION.md`
- `AUTH_PLAN.md`
- `AUTH_FOUNDATION.md`
- `CLOUD_QA_CHECKLIST.md`
- `SYNC_ARCHITECTURE_AND_UX_PLAN.md`
- `SYNC_FOUNDATION.md`
- `PORTABILITY_AND_EXIT_PLAN.md`
- `I18N_PLAN.md`
- `MODULE_PREFERENCES_PLAN.md`
- `FINANCES_PLANNED_EXPENSES.md`
- `DAILY_HABIT_GOALS.md`
- `SUPABASE_NOTES_POC.md`
- `SUPABASE_TASKS_POC.md`
- `SUPABASE_GOALS_POC.md`
- `SUPABASE_ACADEMICS_POC.md`
- `SUPABASE_GYM_POC.md`
- `SUPABASE_WORK_POC.md`
- `SUPABASE_FINANCES_POC.md`

## 4. Local-First Rules

These are hard rules:

- `localStorage` is still the source of truth for normal app usage.
- Supabase POCs exist, but they do not drive real module data.
- Do not convert modules to cloud source of truth unless explicitly requested.
- Do not auto-upload local data.
- Do not auto-sync.
- Do not auto-migrate.
- Do not delete local data.
- Do not clear localStorage.
- Do not change localStorage keys unless explicitly planned and documented.
- Existing users must keep their data.
- Missing or corrupted localStorage should normalize safely.
- Direct route access should not become login-required unless explicitly requested.
- App behavior with no Supabase env vars must remain valid.

Current canonical localStorage keys include:

- `atlas.transactions`
- `atlas.plannedExpenses`
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
- `atlas.syncState`

Older keys may be migrated by `src/lib/storage.ts`. Do not alter migrations casually.

## 5. Supabase Current State

Supabase is present, but real sync is not active.

Current state:

- Supabase client foundation exists.
- Auth foundation exists.
- `/account` exists for optional sign-in/sign-up.
- Settings has Account & Sync.
- Supabase env vars live in `.env.local` locally and must never be committed.
- `.env.example` should contain placeholders for public Supabase env vars.
- Supabase POCs exist for all main modules.
- POC panels are centralized in Settings > Cloud Diagnostics.
- Cloud QA helper exists in Settings.
- RLS has been manually tested for each POC module.
- Real sync is not active.
- No module should be made cloud source of truth without an explicit implementation plan.

Supabase POC modules and SQL files:

- Notes: `supabase/sql/001_notes.sql`
- Tasks: `supabase/sql/002_tasks.sql`
- Goals: `supabase/sql/003_goals.sql`
- Academics: `supabase/sql/004_academics.sql`
- Gym: `supabase/sql/005_gym.sql`
- Work: `supabase/sql/006_work.sql`
- Finances transactions-only: `supabase/sql/007_finances.sql`

Every POC follows the same pattern:

- Manual SQL table setup.
- `user_id` ownership.
- RLS own-row `SELECT`, `INSERT`, `UPDATE`, and `DELETE` policies.
- Browser-safe helpers in `src/lib/supabase`.
- Manual preview panels only.
- No auto-sync.
- No auto-migration.
- No local module source-of-truth change.
- No dashboard, XP, streak, Today, Calendar, or calculation impact unless explicitly designed.

Special warning for Finances:

- The Finances POC is transactions-only.
- There is no cloud Savings Vault.
- There are no cloud finance settings.
- Cloud transactions must not affect Available Money.
- Cloud transactions must not affect Monthly Balance.
- Cloud transactions must not affect Dashboard finance cards.
- Cloud transactions must not affect Goals or Savings Vault.
- Original amount and currency must be preserved.
- USD must never be subtracted as raw PYG.

## 6. Sync Foundation Current State

The General Sync Foundation exists, but it is metadata/status only.

Files:

- `src/types/sync.ts`
- `src/lib/sync/registry.ts`
- `src/lib/sync/state.ts`
- `src/lib/sync/preview.ts`
- `src/components/SyncStatusPanel.tsx`

Local key:

- `atlas.syncState`

Current behavior:

- Sync Status appears in Settings.
- Migration preview counts exist.
- Module registry exists.
- Per-module sync statuses exist as metadata.
- No actual sync execution exists.
- No migration execution exists.
- No cloud writes happen from sync foundation.
- No module hooks have been converted to cloud.

Hard rules:

- Do not turn on real sync globally.
- Do not mark modules `cloud_synced` unless a dedicated implementation is requested and completed.
- Do not make Dashboard read cloud data.
- Do not make Today read cloud data.
- Do not make Calendar read cloud data.
- Do not make XP or streaks read cloud data.
- First real sync module should be Notes, later, after planning and product QA.

Current sync module registry includes:

- `notes`
- `tasks`
- `goals`
- `academics`
- `gym`
- `work`
- `finances`

All modules are still effectively local-first with cloud POC capability, not real sync.

## 7. Module Preferences / Toggles

Module preferences exist to let users hide modules from the main workspace without deleting data.

Supported toggles:

- Today
- Work
- Finances
- Gym
- Academics
- Goals
- Notes
- Review
- Calendar

Rules:

- Settings cannot be disabled.
- Dashboard remains the home/root experience.
- Disabling a module must not delete data.
- Disabling a module must not clear localStorage.
- Disabling a module must not alter Supabase tables.
- Disabling a module must not alter sync state.
- Direct routes should remain safe.
- Sidebar respects enabled modules.
- Dashboard and Quick Capture should respect enabled modules.
- Cloud Diagnostics and Cloud QA may still show admin/developer tools.

Commercial/product reasoning:

- Students may disable Work.
- Freelancers may disable Academics.
- Personal users may disable Work or Finances.
- Lightweight users may keep only Goals, Notes, Calendar, and Today.

Implementation references:

- `src/lib/modules.ts`
- `src/lib/settings.ts`
- `src/types/atlas.ts`
- `src/components/SettingsPage.tsx`
- `src/components/SidebarNav.tsx`
- `src/components/AtlasDashboard.tsx`
- `src/components/QuickCaptureModal.tsx`

## 8. i18n State

Atlas has English and Spanish support.

Current i18n foundation:

- `src/lib/i18n.ts`
- Language type: `en` / `es`
- Existing helper: `t(language, key, fallback?)`
- Language preference is stored in settings.
- Do not create a second i18n system.
- Do not install `i18next`, `next-intl`, or any new i18n package unless explicitly requested.

Coverage:

- Sidebar/navigation has translation support.
- Settings has broad translation support.
- Account has translation support.
- Work has significant daily-use translation support.
- Quick Capture has translation support.
- Migration decision panel has translation support.
- Cloud POC panels have translation support.
- Cloud QA and Cloud Diagnostics have translation support.
- Calendar generated labels and date display have translation support.
- Daily Wrap and Weekly Review generated labels have translation support.
- Recent features like planned expenses and daily habit goals have translation support.

Rules:

- Do not translate user-created content.
- Do not translate note titles, goal titles, task names, client names, planned expense titles, or user notes.
- Do not translate currency codes like `PYG` and `USD`.
- Do not translate technical constants like SQL, RLS, Supabase, localStorage, or file names when English is clearer.
- Add both English and Spanish keys for every new visible UI string.
- Use neutral Spanish.
- Keep translations incremental; do not translate the whole app in one uncontrolled pass.

## 9. Recent Product Features

### Module Preferences

Module Preferences let users choose which Atlas modules appear in the workspace.

Purpose:

- Make Atlas adaptable for students, freelancers, personal users, and full power users.
- Reduce sidebar/dashboard clutter.
- Keep hidden modules available without deleting data.

Data safety:

- Data is not deleted.
- localStorage keys are not cleared.
- Supabase POCs are not changed.
- Sync metadata is not changed.

Affected UI:

- Settings module preferences section.
- Sidebar navigation.
- Dashboard sections/cards.
- Quick Capture options.

### Planned / Recurring Expenses

Planned expenses are local-first future commitments. They are not transactions until the user marks them paid.

Storage:

- Planned expenses are stored locally in `atlas.plannedExpenses`.

Core behavior:

- A planned expense is a commitment.
- A transaction is an actual ledger entry.
- Planned expenses do not change Available Money until marked paid.
- Marking a planned expense paid creates a real local transaction only after user confirmation.
- Mark paid should create exactly one transaction.
- Skipping a planned expense does not create a transaction.
- Deleting a planned expense does not delete past transactions.
- Monthly recurring expenses show upcoming monthly occurrences without generating infinite records.
- Monthly planned expenses use `dayOfMonth` and simple monthly recurrence.

Safe-to-spend behavior:

- Available Money remains separate.
- Planned expenses can reduce safe-to-spend projections.
- Planned expenses do not directly reduce Available Money.

Formula:

```text
Available Money = total ledger balance - reserved savings converted to base currency
safeToSpend7Days = availableMoney - upcomingCommitments7DaysInBaseCurrency
safeToSpend30Days = availableMoney - upcomingCommitments30DaysInBaseCurrency
```

No cloud behavior:

- Supabase helpers are unchanged.
- Supabase SQL is unchanged.
- Cloud Diagnostics remains preview-only.
- No sync/migration behavior exists for planned expenses.

Documentation:

- `FINANCES_PLANNED_EXPENSES.md`

### Planned Expenses Calendar Integration

Planned finance expenses appear in Calendar as derived local events.

Rules:

- Calendar does not store separate planned payment records.
- Calendar derives planned payment events from local planned expense data.
- Calendar does not create transactions.
- Calendar should link back to Finances for mark-paid flow.
- Pending and overdue planned expenses are visible.
- Paid planned expenses may be muted/completed.
- Skipped/cancelled planned expenses should be hidden or muted depending on the current UI behavior.
- Finance planned events should respect the Finances module preference.

Important:

- Do not auto-create transactions from Calendar.
- Do not mutate planned expenses from Calendar unless a future explicit, safe, confirmed action is designed.
- Do not let cloud finance preview affect Calendar.

### Daily Habit Goals

Daily Habit Goals are local-first goals for repeated daily behaviors.

Storage/model:

- Daily habits are stored in `atlas.goals`.
- They use `goalType: "daily_habit"`.
- `habitCheckIns` are keyed by stable `YYYY-MM-DD` date strings.
- No new localStorage key was added for habits.
- Existing normal goals still work.
- Existing savings-linked goals still work.

Check-in statuses:

- `completed`
- `missed`
- `skipped`
- UI may also display `pending` for today when no check-in exists.

Streak rules:

- Completed counts toward current and best streak.
- Missed breaks the streak.
- Skipped breaks the current streak in the first version.
- Pending today does not break yesterday's streak.
- Completion rate is based on tracked check-ins.

Current surfaces:

- Goals page has a Daily Goals / Habit Goals section.
- Calendar shows derived local habit items.
- Dashboard shows a compact habit summary.
- Habit toggles do not award XP in this pass.
- No cloud/sync behavior changed.

Documentation:

- `DAILY_HABIT_GOALS.md`

## 10. Hydration Safety Notes

A `/goals` hydration warning was fixed.

Known root cause:

- Savings sync timestamp display and default-locale formatting caused server/client mismatch.
- GoalsPage was updated to avoid server/client timestamp mismatch.
- Default-locale number formatting was avoided in favor of deterministic formatting.

Be careful with:

- `Date.now()` in render.
- `new Date()` in render.
- `Math.random()` in render.
- `toLocaleString()` without deterministic locale/options.
- `toLocaleDateString()` without deterministic locale/options.
- `toLocaleTimeString()` without deterministic locale/options.
- Default `Intl` formatting in SSR-rendered output.
- localStorage reads during initial render.
- `typeof window` branches that render different server/client markup.

Safer patterns:

- Use stable `YYYY-MM-DD` date keys.
- Use deterministic date helpers.
- Use deterministic locales/options when formatting.
- Render client-only values after a mounted/client-ready guard if needed.
- Use existing storage utilities.
- Do not suppress hydration warnings unless absolutely necessary and documented.

## 11. Finance Safety Rules

This section is intentionally explicit. Finances is the highest-risk module.

Rules:

- Savings Vault is reserved money.
- Savings are not spendable.
- Available Money means spendable money.
- Available Money = ledger balance - reserved savings converted to base currency.
- Planned expenses are future commitments, not actual transactions until marked paid.
- Planned expenses can reduce safe-to-spend projections.
- Planned expenses must not reduce actual Available Money until paid.
- Marking a planned expense as paid creates exactly one transaction.
- Do not auto-create transactions from Calendar.
- Do not auto-create transactions from recurring planned expenses.
- Skipped/cancelled planned expenses do not create transactions.
- Do not subtract USD as raw PYG.
- Preserve original transaction amount and currency.
- Conversion uses current local exchange rate for display/calculation.
- Do not let cloud finance preview affect local totals.
- Do not enable cloud savings/settings yet.
- Do not change Dashboard finance calculations unless explicitly requested.
- Do not show savings as spendable.
- Do not show cloud preview totals as Available Money.

Currency safety:

- PYG transactions count as PYG.
- USD transactions must be converted to base currency only for display/calculation.
- Original amount/currency should remain stored.
- Exchange rate is local/manual.
- No live exchange-rate fetching exists.

Cloud finance warning:

- `supabase/sql/007_finances.sql` is transactions-only.
- `src/lib/supabase/finances.ts` must not affect local summaries.
- Cloud finance data is preview-only in Settings > Cloud Diagnostics.

## 12. Calendar Role

Calendar is becoming a central local aggregation surface.

Current role:

- Aggregates derived local events from modules.
- Shows planned finance expenses as derived events.
- Shows daily habit goals as derived events.
- Should respect module preferences.
- Should not create transactions automatically.
- Should not create tasks/goals/work items automatically.
- Should not write cloud data.

Future work:

- Filters by module.
- Cleaner event density in month view.
- Better agenda drawer.
- More explicit event source labels.
- Stronger module-preference filtering.
- Optional links back to source modules.

Do not turn Calendar into a mutation hub without explicit design.

## 13. Git / GitHub Workflow

The user is comfortable with local commits and pushing at checkpoints, but secrets and private data must never be committed.

Useful commands:

```bash
git status
git add .
git commit -m "message"
git push
git tag checkpoint-name
git push --tags
```

Cleanup examples:

```bash
git restore scratch/next-dev.log
git clean -f scratch/next-dev.log
```

Safety rules:

- If `.env.local` appears in `git status`, stop.
- Do not commit `.env`.
- Do not commit `.env.local`.
- Do not commit Supabase keys.
- Do not commit service role keys.
- Do not commit OpenAI/API keys.
- Do not commit real financial data.
- Do not commit real client names.
- Do not commit private notes.
- Do not commit exported JSON backups.
- Do not commit exported Markdown notes/reviews.
- Do not commit screenshots with private data.
- Do not commit `node_modules`.
- Do not commit `.next`.
- Scratch/dev logs should not be committed.

Current note:

- The worktree may contain existing pending changes from recent feature work.
- Before modifying anything, inspect `git status`.
- Do not revert user or prior-agent changes unless explicitly asked.

## 14. Current Development Status

Current milestone:

- Supabase POC phase is complete for major modules.
- Cloud Diagnostics is centralized in Settings.
- General Sync Foundation metadata-only is complete.
- Product features recently added include:
  - Module preferences / module toggles.
  - Planned and recurring expenses.
  - Planned finance expenses in Calendar.
  - Daily Habit Goals and streak tracking.
  - i18n improvements.
- Real sync is not active.
- The next major technical phase is Notes real sync, but only after product QA.

Recommended immediate next step:

- Run a Product QA Audit for the recent local-first feature additions.

Why:

- Several meaningful local-first features were added quickly.
- Before adding more, verify behavior, UX, data safety, hydration safety, i18n, and local-first integrity.
- Do not jump directly into Notes real sync until the local product is stable.

## 15. What Antigravity Should NOT Do

Hard no's:

- Do not implement global sync.
- Do not migrate all modules.
- Do not touch Supabase tables unless asked.
- Do not run destructive SQL.
- Do not use a service role key.
- Do not create `.env.local`.
- Do not commit secrets.
- Do not clear localStorage.
- Do not delete user data.
- Do not make cloud the source of truth.
- Do not change finance formulas casually.
- Do not make planned expenses auto-pay.
- Do not add XP for habits unless explicitly requested.
- Do not add large features without plan-first.
- Do not translate the entire app in one uncontrolled pass.
- Do not refactor everything.
- Do not rewrite module pages from scratch.
- Do not change localStorage keys without a documented migration plan.
- Do not route-protect the app.
- Do not force login.
- Do not add AI.
- Do not add authentication changes unless explicitly requested.
- Do not introduce new packages unless explicitly requested.

## 16. What Antigravity Can Safely Do

Safe tasks:

- Read-only audits.
- UI polish.
- i18n polish.
- Documentation.
- Lint/build verification.
- Small local-first product fixes.
- QA checklists.
- Non-destructive Settings improvements.
- Module preference polish.
- Calendar UI polish.
- Finances planned expense UX polish, if scoped.
- Habit goal UX polish, if scoped.
- Hydration warning investigations.
- Accessibility copy/label cleanup.
- Minor responsive layout fixes.

Even for safe tasks, use small patches and run verification.

## 17. Recommended Next Step

Recommended exact next step:

Run a Product QA Audit for recent Atlas local-first feature additions.

Reason:

- Many features were added quickly.
- Before adding more, verify behavior and UX.
- The audit should inspect only and make no file changes.

Suggested Product QA Audit prompt:

```text
Run a product QA audit for recent Atlas local-first feature additions.

Context:
Atlas recently added or changed:

* Module Preferences / module toggles
* Planned and recurring expenses in Finances
* Planned finance expenses in Calendar
* Daily Habit Goals and streaks
* i18n improvements
* General Sync Foundation metadata-only
* Cloud POCs centralized in Settings > Cloud Diagnostics

Goal:
Audit product behavior, UX consistency, data safety, hydration safety, and local-first integrity before adding more features.

Important:

* Do not change files.
* Do not fix yet.
* Inspect only and report.
* Do not add sync.
* Do not migrate data.
* Do not modify Supabase.
* Do not clear localStorage.

Check:

1. Module Preferences

* hiding modules does not delete data
* sidebar respects toggles
* dashboard respects toggles
* quick capture respects toggles
* direct routes remain safe

2. Finances Planned Expenses

* planned expenses are not transactions until marked paid
* mark paid creates exactly one transaction
* skipped/cancelled do not create transactions
* recurring monthly behavior is understandable
* safe-to-spend calculations are correct
* Available Money still excludes reserved savings
* USD/PYG conversion is correct
* no cloud data affects local totals

3. Calendar Finance Events

* planned expenses appear on correct due dates
* recurring monthly events appear correctly
* paid/skipped/cancelled display correctly
* Calendar does not create transactions
* Finances disabled hides finance events

4. Daily Habit Goals

* existing goals still work
* savings goals still work
* daily habit creation works
* complete/miss/skip persists
* streak calculations follow documented rules
* Calendar habit events work
* Dashboard habit summary works
* no XP is awarded unexpectedly
* no hydration warning on /goals

5. i18n

* English/Spanish works for new surfaces
* user content is not translated
* no missing key leaks in daily UI

6. Sync Foundation

* Sync Status is read-only
* atlas.syncState does not alter module behavior
* migration preview shows counts only
* no cloud writes happen

7. Cloud Diagnostics

* POC panels are not visible in daily module pages
* Cloud Diagnostics still works from Settings
* Cloud QA helper still works

8. Hydration / Date Safety

* no hydration warnings on /goals, /finances, /calendar, /
* no unstable Date.now/new Date/default Intl formatting in render

9. Git/Privacy

* .env.local not tracked
* scratch/dev logs not intended for commit
* no secrets

Output:

# Atlas Product QA Audit

## Summary

## Critical Issues

## Medium Issues

## Low Polish

## Data Safety Notes

## Finance Safety Notes

## Calendar Notes

## Habit Goals Notes

## Module Preferences Notes

## i18n Notes

## Sync/Cloud Notes

## Recommended Fix Order

## Confirmation

Confirm no files were changed.
```

## 18. Roadmap After Product QA

If the audit is clean:

1. Fix medium/critical issues if any.
2. Calendar upgrade with filters by module.
3. Finance planned expenses polish/reminders.
4. Habit goals polish.
5. Notes real sync plan/implementation.
6. Tasks real sync later.
7. Finances sync last.

If the audit finds blockers:

- Fix blockers first.
- Run `npm run lint`.
- Run `npm run build`.
- Commit the fix.
- Re-audit.

Recommended sync rollout after local QA:

1. Notes real sync.
2. Tasks real sync.
3. Goals sync.
4. Academics sync.
5. Gym sync.
6. Work sync.
7. Finances sync last.

Finances stays last because:

- It is highly sensitive.
- It has currency conversion.
- It has savings/reserved money rules.
- It has planned commitments.
- Mistakes can make the dashboard financially misleading.

## 19. Manual Test Checklist

Practical checklist for the user or next agent:

- Run `npm run lint`.
- Run `npm run build`.
- Open `/settings` and test module preferences.
- Disable and re-enable Work.
- Disable and re-enable Finances.
- Confirm disabled modules disappear from sidebar.
- Confirm disabling modules does not delete data.
- Open `/finances` and test planned expenses.
- Add a one-time planned expense.
- Add a monthly recurring planned expense.
- Mark one planned expense paid.
- Confirm exactly one transaction is created.
- Skip a planned expense.
- Confirm skipped does not create a transaction.
- Confirm Available Money still excludes reserved savings.
- Confirm USD/PYG conversion is correct.
- Open `/calendar` and confirm planned finance events.
- Confirm Calendar does not create transactions.
- Disable Finances and confirm finance events hide from Calendar.
- Open `/goals` and create a daily habit goal.
- Mark today completed.
- Mark today missed.
- Skip today.
- Refresh and confirm persistence.
- Confirm current/best streaks follow documented rules.
- Confirm existing normal goals still work.
- Confirm savings goals still work.
- Open `/` and confirm dashboard habit/finance summaries.
- Switch English/Spanish in Settings.
- Confirm user-created content is not translated.
- Open Settings > Cloud Diagnostics.
- Confirm POC panels are available there.
- Confirm daily module pages are not cluttered with cloud POC panels.
- Check Settings Sync Status.
- Confirm Sync Status is read-only.
- Confirm no cloud writes happen from Sync Status.
- Run `git status`.
- Confirm `.env.local` is not tracked.
- Confirm no scratch/dev logs are intended for commit.
- Confirm no secrets are present.

## 20. Final Warning To Antigravity

Atlas is now beyond simple prototyping. Prefer plan-first, small patches, and safety verification. Do not make broad architectural changes without explicit approval. Preserve local-first behavior above everything else.

Before changing code, inspect the relevant files, understand the data flow, and confirm the change does not alter localStorage, Supabase, sync state, finance calculations, XP/streaks, Dashboard, Today, or Calendar unless the user explicitly asked for that exact behavior.

When uncertain, audit first and propose a narrow implementation plan.
