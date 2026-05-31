# Supabase Database Transition & Architecture Plan
## Atlas Personal OS — Local-to-Cloud Blueprint

This document outlines the architecture, database schema, security policies, migration workflows, and implementation roadmap required to transition the Atlas Personal OS from a localStorage, offline-first application to a cloud-synced, multi-device ecosystem powered by **Supabase**.

---

## PART 1 — Why Supabase?

Supabase is the ideal backend-as-a-service (BaaS) choice for transitioning Atlas from an offline MVP to a fully robust production system for several key reasons:

1. **Production-Grade Postgres Database**: Postgres provides relational integrity, strict schemas, foreign keys, constraints, and index optimizations. This guarantees that financial balances, task links, and academic dependencies are calculated accurately and never orphaned.
2. **Integrated Authentication**: Supabase provides built-in Email/Password, OAuth, and Magic Link authentication out of the box, mapping each signup to a unique uuid in the `auth.users` database.
3. **Row-Level Security (RLS)**: RLS is a core Postgres feature that executes security filters directly at the database engine level. This ensures that personal, financial, and private notes can never be read or written by another user under any circumstances.
4. **Future Storage Buckets**: Supabase Storage makes it easy to save attachment files, PDF university rubrics, notes assets, and gym progress images securely.
5. **Multi-Device Synchronization**: Shifting from localized storage to an API-driven cloud backend allows a user to access their dashboard seamlessly on mobile browsers, tablets, and desktop workstations simultaneously.
6. **AI and Vector Capabilities**: Supabase features `pgvector`, allowing Atlas to store embedding vectors for university notes, journal reviews, and tasks. This creates a solid database foundation for an offline-safe AI assistant (e.g., Jarvis) in the future.
7. **Clean Migration Path**: Atlas's centralized localStorage data layer Normalizer functions can be adapted into serializable payloads, making a staged migration flow easy and secure.

---

## PART 2 — Current Local Data Model

Currently, Atlas stores all data directly in the browser's `localStorage` via a centralized, normalized repository layer. The domains are:

* **`transactions`**: Financial ledger items containing description, category, amount, currency, and timestamps.
* **`savings`**: Current state of the reserved savings vault balance.
* **`financeSettings`**: Multi-currency base selection and current manual exchange rate conversions.
* **`gymLogs`**: Gym log templates and active workout tracking logs.
* **`tasks`**: Active agenda and general tasks (both personal and academic).
* **`dailyPlans`**: Daily workload loads, intentions, schedules, and active task indices.
* **`dailyWraps`**: Daily reflections, mood scales, productivity reviews, and end-of-day stats snapshots.
* **`subjects`**: University academic courses containing schedules, professors, and styling colors.
* **`academicTasks`**: University deadlines, grading criteria, and specific course links.
* **`studySessions`**: University focus duration timers, dates, and focus scores.
* **`notes`**: Markdown notes repository containing tags, categories, and titles.
* **`goals`**: Active objectives, target numbers, savings link anchors, and deadlines.
* **`weeklyReviews`**: Weekly journal forms, ratings grids, wins lists, and improvement points.
* **`clients`**: Active clients mapped to freelance work.
* **`workItems`**: Work tickets, retainer agreements, billing indicators, and deadlines.
* **`xp`**: Progression scales, current level caps, and current accumulated experience.
* **`xpEvents`**: Logs detailing exactly when and why XP was awarded.
* **`appSettings`**: Active day-mode overrides and habit target settings.

*All active features run strictly offline-first. Moving to Supabase will turn these localStorage domains into relational tables.*

---

## PART 3 — Proposed Supabase Tables

All tables will reside inside the default `public` database schema. All datetime fields will use `timestamptz` (Timestamp with Time Zone) to avoid timezone alignment issues.

