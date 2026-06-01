-- Atlas Personal OS - Gym cloud proof-of-concept
-- Run manually in Supabase SQL editor only after reviewing CLOUD_QA_CHECKLIST.md.
-- This script does not migrate localStorage data, dashboard stats, Calendar, XP, or streaks.

create extension if not exists pgcrypto;

create table if not exists public.gym_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_date date not null,
  workout_type text not null,
  title text,
  notes text not null default '',
  duration_minutes integer,
  energy_score integer,
  intensity_score integer,
  intensity text,
  exercises jsonb not null default '[]'::jsonb,
  is_rest_day boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

comment on table public.gym_logs is
  'Atlas cloud Gym POC logs. Every row must belong to auth.uid() through user_id.';

comment on column public.gym_logs.user_id is
  'Supabase Auth user owner. RLS policies require auth.uid() = user_id.';

comment on column public.gym_logs.workout_type is
  'Closed Atlas workout type: Push, Pull, Legs, Full Body, Cardio, Rest, or Other.';

comment on column public.gym_logs.energy_score is
  'Atlas local energy value from 1 to 10.';

comment on column public.gym_logs.intensity_score is
  'Atlas local intensity value from 1 to 10.';

comment on column public.gym_logs.intensity is
  'Optional descriptive intensity label for future use. Current Atlas uses intensity_score.';

comment on column public.gym_logs.exercises is
  'Reserved for future structured exercise detail. Current local Gym stores freeform notes only.';

alter table public.gym_logs
  drop constraint if exists gym_logs_workout_type_check,
  drop constraint if exists gym_logs_duration_minutes_check,
  drop constraint if exists gym_logs_energy_score_check,
  drop constraint if exists gym_logs_intensity_score_check,
  drop constraint if exists gym_logs_exercises_array_check,
  drop constraint if exists gym_logs_rest_day_check;

alter table public.gym_logs
  add constraint gym_logs_workout_type_check
    check (workout_type in ('Push', 'Pull', 'Legs', 'Full Body', 'Cardio', 'Rest', 'Other')),
  add constraint gym_logs_duration_minutes_check
    check (
      duration_minutes is null
      or duration_minutes >= 0
    ),
  add constraint gym_logs_energy_score_check
    check (
      energy_score is null
      or (energy_score >= 1 and energy_score <= 10)
    ),
  add constraint gym_logs_intensity_score_check
    check (
      intensity_score is null
      or (intensity_score >= 1 and intensity_score <= 10)
    ),
  add constraint gym_logs_exercises_array_check
    check (jsonb_typeof(exercises) = 'array'),
  add constraint gym_logs_rest_day_check
    check (is_rest_day = (workout_type = 'Rest'));

create index if not exists gym_logs_user_id_idx on public.gym_logs(user_id);
create index if not exists gym_logs_workout_date_idx on public.gym_logs(workout_date);
create index if not exists gym_logs_updated_at_idx on public.gym_logs(updated_at desc);
create index if not exists gym_logs_workout_type_idx on public.gym_logs(workout_type);
create index if not exists gym_logs_deleted_at_idx on public.gym_logs(deleted_at);

create or replace function public.set_gym_logs_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_gym_logs_updated_at on public.gym_logs;

create trigger set_gym_logs_updated_at
before update on public.gym_logs
for each row
execute function public.set_gym_logs_updated_at();

alter table public.gym_logs enable row level security;

drop policy if exists "Gym logs select own rows" on public.gym_logs;
create policy "Gym logs select own rows"
on public.gym_logs
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Gym logs insert own rows" on public.gym_logs;
create policy "Gym logs insert own rows"
on public.gym_logs
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Gym logs update own rows" on public.gym_logs;
create policy "Gym logs update own rows"
on public.gym_logs
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Gym logs delete own rows" on public.gym_logs;
create policy "Gym logs delete own rows"
on public.gym_logs
for delete
to authenticated
using (auth.uid() = user_id);
