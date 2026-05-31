# Atlas Data Architecture — Centralized Local Data Layer

Atlas is built as a local-first, high-performance offline application. All configurations, reviews, logs, and targets are persisted directly within the browser's `localStorage` sandbox, requiring no external cloud servers, databases, or authentication steps. 

This document describes the unified local data architecture, partitioned settings split, safe data migrations, and the testing framework designed to facilitate future cloud scaling.

---

## 1. Storage Keys Source of Truth

All data entities route through the centralized registry in `src/lib/storage.ts`. Keys have been modernized and unified to align with standard database table names.

| Key Identifier | localStorage Key | Entity Scope |
| :--- | :--- | :--- |
| `transactions` | `atlas.transactions` | Financial Ledger |
| `savings` | `atlas.savings` | Active Reserves Balance |
| `financeSettings` | `atlas.financeSettings` | Currency & Exchange Rates |
| `gymLogs` | `atlas.gymLogs` | Workout Logs & Rest Days |
| `tasks` | `atlas.tasks` | Tasks & Todos (Gen/Acad/Work) |
| `dailyPlans` | `atlas.dailyPlans` | Intentions & Daily Planning Records |
| `dailyWraps` | `atlas.dailyWraps` | Daily Reflections & EOD Summaries |
| `subjects` | `atlas.subjects` | Academic Courses & Colors |
| `academicTasks` | `atlas.academicTasks` | Specialized Academic Milestones |
| `studySessions` | `atlas.studySessions` | Study Duration Logs |
| `notes` | `atlas.notes` | Notes Library Markdown Docs |
| `goals` | `atlas.goals` | Linked & Manual Progress Goals |
| `weeklyReviews` | `atlas.weeklyReviews` | Weekly Reflection Journals |
| `clients` | `atlas.clients` | Freelance Clients & Billing Policy |
| `workItems` | `atlas.workItems` | Kanban Board Deliverable Tickets |
| `xp` | `atlas.xp` | Level Progression State |
| `xpEvents` | `atlas.xpEvents` | Complete Activity Log History |
| `appSettings` | `atlas.appSettings` | Preferences (DayMode, Gym Goals) |

---

## 2. Backward-Compatible Migrations

On startup, `migrateAtlasStorage` runs once silently to port legacy localStorage data to the new unified domains:
1. **Core Mappings**:
   - `atlas.financeTransactions` ➔ `atlas.transactions`
   - `atlas.workoutLogs` ➔ `atlas.gymLogs`
   - `atlas.academicSubjects` ➔ `atlas.subjects`
2. **Settings Split**:
   - Legacy `atlas.settings` is parsed and partitioned.
   - Core app settings (`dayMode`, `gymWeeklyTarget`) are migrated to `atlas.appSettings`.
   - Finance properties (`baseCurrency`, `exchangeRateUsdToPyg`, `exchangeRateUpdatedAt`, `exchangeRateSource`, `usdToPygRate`) are migrated to `atlas.financeSettings`.
   - Original values are preserved as legacy backups to prevent any risk of data loss.

---

## 3. Storage Primitives & SSR Safety

Browser storage APIs (`readFromStorage`, `writeToStorage`, `removeFromStorage`) are completely SSR-safe and Next.js hydration-compliant:
- **SSR Check**: Primitives bypass storage reads during server rendering (`canUseStorage()`) to prevent hydration mismatches.
- **external Sync Store**: The custom hook `useStoredValue` leverages React's native `useSyncExternalStore` callback, enabling instantaneous reactive synchronization across all tabs and panels without requiring heavy Context wrapper overhead.
- **Corrupted Data Safety**: Parser layers catch JSON syntax exceptions silently, returning safe initial domain default states rather than crashing the interface.

---

## 4. Shared Data Schema Models

TypeScript specifications live inside `src/types/atlas.ts`. They define the shape of all core domain entities:

- **FinanceSettings**: Tracks `baseCurrency` and conversion rates.
- **AtlasSettings**: Configures interface layout `dayMode` and gym consistency targets.
- **StreakState**: Maintains consecutive daily streaks and longest historic achievements.
- **CalendarEvent**: Represents a unified, polymorphic calendar card.
- **Backwards-Compatible Aliases**:
  - `Task = AtlasTask`
  - `GymLog = WorkoutLog`
  - `XPEvent = XPActivity`
  - `DailyPlan = DailyPlanRecord`
  - `Savings = SavingsState`
  - `AcademicTask = AtlasTask`