### 1. `profiles`
* **Purpose**: Holds user profile, streak metrics, and XP state. Linked directly to Supabase Authentication.
* **Columns**:
  * `id` (`uuid`): Primary key, references `auth.users.id` on delete cascade.
  * `display_name` (`text`): Nullable.
  * `current_xp` (`integer`): Required, default `0`.
  * `level` (`integer`): Required, default `1`.
  * `streak_current` (`integer`): Required, default `0`.
  * `streak_longest` (`integer`): Required, default `0`.
  * `created_at` (`timestamptz`): Required, default `now()`.
  * `updated_at` (`timestamptz`): Required, default `now()`.
* **Foreign Keys**: `id` references `auth.users.id`.
* **Indexes**: Unique index on `id`.

### 2. `finance_transactions`
* **Purpose**: General ledger database tracking incomes and expenditures.
* **Columns**:
  * `id` (`uuid`): Primary key, default `gen_random_uuid()`.
  * `user_id` (`uuid`): Required, references `auth.users.id` on delete cascade.
  * `description` (`text`): Required.
  * `amount` (`numeric`): Required.
  * `category` (`text`): Required.
  * `currency` (`text`): Required (e.g., `'USD'`, `'PYG'`).
  * `date` (`date`): Required, default `current_date`.
  * `created_at` (`timestamptz`): Required, default `now()`.
  * `updated_at` (`timestamptz`): Required, default `now()`.
  * `deleted_at` (`timestamptz`): Nullable.
* **Foreign Keys**: `user_id` references `auth.users.id`.
* **Indexes**: B-tree index on `user_id`, B-tree index on `(user_id, date)`.

### 3. `savings_vaults`
* **Purpose**: Tracks reserved, non-spendable balance vaults.
* **Columns**:
  * `id` (`uuid`): Primary key, default `gen_random_uuid()`.
  * `user_id` (`uuid`): Required, references `auth.users.id` on delete cascade.
  * `balance` (`numeric`): Required, default `0`.
  * `currency` (`text`): Required, default `'PYG'`.
  * `created_at` (`timestamptz`): Required, default `now()`.
  * `updated_at` (`timestamptz`): Required, default `now()`.
* **Foreign Keys**: `user_id` references `auth.users.id`.
* **Indexes**: Unique index on `user_id`.

### 4. `finance_settings`
* **Purpose**: Stores active exchange rates and primary currency selectors.
* **Columns**:
  * `id` (`uuid`): Primary key, default `gen_random_uuid()`.
  * `user_id` (`uuid`): Required, references `auth.users.id` on delete cascade.
  * `base_currency` (`text`): Required, default `'PYG'`.
  * `usd_to_pyg_rate` (`numeric`): Required, default `6150`.
  * `rate_source` (`text`): Required, default `'manual'`.
  * `rate_updated_at` (`timestamptz`): Required, default `now()`.
  * `created_at` (`timestamptz`): Required, default `now()`.
  * `updated_at` (`timestamptz`): Required, default `now()`.
* **Foreign Keys**: `user_id` references `auth.users.id`.
* **Indexes**: Unique index on `user_id`.

### 5. `gym_logs`
* **Purpose**: Records gym visits and workouts.
* **Columns**:
  * `id` (`uuid`): Primary key, default `gen_random_uuid()`.
  * `user_id` (`uuid`): Required, references `auth.users.id` on delete cascade.
  * `date` (`date`): Required.
  * `label` (`text`): Required (e.g., `'Leg Day'`, `'Upper body'`).
  * `exercises` (`jsonb`): Required (holds templates or details arrays).
  * `created_at` (`timestamptz`): Required, default `now()`.
  * `updated_at` (`timestamptz`): Required, default `now()`.
  * `deleted_at` (`timestamptz`): Nullable.
* **Foreign Keys**: `user_id` references `auth.users.id`.
* **Indexes**: B-tree index on `(user_id, date)`.

