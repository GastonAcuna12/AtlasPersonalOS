# Supabase Finances POC

Atlas Finances now has a transactions-only Supabase proof-of-concept.

This is not sync. This is not migration. Local-first Finances remains the
default and the source for all real finance calculations.

## Scope

This POC includes only:

- cloud finance transactions
- manual cloud CRUD helpers
- a separate `Cloud Finances Preview` panel
- manual two-user RLS testing

This POC intentionally excludes:

- Savings Vault
- finance settings
- exchange-rate settings
- Goals savings progress
- Dashboard finance cards
- Available Money calculations
- monthly balance calculations
- local finance insights

## Why Savings And Settings Are Excluded

Finances is the most sensitive Atlas module.

Savings is also product-sensitive because Atlas treats it as reserved money,
not spendable money. Savings currently belongs primarily in Goals through the
Savings Vault and savings-linked goals.

Finance settings are excluded because base currency and exchange-rate changes
can alter displayed totals. Cloud settings should not override local settings
during a preview-only POC.

The first safe step is to validate transaction CRUD and RLS isolation only.

## What Was Implemented

- A manual SQL setup file at `supabase/sql/007_finances.sql`.
- Cloud transaction helpers in `src/lib/supabase/finances.ts`.
- A separate `Cloud Finances Preview` panel on `/finances`.
- A Finances card in Settings > Cloud QA Checklist.
- English and Spanish labels for the Finances cloud POC UI.

The cloud preview can manually:

- Load cloud transactions.
- Create a test cloud income.
- Create a test cloud expense.
- Upload one selected local transaction copy after confirmation.

Upload all remains disabled and marked Coming soon.

## What Remains Disabled

- No automatic upload after sign-in.
- No automatic merge.
- No automatic replace.
- No automatic delete.
- No local-to-cloud sync.
- No cloud-to-local sync.
- No Savings Vault table.
- No cloud finance settings table.
- No Dashboard finance integration.
- No Goals savings integration.
- No Available Money changes.
- No monthly balance changes.
- No XP changes.

Per `SYNC_ARCHITECTURE_AND_UX_PLAN.md`, visible POC panels are temporary and
should later move into diagnostics or be removed once unified sync is designed.

## Table

The transactions-only POC uses one user-owned table:

- `public.finance_transactions`

### `public.finance_transactions`

Columns:

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `transaction_type text not null`
- `amount numeric not null`
- `currency text not null`
- `category text not null`
- `description text not null default ''`
- `transaction_date date not null`
- `payment_method text not null`
- `tag text`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `deleted_at timestamptz`

## Currency Safety Rules

Every cloud row stores the original transaction amount and original transaction
currency.

The cloud helper does not convert currencies. It does not calculate Available
Money, monthly net, savings rate, or mixed-currency totals.

The preview UI displays original-currency totals only:

- income PYG
- expense PYG
- income USD
- expense USD

USD is never subtracted as raw PYG. Any future converted display must be clearly
labeled and use the existing local exchange-rate setting.

## Constraints

The SQL constrains closed values used by the local Atlas model:

- `transaction_type in ('income', 'expense')`
- `currency in ('PYG', 'USD')`
- `amount > 0`
- `payment_method in ('Cash', 'Debit', 'Credit', 'Bank Transfer', 'Other')`

`category`, `description`, and `tag` are intentionally flexible because users
can create custom categories and tags locally.

## Indexes

Indexes are created for:

- `user_id`
- `transaction_date`
- `updated_at desc`
- `transaction_type`
- `currency`
- `category`
- `deleted_at`

## RLS Policy Plan

Every row has a `user_id` column.

RLS policies use:

```sql
auth.uid() = user_id
```

for:

- SELECT own rows only
- INSERT own rows only
- UPDATE own rows only
- DELETE own rows only

No anonymous access is intended.

## Manual SQL Setup

Run this file manually in the Supabase SQL Editor:

```text
supabase/sql/007_finances.sql
```

Do not run it from app code.

After running it:

1. Confirm `public.finance_transactions` exists.
2. Confirm RLS is enabled.
3. Confirm own-row SELECT, INSERT, UPDATE, and DELETE policies exist.
4. Confirm constraints exist.
5. Confirm indexes exist.

## Local-First Fallback

When Supabase is not configured:

- `/finances` continues to use localStorage.
- Local transactions continue to work.
- Available Money continues to use local transactions and local savings.
- No cloud operation runs.

When Supabase is configured but signed out:

- Local Finances still works.
- The cloud panel explains that signing in is required for manual cloud testing.

When signed in:

- Cloud actions are manual.
- Cloud transactions are shown separately.
- Local transactions are not overwritten.
- Local calculations do not read cloud transactions.

## Manual Cloud Actions

The cloud preview supports:

- `Load cloud transactions`
- `Create test cloud income`
- `Create test cloud expense`
- `Upload selected local transaction copy`

Selected upload requires browser confirmation and creates a cloud copy only.
It does not mark the local transaction as synced and does not delete or modify
the local transaction.

## Two-User RLS Testing Checklist

Use the Settings > Cloud QA Checklist helper and verify manually:

1. Run `supabase/sql/007_finances.sql` in Supabase SQL Editor.
2. Sign in as User A.
3. Create a test cloud income and expense.
4. Load cloud transactions and confirm User A sees them.
5. Sign out.
6. Sign in as User B.
7. Load cloud transactions and confirm User B does not see User A data.
8. Create User B cloud transaction.
9. Sign out.
10. Sign in as User A again.
11. Confirm User A does not see User B data.
12. Confirm local transactions remain unchanged.
13. Confirm Available Money remains unchanged.
14. Confirm Monthly Balance remains unchanged.
15. Confirm Savings Vault remains unchanged.
16. Confirm no auto-sync happened.

## Error Handling Checklist

The UI/helper layer should handle:

- missing Supabase env vars
- signed-out users
- missing `finance_transactions` table
- RLS denial
- network errors
- check constraint errors

Errors should be useful without exposing secrets or private finance details.

## Migration Safety Rules

Future migration must require:

- JSON export before migration.
- Record count preview.
- Transaction totals by original currency.
- Converted totals preview only if clearly labeled.
- Savings preview separated from spendable money.
- Duplicate detection preview.
- Explicit confirmation for upload, merge, or replace.
- Destructive confirmation for replace/delete.
- No automatic local deletion after migration.
- Post-migration count verification.

## CLOUD_QA_CHECKLIST Alignment

This POC must pass `CLOUD_QA_CHECKLIST.md` before Finances can be considered
for real cloud-backed migration.

Graduation requires:

- manual CRUD works
- RLS passes the two-user test
- local-first fallback works
- migration behavior is explicit
- lint and build pass
- docs are updated

## Why Local Finances Remains Untouched

Finance data is high sensitivity and correctness-critical.

For this POC:

- Cloud records are displayed only in `Cloud Finances Preview`.
- Local Finances remains powered by localStorage.
- Cloud transactions do not affect Available Money.
- Cloud transactions do not affect monthly balance.
- Cloud transactions do not affect Dashboard.
- Cloud transactions do not affect Goals.
- Cloud transactions do not affect Savings Vault.
- Cloud transactions do not award XP.
- Cloud transactions do not alter local insights.
