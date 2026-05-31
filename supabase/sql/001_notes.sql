-- Atlas Personal OS - Notes cloud proof-of-concept
-- Run manually in Supabase SQL editor only after reviewing SECURITY_AND_PRIVACY.md.
-- This script does not migrate localStorage data.

create extension if not exists pgcrypto;

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content text not null default '',
  area text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

comment on table public.notes is
  'Atlas cloud notes POC. Every row must belong to auth.uid() through user_id.';

comment on column public.notes.user_id is
  'Supabase Auth user owner. RLS policies require auth.uid() = user_id.';

create index if not exists notes_user_id_idx on public.notes(user_id);
create index if not exists notes_updated_at_idx on public.notes(updated_at desc);
create index if not exists notes_deleted_at_idx on public.notes(deleted_at);
create index if not exists notes_tags_idx on public.notes using gin(tags);

create or replace function public.set_notes_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_notes_updated_at on public.notes;

create trigger set_notes_updated_at
before update on public.notes
for each row
execute function public.set_notes_updated_at();

alter table public.notes enable row level security;

drop policy if exists "Notes select own rows" on public.notes;
create policy "Notes select own rows"
on public.notes
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Notes insert own rows" on public.notes;
create policy "Notes insert own rows"
on public.notes
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Notes update own rows" on public.notes;
create policy "Notes update own rows"
on public.notes
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Notes delete own rows" on public.notes;
create policy "Notes delete own rows"
on public.notes
for delete
to authenticated
using (auth.uid() = user_id);