### 6. `tasks`
* **Purpose**: Core tasks (combines general dashboard tasks and academic tasks).
* **Columns**:
  * `id` (`uuid`): Primary key, default `gen_random_uuid()`.
  * `user_id` (`uuid`): Required, references `auth.users.id` on delete cascade.
  * `title` (`text`): Required.
  * `completed` (`boolean`): Required, default `false`.
  * `completed_at` (`timestamptz`): Nullable.
  * `planned_date` (`date`): Nullable.
  * `due_date` (`date`): Nullable.
  * `priority` (`text`): Required, default `'medium'`.
  * `energy_required` (`text`): Required, default `'medium'`.
  * `estimated_minutes` (`integer`): Required, default `30`.
  * `notes` (`text`): Nullable.
  * `area` (`text`): Required, default `'Personal'` (e.g., `'Personal'`, `'Academic'`).
  * `subject_id` (`uuid`): Nullable, references `academic_subjects.id` on delete set null.
  * `academic_type` (`text`): Nullable (e.g., `'Assignment'`, `'Exam'`).
  * `grade` (`text`): Nullable.
  * `created_at` (`timestamptz`): Required, default `now()`.
  * `updated_at` (`timestamptz`): Required, default `now()`.
  * `deleted_at` (`timestamptz`): Nullable.
* **Foreign Keys**:
  * `user_id` references `auth.users.id`.
  * `subject_id` references `academic_subjects.id`.
* **Indexes**: B-tree indexes on `user_id`, `(user_id, completed)`, `(user_id, planned_date)`.

### 7. `daily_plans`
* **Purpose**: Tracks intentions and daily schedules.
* **Columns**:
  * `id` (`uuid`): Primary key, default `gen_random_uuid()`.
  * `user_id` (`uuid`): Required, references `auth.users.id` on delete cascade.
  * `date` (`date`): Required.
  * `intentions` (`text`[]): Required, default `'{}`.
  * `schedules` (`jsonb`[]): Required, default `'[]'`.
  * `day_mode` (`text`): Required, default `'Normal Day'`.
  * `created_at` (`timestamptz`): Required, default `now()`.
  * `updated_at` (`timestamptz`): Required, default `now()`.
* **Foreign Keys**: `user_id` references `auth.users.id`.
* **Indexes**: B-tree index on `(user_id, date)` (unique index).

### 8. `daily_wraps`
* **Purpose**: Retrospective reflection notes logged at the end of the day.
* **Columns**:
  * `id` (`uuid`): Primary key, default `gen_random_uuid()`.
  * `user_id` (`uuid`): Required, references `auth.users.id` on delete cascade.
  * `date` (`date`): Required.
  * `mood` (`integer`): Required (scale 1-10).
  * `energy` (`integer`): Required (scale 1-10).
  * `productivity` (`integer`): Required (scale 1-10).
  * `generated_summary` (`text`): Nullable.
  * `stats_snapshot` (`jsonb`): Required.
  * `created_at` (`timestamptz`): Required, default `now()`.
  * `updated_at` (`timestamptz`): Required, default `now()`.
* **Foreign Keys**: `user_id` references `auth.users.id`.
* **Indexes**: B-tree index on `(user_id, date)` (unique index).

### 9. `academic_subjects`
* **Purpose**: Represents academic courses/subjects.
* **Columns**:
  * `id` (`uuid`): Primary key, default `gen_random_uuid()`.
  * `user_id` (`uuid`): Required, references `auth.users.id` on delete cascade.
  * `name` (`text`): Required.
  * `professor` (`text`): Nullable.
  * `schedule` (`text`): Nullable.
  * `notes` (`text`): Nullable.
  * `accent` (`text`): Required (Tailwind accent class).
  * `archived` (`boolean`): Required, default `false`.
  * `created_at` (`timestamptz`): Required, default `now()`.
  * `updated_at` (`timestamptz`): Required, default `now()`.
* **Foreign Keys**: `user_id` references `auth.users.id`.
* **Indexes**: B-tree index on `user_id`.

