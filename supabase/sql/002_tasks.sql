-- Atlas Personal OS - Tasks cloud proof-of-concept
-- Run manually in Supabase SQL editor only after reviewing CLOUD_QA_CHECKLIST.md.
-- This script does not migrate localStorage data.

create extension if not exists pgcrypto;

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  notes text not null default '',
  area text,
  task_type text,
  priority text,
  status text not null default 'backlog',
  planned_date date,
  due_date date,
  estimated_minutes integer,
  energy_required text,
  completed_at timestamptz,
  skipped_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

comment on table public.tasks is
  'Atlas cloud tasks POC. Every row must belong to auth.uid() through user_id.';

comment on column public.tasks.user_id is
  'Supabase Auth user owner. RLS policies require auth.uid() = user_id.';

comment on column public.tasks.status is
  'Atlas task status text: backlog, today, in_progress, completed, or skipped.';

create index if not exists tasks_user_id_idx on public.tasks(user_id);
create index if not exists tasks_updated_at_idx on public.tasks(updated_at desc);
create index if not exists tasks_planned_date_idx on public.tasks(planned_date);
create index if not exists tasks_due_date_idx on public.tasks(due_date);
create index if not exists tasks_status_idx on public.tasks(status);
create index if not exists tasks_deleted_at_idx on public.tasks(deleted_at);

create or replace function public.set_tasks_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_tasks_updated_at on public.tasks;

create trigger set_tasks_updated_at
before update on public.tasks
for each row
execute function public.set_tasks_updated_at();

alter table public.tasks enable row level security;

drop policy if exists "Tasks select own rows" on public.tasks;
create policy "Tasks select own rows"
on public.tasks
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Tasks insert own rows" on public.tasks;
create policy "Tasks insert own rows"
on public.tasks
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Tasks update own rows" on public.tasks;
create policy "Tasks update own rows"
on public.tasks
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Tasks delete own rows" on public.tasks;
create policy "Tasks delete own rows"
on public.tasks
for delete
to authenticated
using (auth.uid() = user_id);
