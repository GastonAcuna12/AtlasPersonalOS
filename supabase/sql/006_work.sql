-- Atlas Personal OS - Work cloud proof-of-concept
-- Run manually in Supabase SQL editor only after reviewing CLOUD_QA_CHECKLIST.md.
-- This script does not migrate localStorage data, Today, Dashboard, billing summaries, XP, or finances.

create extension if not exists pgcrypto;

create table if not exists public.work_clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  client_type text,
  status text not null default 'active',
  difficulty text,
  billing_mode text not null default 'per_item',
  default_rate numeric,
  hourly_rate numeric,
  fixed_monthly_amount numeric,
  currency text,
  contact_name text,
  contact_email text,
  notes text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.work_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references public.work_clients(id) on delete set null,
  title text not null,
  description text not null default '',
  status text not null default 'backlog',
  priority text,
  difficulty text,
  item_type text,
  estimated_minutes integer,
  actual_minutes integer,
  value numeric,
  currency text,
  planned_date date,
  deadline date,
  completed_at timestamptz,
  reference_url text,
  internal_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

comment on table public.work_clients is
  'Atlas cloud Work POC clients. Every row must belong to auth.uid() through user_id.';

comment on table public.work_items is
  'Atlas cloud Work POC items. These do not sync into Today, Dashboard, billing summaries, XP, or finances yet.';

comment on column public.work_clients.default_rate is
  'Optional local per-item default rate from Atlas Client.defaultRate.';

comment on column public.work_clients.fixed_monthly_amount is
  'Optional fixed monthly billing amount for fixed_monthly clients.';

comment on column public.work_items.client_id is
  'Optional cloud client reference. A trigger requires the referenced client to belong to the same user.';

alter table public.work_clients
  drop constraint if exists work_clients_client_type_check,
  drop constraint if exists work_clients_status_check,
  drop constraint if exists work_clients_difficulty_check,
  drop constraint if exists work_clients_billing_mode_check,
  drop constraint if exists work_clients_currency_check,
  drop constraint if exists work_clients_default_rate_check,
  drop constraint if exists work_clients_hourly_rate_check,
  drop constraint if exists work_clients_fixed_monthly_amount_check,
  drop constraint if exists work_clients_is_active_check;

alter table public.work_clients
  add constraint work_clients_client_type_check
    check (
      client_type is null
      or client_type in ('Agency', 'Direct Client', 'Freelance Platform', 'Personal Project', 'Other')
    ),
  add constraint work_clients_status_check
    check (status in ('active', 'paused', 'archived')),
  add constraint work_clients_difficulty_check
    check (
      difficulty is null
      or difficulty in ('easy', 'medium', 'hard', 'intense')
    ),
  add constraint work_clients_billing_mode_check
    check (billing_mode in ('per_item', 'fixed_monthly', 'hourly', 'non_billable')),
  add constraint work_clients_currency_check
    check (
      currency is null
      or currency in ('PYG', 'USD')
    ),
  add constraint work_clients_default_rate_check
    check (
      default_rate is null
      or default_rate >= 0
    ),
  add constraint work_clients_hourly_rate_check
    check (
      hourly_rate is null
      or hourly_rate >= 0
    ),
  add constraint work_clients_fixed_monthly_amount_check
    check (
      fixed_monthly_amount is null
      or fixed_monthly_amount >= 0
    ),
  add constraint work_clients_is_active_check
    check (is_active = (status = 'active'));

alter table public.work_items
  drop constraint if exists work_items_status_check,
  drop constraint if exists work_items_priority_check,
  drop constraint if exists work_items_difficulty_check,
  drop constraint if exists work_items_type_check,
  drop constraint if exists work_items_currency_check,
  drop constraint if exists work_items_estimated_minutes_check,
  drop constraint if exists work_items_actual_minutes_check,
  drop constraint if exists work_items_value_check;

alter table public.work_items
  add constraint work_items_status_check
    check (status in ('backlog', 'planned', 'in_progress', 'waiting_feedback', 'completed', 'archived')),
  add constraint work_items_priority_check
    check (
      priority is null
      or priority in ('low', 'medium', 'high', 'critical')
    ),
  add constraint work_items_difficulty_check
    check (
      difficulty is null
      or difficulty in ('easy', 'medium', 'hard', 'intense')
    ),
  add constraint work_items_type_check
    check (
      item_type is null
      or item_type in ('Video', 'Resize', 'Motion', 'B-roll', 'Design', 'Revision', 'Admin', 'Other')
    ),
  add constraint work_items_currency_check
    check (
      currency is null
      or currency in ('PYG', 'USD')
    ),
  add constraint work_items_estimated_minutes_check
    check (
      estimated_minutes is null
      or estimated_minutes >= 0
    ),
  add constraint work_items_actual_minutes_check
    check (
      actual_minutes is null
      or actual_minutes >= 0
    ),
  add constraint work_items_value_check
    check (
      value is null
      or value >= 0
    );

create index if not exists work_clients_user_id_idx on public.work_clients(user_id);
create index if not exists work_clients_updated_at_idx on public.work_clients(updated_at desc);
create index if not exists work_clients_status_idx on public.work_clients(status);
create index if not exists work_clients_deleted_at_idx on public.work_clients(deleted_at);

create index if not exists work_items_user_id_idx on public.work_items(user_id);
create index if not exists work_items_client_id_idx on public.work_items(client_id);
create index if not exists work_items_status_idx on public.work_items(status);
create index if not exists work_items_deadline_idx on public.work_items(deadline);
create index if not exists work_items_planned_date_idx on public.work_items(planned_date);
create index if not exists work_items_updated_at_idx on public.work_items(updated_at desc);
create index if not exists work_items_deleted_at_idx on public.work_items(deleted_at);

create or replace function public.set_work_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_work_clients_updated_at on public.work_clients;
create trigger set_work_clients_updated_at
before update on public.work_clients
for each row
execute function public.set_work_updated_at();

drop trigger if exists set_work_items_updated_at on public.work_items;
create trigger set_work_items_updated_at
before update on public.work_items
for each row
execute function public.set_work_updated_at();

create or replace function public.validate_work_item_client_owner()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.client_id is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.work_clients
    where id = new.client_id
      and user_id = new.user_id
      and deleted_at is null
  ) then
    raise exception 'client_id must reference an active cloud client owned by the same user';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_work_item_client_owner on public.work_items;
create trigger validate_work_item_client_owner
before insert or update of client_id, user_id on public.work_items
for each row
execute function public.validate_work_item_client_owner();

alter table public.work_clients enable row level security;
alter table public.work_items enable row level security;

drop policy if exists "Work clients select own rows" on public.work_clients;
create policy "Work clients select own rows"
on public.work_clients
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Work clients insert own rows" on public.work_clients;
create policy "Work clients insert own rows"
on public.work_clients
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Work clients update own rows" on public.work_clients;
create policy "Work clients update own rows"
on public.work_clients
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Work clients delete own rows" on public.work_clients;
create policy "Work clients delete own rows"
on public.work_clients
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Work items select own rows" on public.work_items;
create policy "Work items select own rows"
on public.work_items
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Work items insert own rows" on public.work_items;
create policy "Work items insert own rows"
on public.work_items
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Work items update own rows" on public.work_items;
create policy "Work items update own rows"
on public.work_items
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Work items delete own rows" on public.work_items;
create policy "Work items delete own rows"
on public.work_items
for delete
to authenticated
using (auth.uid() = user_id);