### 10. `study_sessions`
* **Purpose**: Tracks study sessions and pomodoro statistics.
* **Columns**:
  * `id` (`uuid`): Primary key, default `gen_random_uuid()`.
  * `user_id` (`uuid`): Required, references `auth.users.id` on delete cascade.
  * `subject_id` (`uuid`): Required, references `academic_subjects.id` on delete cascade.
  * `date` (`date`): Required.
  * `duration_minutes` (`integer`): Required.
  * `focus_level` (`integer`): Required (scale 1-10).
  * `notes` (`text`): Nullable.
  * `created_at` (`timestamptz`): Required, default `now()`.
  * `updated_at` (`timestamptz`): Required, default `now()`.
* **Foreign Keys**:
  * `user_id` references `auth.users.id`.
  * `subject_id` references `academic_subjects.id`.
* **Indexes**: B-tree index on `(user_id, subject_id)`, B-tree index on `(user_id, date)`.

### 11. `notes`
* **Purpose**: Markdown notes vault.
* **Columns**:
  * `id` (`uuid`): Primary key, default `gen_random_uuid()`.
  * `user_id` (`uuid`): Required, references `auth.users.id` on delete cascade.
  * `title` (`text`): Required.
  * `content` (`text`): Required, default `''`.
  * `category` (`text`): Required, default `'General'`.
  * `tags` (`text`[]): Required, default `'{}`.
  * `created_at` (`timestamptz`): Required, default `now()`.
  * `updated_at` (`timestamptz`): Required, default `now()`.
  * `deleted_at` (`timestamptz`): Nullable.
* **Foreign Keys**: `user_id` references `auth.users.id`.
* **Indexes**: B-tree index on `user_id`, GIN index on `tags` (for fast tag searches).

### 12. `goals`
* **Purpose**: Goal milestones and progress tracker.
* **Columns**:
  * `id` (`uuid`): Primary key, default `gen_random_uuid()`.
  * `user_id` (`uuid`): Required, references `auth.users.id` on delete cascade.
  * `title` (`text`): Required.
  * `category` (`text`): Required.
  * `current_value` (`numeric`): Required, default `0`.
  * `target_value` (`numeric`): Required, default `100`.
  * `unit` (`text`): Required (e.g., `'%'`, `'workouts'`, `'USD'`).
  * `deadline` (`date`): Nullable.
  * `linked_finance_metric` (`text`): Nullable (e.g., `'savings'`).
  * `notes` (`text`): Nullable.
  * `created_at` (`timestamptz`): Required, default `now()`.
  * `updated_at` (`timestamptz`): Required, default `now()`.
  * `deleted_at` (`timestamptz`): Nullable.
* **Foreign Keys**: `user_id` references `auth.users.id`.
* **Indexes**: B-tree index on `user_id`.

### 13. `weekly_reviews`
* **Purpose**: Weekly retrospective metrics and logs.
* **Columns**:
  * `id` (`uuid`): Primary key, default `gen_random_uuid()`.
  * `user_id` (`uuid`): Required, references `auth.users.id` on delete cascade.
  * `week_start` (`date`): Required.
  * `week_end` (`date`): Required.
  * `ratings` (`jsonb`): Required (ratings across fitness, work, academics...).
  * `wins` (`text`): Nullable.
  * `problems` (`text`): Nullable.
  * `lessons` (`text`): Nullable.
  * `what_felt_off` (`text`): Nullable.
  * `what_to_improve` (`text`): Nullable.
  * `next_week_focus` (`text`): Nullable.
  * `biggest_win` (`text`): Nullable.
  * `biggest_problem` (`text`): Nullable.
  * `one_thing_to_stop` (`text`): Nullable.
  * `one_thing_to_continue` (`text`): Nullable.
  * `one_thing_to_start` (`text`): Nullable.
  * `mood_summary` (`text`): Nullable.
  * `xp_awarded` (`boolean`): Required, default `false`.
  * `created_at` (`timestamptz`): Required, default `now()`.
  * `updated_at` (`timestamptz`): Required, default `now()`.
