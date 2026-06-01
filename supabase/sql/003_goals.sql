-- Atlas Personal OS - Goals cloud proof-of-concept
-- Run manually in Supabase SQL editor only after reviewing CLOUD_QA_CHECKLIST.md.
-- This script does not migrate localStorage data or Savings Vault data.

create extension if not exists pgcrypto;

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  area text,
  goal_type text,
  status text not null default 'active',
  priority text,
  current_value numeric,
  target_value numeric,
  unit text,
  currency text,
  deadline date,
  linked_metric text,
  linked_source text,
  progress numeric,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

comment on table public.goals is
  'Atlas cloud goals POC. Every row must belong to auth.uid() through user_id.';

comment on column public.goals.user_id is
  'Supabase Auth user owner. RLS policies require auth.uid() = user_id.';

comment on column public.goals.description is
  'Atlas local goal notes mapped to cloud description for this POC.';

comment on column public.goals.linked_metric is
  'Atlas linked finance metric: none or savings. This POC does not migrate Savings Vault data.';

alter table public.goals
  drop constraint if exists goals_status_check,
  drop constraint if exists goals_currency_check,
  drop constraint if exists goals_linked_metric_check,
  drop constraint if exists goals_progress_check;

alter table public.goals
  add constraint goals_status_check
    check (status in ('active', 'completed', 'paused')),
  add constraint goals_currency_check
    check (
      currency is null
      or currency in ('PYG', 'USD')
    ),
  add constraint goals_linked_metric_check
    check (
      linked_metric is null
      or linked_metric in ('none', 'savings')
    ),
  add constraint goals_progress_check
    check (
      progress is null
      or (progress >= 0 and progress <= 100)
    );

create index if not exists goals_user_id_idx on public.goals(user_id);
create index if not exists goals_updated_at_idx on public.goals(updated_at desc);
create index if not exists goals_deadline_idx on public.goals(deadline);
create index if not exists goals_status_idx on public.goals(status);
create index if not exists goals_area_idx on public.goals(area);
create index if not exists goals_deleted_at_idx on public.goals(deleted_at);

create or replace function public.set_goals_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_goals_updated_at on public.goals;

create trigger set_goals_updated_at
before update on public.goals
for each row
execute function public.set_goals_updated_at();

alter table public.goals enable row level security;

drop policy if exists "Goals select own rows" on public.goals;
create policy "Goals select own rows"
on public.goals
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Goals insert own rows" on public.goals;
create policy "Goals insert own rows"
on public.goals
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Goals update own rows" on public.goals;
create policy "Goals update own rows"
on public.goals
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Goals delete own rows" on public.goals;
create policy "Goals delete own rows"
on public.goals
for delete
to authenticated
using (auth.uid() = user_id);
