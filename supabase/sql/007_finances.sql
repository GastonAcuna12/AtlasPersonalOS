-- Atlas Personal OS - Finances transactions-only cloud proof-of-concept
-- Run manually in Supabase SQL editor only after reviewing CLOUD_QA_CHECKLIST.md.
-- This script does not migrate localStorage data, savings, finance settings, goals, dashboard, or available money.

create extension if not exists pgcrypto;

create table if not exists public.finance_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_type text not null,
  amount numeric not null,
  currency text not null,
  category text not null,
  description text not null default '',
  transaction_date date not null,
  payment_method text not null,
  tag text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

comment on table public.finance_transactions is
  'Atlas cloud Finances POC transactions. Preview-only and not included in local available money, dashboard, savings, goals, or monthly summaries.';

comment on column public.finance_transactions.amount is
  'Original transaction amount in the original transaction currency. Do not store converted mixed-currency totals here.';

comment on column public.finance_transactions.currency is
  'Original transaction currency. Atlas currently supports PYG and USD.';

alter table public.finance_transactions
  drop constraint if exists finance_transactions_type_check,
  drop constraint if exists finance_transactions_currency_check,
  drop constraint if exists finance_transactions_amount_check,
  drop constraint if exists finance_transactions_payment_method_check;

alter table public.finance_transactions
  add constraint finance_transactions_type_check
    check (transaction_type in ('income', 'expense')),
  add constraint finance_transactions_currency_check
    check (currency in ('PYG', 'USD')),
  add constraint finance_transactions_amount_check
    check (amount > 0),
  add constraint finance_transactions_payment_method_check
    check (payment_method in ('Cash', 'Debit', 'Credit', 'Bank Transfer', 'Other'));

create index if not exists finance_transactions_user_id_idx on public.finance_transactions(user_id);
create index if not exists finance_transactions_date_idx on public.finance_transactions(transaction_date);
create index if not exists finance_transactions_updated_at_idx on public.finance_transactions(updated_at desc);
create index if not exists finance_transactions_type_idx on public.finance_transactions(transaction_type);
create index if not exists finance_transactions_currency_idx on public.finance_transactions(currency);
create index if not exists finance_transactions_category_idx on public.finance_transactions(category);
create index if not exists finance_transactions_deleted_at_idx on public.finance_transactions(deleted_at);

create or replace function public.set_finance_transactions_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_finance_transactions_updated_at on public.finance_transactions;

create trigger set_finance_transactions_updated_at
before update on public.finance_transactions
for each row
execute function public.set_finance_transactions_updated_at();

alter table public.finance_transactions enable row level security;

drop policy if exists "Finance transactions select own rows" on public.finance_transactions;
create policy "Finance transactions select own rows"
on public.finance_transactions
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Finance transactions insert own rows" on public.finance_transactions;
create policy "Finance transactions insert own rows"
on public.finance_transactions
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Finance transactions update own rows" on public.finance_transactions;
create policy "Finance transactions update own rows"
on public.finance_transactions
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Finance transactions delete own rows" on public.finance_transactions;
create policy "Finance transactions delete own rows"
on public.finance_transactions
for delete
to authenticated
using (auth.uid() = user_id);