* **Foreign Keys**: `user_id` references `auth.users.id`.
* **Indexes**: B-tree index on `(user_id, week_start)` (unique index).

### 14. `clients`
* **Purpose**: Freelance clients.
* **Columns**:
  * `id` (`uuid`): Primary key, default `gen_random_uuid()`.
  * `user_id` (`uuid`): Required, references `auth.users.id` on delete cascade.
  * `name` (`text`): Required.
  * `status` (`text`): Required, default `'active'`.
  * `notes` (`text`): Nullable.
  * `created_at` (`timestamptz`): Required, default `now()`.
  * `updated_at` (`timestamptz`): Required, default `now()`.
* **Foreign Keys**: `user_id` references `auth.users.id`.
* **Indexes**: B-tree index on `user_id`.

### 15. `work_items`
* **Purpose**: Active client tickets and freelance obligations.
* **Columns**:
  * `id` (`uuid`): Primary key, default `gen_random_uuid()`.
  * `user_id` (`uuid`): Required, references `auth.users.id` on delete cascade.
  * `client_id` (`uuid`): Required, references `clients.id` on delete cascade.
  * `title` (`text`): Required.
  * `status` (`text`): Required, default `'backlog'`.
  * `priority` (`text`): Required, default `'medium'`.
  * `billing_type` (`text`): Required (e.g., `'hourly'`, `'fixed'`).
  * `rate` (`numeric`): Required.
  * `estimated_minutes` (`integer`): Required, default `60`.
  * `actual_minutes` (`integer`): Required, default `0`.
  * `planned_date` (`date`): Nullable.
  * `deadline` (`date`): Nullable.
  * `completed_at` (`timestamptz`): Nullable.
  * `reference_url` (`text`): Nullable.
  * `notes` (`text`): Nullable.
  * `created_at` (`timestamptz`): Required, default `now()`.
  * `updated_at` (`timestamptz`): Required, default `now()`.
  * `deleted_at` (`timestamptz`): Nullable.
* **Foreign Keys**:
  * `user_id` references `auth.users.id`.
  * `client_id` references `clients.id`.
* **Indexes**: B-tree index on `user_id`, B-tree index on `(user_id, client_id)`.

### 16. `xp_events`
* **Purpose**: Progression logs detailing earned XP occurrences.
* **Columns**:
  * `id` (`uuid`): Primary key, default `gen_random_uuid()`.
  * `user_id` (`uuid`): Required, references `auth.users.id` on delete cascade.
  * `amount` (`integer`): Required.
  * `reason` (`text`): Required.
  * `timestamp` (`timestamptz`): Required, default `now()`.
* **Foreign Keys**: `user_id` references `auth.users.id`.
* **Indexes**: B-tree index on `user_id`.

### 17. `user_settings`
* **Purpose**: General settings like habit goals and UI metrics.
* **Columns**:
  * `id` (`uuid`): Primary key, default `gen_random_uuid()`.
  * `user_id` (`uuid`): Required, references `auth.users.id` on delete cascade.
  * `gym_weekly_target` (`integer`): Required, default `4`.
  * `created_at` (`timestamptz`): Required, default `now()`.
  * `updated_at` (`timestamptz`): Required, default `now()`.
* **Foreign Keys**: `user_id` references `auth.users.id`.
* **Indexes**: Unique index on `user_id`.

---

## PART 4 — User Ownership Model

Atlas is designed for deep personal introspection. To ensure strict data privacy, **every single user-owned table** maps directly back to the active user's identity:

```
[ auth.users ]
     │
     │ (references auth.users.id on delete cascade)
     ▼
[ finance_transactions / tasks / notes / goals / weekly_reviews / gym_logs ... ]
  └─ columns: id (primary key), user_id (foreign key), created_at, updated_at
```

* **Authentication Lock**: The `user_id` column contains the authenticated user's unique identifier (`auth.users.id`).
* **Relational Cascading**: If a user requests a complete deletion of their account, Postgres's `ON DELETE CASCADE` constraint automatically and cleanly purges all linked records across all 18 tables.
* **Data Isolation**: A user owns exactly their rows. There are no sharing, group, or admin read permissions across data records. This is enforced directly at the SQL level.