---

## 5. Centralized Derived Math

To keep components pure and focused on layout styling, business calculations are centralized inside domain utility libraries:
- **XP Progression** (`src/lib/xp.ts`): Computes levels, threshold percentages, and weekly momentum scores.
- **Streaks** (`src/lib/streaks.ts`): Calculates gym log training timelines and streak intensities.
- **Finance** (`src/lib/finances.ts`): Performs base conversions, balance tallies, and available funds.
- **Calendar** (`src/lib/dashboard.ts`): Aggregates all polymorphic tasks, gym logs, wraps, and reviews into calendar agenda arrays.
- **Clients & Work** (`src/lib/work.ts`): Resolves client-type billing values (fixed retainers vs hourly caps) and workload calculations.

---

## 6. Centralized JSON Backup Shape

Data management (`src/lib/dataManagement.ts`) exports workspace contents under a unified versioned format:

```json
{
  "source": "atlas",
  "version": 1,
  "exportedAt": "2026-05-30T18:18:24.000Z",
  "data": {
    "transactions": [],
    "savings": {},
    "financeSettings": {},
    "gymLogs": [],
    "tasks": [],
    "dailyPlans": [],
    "dailyWraps": [],
    "subjects": [],
    "academicTasks": [],
    "studySessions": [],
    "notes": [],
    "goals": [],
    "weeklyReviews": [],
    "clients": [],
    "workItems": [],
    "xp": {},
    "xpEvents": [],
    "appSettings": {}
  }
}
```

The import layer supports both the modernized structure and legacy JSON configurations by routing incoming imports through normalization filters.

---

## 7. Public Repo Safety Guidelines

This repository is completely public on GitHub. Strict rules govern the storage and check-ins:
- **No Private Data**: Never hardcode personal records, actual invoice details, private note documents, or secrets inside the source code or mock files.
- **Mock Sandbox**: Load fake demo datasets safely using the **Settings > Testing & Sample Data** controls to test all currency conversion, billing caps, streak flames, and deadline filtering edge cases in one click.
- **Local Vault**: Genuine data must remain securely enclosed inside your local browser sandbox, Obsidian markdown files, or encrypted local backups.

---

## 8. Future Supabase Database Mappings

This architecture is optimized for a future Cloud migration. Local entities map directly to relational SQL tables:

| Local Domain | Supabase Database Table | Primary Key | Key Columns |
| :--- | :--- | :--- | :--- |
| `transactions` | `transactions` | `id` (uuid) | `user_id` (uuid), `amount` (numeric), `currency` (text), `category` (text) |
| `savings` | `savings` | `user_id` (uuid) | `current_amount` (numeric), `currency` (text) |
| `financeSettings` | `finance_settings` | `user_id` (uuid) | `base_currency` (text), `usd_to_pyg_rate` (numeric) |
| `gymLogs` | `gym_logs` | `id` (uuid) | `user_id` (uuid), `date` (date), `workout_type` (text), `duration` (integer) |
| `tasks` | `tasks` | `id` (uuid) | `user_id` (uuid), `title` (text), `status` (text), `priority` (text), `due_date` (date) |
| `notes` | `notes` | `id` (uuid) | `user_id` (uuid), `title` (text), `area` (text), `tags` (text[]), `content` (text) |
| `goals` | `goals` | `id` (uuid) | `user_id` (uuid), `title` (text), `target_value` (numeric), `deadline` (date) |
| `clients` | `clients` | `id` (uuid) | `user_id` (uuid), `name` (text), `billing_type` (text), `monthly_rate` (numeric) |
| `workItems` | `work_items` | `id` (uuid) | `user_id` (uuid), `client_id` (uuid), `title` (text), `status` (text), `value` (numeric) |

### Migration Execution Roadmap:
1. **Relational Constraints**: Enable Row Level Security (RLS) on all Supabase tables using a shared `user_id = auth.uid()` check.
2. **Repository Abstraction**: Swap the Next.js domain hooks (`useStoredValue`) for Postgres client-side fetching wrappers (`supabase.from('tasks').select()`).
3. **Painless Import**: Convert local JSON backups by executing an import mapper that appends `user_id` metadata and executes SQL insert queries.