---

## PART 5 — Row Level Security (RLS) Plan

Postgres Row Level Security (RLS) acts as a strict firewall. When RLS is enabled, every SQL query is intercepted and filtered before returning results.

### Basic Policy Pattern
For every table (`finance_transactions`, `gym_logs`, `tasks`, etc.), we will enforce the identical isolated RLS policy pattern:

```sql
-- 1. Enable RLS on the table
ALTER TABLE public.finance_transactions ENABLE ROW LEVEL SECURITY;

-- 2. Allow SELECT only if the row's user_id matches the authenticated user's uid
CREATE POLICY "Allow read for owner only" 
  ON public.finance_transactions 
  FOR SELECT 
  TO authenticated 
  USING (auth.uid() = user_id);

-- 3. Allow INSERT only if the new row's user_id matches the authenticated user's uid
CREATE POLICY "Allow write for owner only" 
  ON public.finance_transactions 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = user_id);

-- 4. Allow UPDATE only if the existing row's user_id matches the authenticated user's uid
CREATE POLICY "Allow edit for owner only" 
  ON public.finance_transactions 
  FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. Allow DELETE only if the row's user_id matches the authenticated user's uid
CREATE POLICY "Allow delete for owner only" 
  ON public.finance_transactions 
  FOR DELETE 
  TO authenticated 
  USING (auth.uid() = user_id);
```

### RLS Criticality
> [!IMPORTANT]
> Because Atlas stores extremely sensitive personal data—including finances, goals, study habits, notes, daily mood reflections, and freelance client invoices—**RLS must be enabled on every table immediately upon creation and thoroughly audited before shipping to production.** 
> Failure to set RLS on even a single table could expose private database tables to any authenticated user using the client anon key.

---

## PART 6 — Migration Strategy from localStorage

To preserve the seamless local-first onboarding experience of Atlas, we will execute a structured transition flow for existing users:

### Step-by-Step Onboarding Flow

```
[ Local-First State ] ──► [ User Registers / Signs In ] ──► [ Local Data Detected? ]
                                                                   │
                                                                   ▼
                                                       ┌───────────────────────┐
                                                       │ User Onboarding Options│
                                                       └───────────┬───────────┘
                                                                   │
    ┌──────────────────────┬───────────────────────────────────────┼───────────────────────────────────────┐
    ▼                      ▼                                       ▼                                       ▼
[ Keep Local Only ] [ Upload Local to Cloud ]             [ Replace Cloud with Local ]            [ Merge Local and Cloud ]
(Continues offline) (Pushes fresh tables)                 (Wipes cloud, overwrites)               (Checks dates & resolves)
```

1. **Local-First Onboarding**: The user signs up and begins using Atlas immediately without an account. All data resides in `localStorage`.
2. **Account Creation**: The user decides to sync devices and signs up via the Settings tab.
3. **Data Detection**: Upon successful auth completion, the Atlas synchronization layer checks if active localStorage records exist.
4. **Interactive Choice Dialogue**: The user is presented with four clear choices:
   * **Keep Local Only**: The user cancels cloud sync; data remains strictly offline in `localStorage`.
   * **Upload Local Data**: Perfect for fresh cloud accounts. Push local data tables directly to the empty database.
   * **Replace Cloud Data**: Overwrites whatever exists in the cloud with the current local dataset.
   * **Merge Local & Cloud**: Matches records, resolving overlaps.
5. **Table-by-Table Migration**: Atlas processes all 18 domains sequentially (e.g., subjects ➔ tasks ➔ transactions ➔ daily wraps).
6. **Count Audit**: The sync manager compares local and cloud record counts before wrapping up.
7. **Local Backup Preservation**: The `localStorage` contents are copied to a backup JSON string (`atlas_backup_pre_migration`) in the local client database rather than auto-deleted.
8. **Manual Purge**: A notice advises the user: *"Your database is synced to the cloud. You can safely clear your local browser storage inside Settings when ready."*

---

## PART 7 — Sync Model

To minimize initial complexity and avoid merge headaches, we will implement sync in two progressive phases:

### Phase 1: Simple Cloud-as-Truth Sync (Target MVP)
* **Rule**: Once a user successfully logs in, the **Supabase Database** becomes the absolute source of truth.
* **Offline Fallback**: `localStorage` serves as a read-only mirror and temporary queue.
* **Sync Frequency**: Records are loaded from Supabase upon app launch, and any local updates write directly to the Supabase client API.
* **No Real-Time Conflict Resolution**: Simplicity first.

### Phase 2: Offline-First Cache and Synchronization
* **Rule**: The app operates out of a local SQL (e.g., IndexedDB or local cache) database.
* **Staged Sync**: Records feature an `updated_at` timestamp. A background synchronization worker compares `updated_at` stamps between client and cloud.
* **Conflict Handling (Latest Wins)**: 
  * If a record was updated in both places, the record with the most recent `updated_at` timestamp wins.
  * Avoid complex multi-user merges. Since Atlas is a personal OS, the only sync conflicts will arise from the same user modifying tasks on two devices offline simultaneously.

---

## PART 8 — First Module to Migrate

We strongly recommend migrating **Notes** or **Tasks** as the very first test module, rather than starting with Finances.

| Module | Schema Complexity | Sensitivity | Verdict |
| :--- | :--- | :--- | :--- |
| **Notes** | **Low** (Simple key-value, title, content, tags) | **Medium** | **Recommended Start**: Safest playground to test schema mapping and read/write loops. |
| **Tasks** | **Medium** (Dates, checkboxes, links) | **Medium** | **Alternative Start**: Great to test foreign key constraints with subjects. |
| **Finances** | **High** (Calculations, ledger dependencies) | **Critical** | **Do Not Start Here**: High financial math correctness constraint. Save for last. |

### Why Notes First?
* Notes are self-contained. They do not reference other tables (except the owner's profile).
* A failure in notes synchronization is non-destructive to streaks, levels, or financial accounting calculations.
* Perfect to test text searching, GIN index tag querying, and basic CRUD policies.

---

## PART 9 — Environment Variables

Atlas will remain fully public-safe by documenting environment parameters inside `.env.example` and keeping `.env.local` strictly inside `.gitignore`.

### Required variables inside `.env.example`:
```bash
# Public URL for the Supabase Project API endpoint
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url.supabase.co

# Public Client Anon Key (Safe to use in the client ONLY with active RLS)
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-client-anon-key
```

### Security Rules
1. **Never Commit Secrets**: Never commit `.env.local`, `.env`, or `.env.production` files.
2. **Safe Anon Key**: The `NEXT_PUBLIC_SUPABASE_ANON_KEY` is meant to be shipped in the frontend code. It is completely safe as long as Row-Level Security (RLS) is enabled and correctly configured on every single database table.
3. **No Service Role Keys**: Never expose the `service_role` key inside your client-side Next.js code. The `service_role` key bypasses RLS and could leak the entire database. Keep it strictly inside secure backend Edge Functions if used.

---

## PART 10 — Future Implementation Roadmap

To execute this migration successfully without breaking the current live app, we will use a highly systematic step-by-step sequence:

```
[1. Project Setup] ──► [2. SQL DDL & RLS] ──► [3. Auth & Client Setup]
                                                     │
                                                     ▼
[6. Final Sync]   ◄── [5. Staged Migration] ◄── [4. Staged First Module]
```

1. **Create Supabase Project**: Set up a new project in the Supabase Dashboard.
2. **Execute Database DDL**: Run SQL commands in the Supabase SQL editor to create all 18 tables with the correct column types and default values.
3. **Activate RLS**: Enable RLS on every table.
4. **Apply RLS Policies**: Execute the `Allow owner only` policies for all SQL operations.
5. **Generate Client Types**: Run `npx supabase gen types typescript` to fetch the strict TS types.
6. **Set Up Environments**: Create a public `.env.example` file and create a localized `.env.local` file containing the credentials.
7. **Install Supabase Client**: Install `@supabase/supabase-js` and `@supabase/ssr`.
8. **Create Supabase Browser Client**: Initialize the browser client helper inside a `src/lib/supabase.ts` file.
9. **Build Authentication UI**: Add a premium slate Auth form under `/settings` or in an overlay modal.
10. **Link User Profile Creation**: Add a Postgres database trigger that automatically inserts a fresh row into the `public.profiles` table whenever a new user signs up inside `auth.users`.
11. **Migrate the First Module (Notes)**: Update `src/lib/notes.ts` to switch from `localStorage` to Supabase reads/writes upon active session detection.
12. **Implement Local-to-Cloud Migration Manager**: Write the staged, table-by-table upload and audit engine with count checks and backups.
13. **QA Testing**: Connect the QA Harness and generate demo sample data to test the cloud upload and sync speeds.
14. **Migrate Remaining Modules Sequentially**: Transition remaining tables (Tasks ➔ Gym ➔ Academics ➔ Finances).
15. **Enable Offline Sync and AI Insights**: Move toward Stage 2 sync and begin utilizing Postgres vector indexes.

---

## PART 11 — Risks & Mitigation Checklist

* **Risk 1: Broken RLS Rules**
  * *Consequence*: Private journals or freelance client rates leaked to another user.
  * *Mitigation*: Write database integration tests asserting that executing a query with user A's token returns zero records belonging to user B.
* **Risk 2: Timezone Shifts**
  * *Consequence*: Tasks, study logs, or transactions showing up on the wrong day.
  * *Mitigation*: Ensure all timestamp columns use the `timestamptz` type and format ISO strings uniformly on the client.
* **Risk 3: Destructive Sync Merges**
  * *Consequence*: Cloud sync overwrites newer local logs.
  * *Mitigation*: Ensure local data is cloned into a backup JSON string in `localStorage` prior to running any merge scripts.
* **Risk 4: Leaked Service Role Key**
  * *Consequence*: Full system compromise.
  * *Mitigation*: Set up a git pre-commit hook that automatically blocks commits containing strings matching the service role key regex.

---

## PART 12 — Public Repository Safety Checklist

Before committing any future database changes or migration scripts, ensure the codebase complies with these public safety rules:

* [x] **No Real User Data**: Only safe, mock development sample data should reside in any committed seed scripts.
* [x] **Gitignore Active**: Verify that `.env.local`, `.env`, and `*.json` backup files are blocked inside `.gitignore`.
* [x] **No Hardcoded Keys**: Assert that zero API credentials or connection URLs are hardcoded in code files.
* [x] **Mocking Complete**: Ensure the QA dataset remains completely simulated.

---

## PART 13 — Future AI / Jarvis Note

Integrated artificial intelligence adds massive value to a personal OS, but it **must come after database stability**.

```
[ Centralized Data Layer ] ──► [ Supabase Cloud Sync / Auth ] ──► [ Secure AI Insights ]
                                                                       (Vector Search & pgvector)
```

### The Path to Jarvis
1. Establish a stable relational schema.
2. Ensure user data isolation through strict RLS firewalls.
3. Enable pgvector database extensions inside Postgres.
4. Set up an isolated, secure edge model service (such as Google Gemini API via serverless functions) to compute text embeddings.
5. Implement AI features:
   * **Weekly Review Synthesis**: Generate comprehensive retrospectives comparing gym logs, University study sessions, and freelance net profit.
   * **Spending Forecasts**: Provide insights on recurring expenditures.
   * **Optimized Study Timelines**: Suggest study schedules based on historical focus scores.

*AI logic will only be introduced once the Supabase relational layer is thoroughly verified and secure.*
