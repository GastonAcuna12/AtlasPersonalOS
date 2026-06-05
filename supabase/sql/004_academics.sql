-- Atlas Personal OS - Academics cloud proof-of-concept
-- Run manually in Supabase SQL editor only after reviewing CLOUD_QA_CHECKLIST.md.
-- This script does not migrate localStorage data, Today tasks, Calendar data, or XP.

create extension if not exists pgcrypto;

create table if not exists public.academic_subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text,
  professor text,
  schedule text,
  notes text not null default '',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.academic_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references public.academic_subjects(id) on delete set null,
  title text not null,
  description text not null default '',
  status text not null default 'backlog',
  priority text,
  due_date date,
  planned_date date,
  task_type text,
  estimated_minutes integer,
  energy_required text,
  grade text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references public.academic_subjects(id) on delete set null,
  title text,
  notes text not null default '',
  date date not null,
  duration_minutes integer,
  focus_score integer,
  created_from text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

comment on table public.academic_subjects is
  'Atlas cloud academics POC subjects. Every row must belong to auth.uid() through user_id.';

comment on table public.academic_tasks is
  'Atlas cloud academics POC tasks. These do not sync into Today, Calendar, dashboard, or XP yet.';

comment on table public.study_sessions is
  'Atlas cloud academics POC study sessions. These do not update local study stats yet.';

comment on column public.academic_tasks.subject_id is
  'Optional cloud subject reference. A trigger requires the referenced subject to belong to the same user.';

comment on column public.study_sessions.subject_id is
  'Optional cloud subject reference. A trigger requires the referenced subject to belong to the same user.';

alter table public.academic_subjects
  drop constraint if exists academic_subjects_status_check;

alter table public.academic_subjects
  add constraint academic_subjects_status_check
    check (status in ('active', 'archived'));

alter table public.academic_tasks
  drop constraint if exists academic_tasks_status_check,
  drop constraint if exists academic_tasks_priority_check,
  drop constraint if exists academic_tasks_type_check,
  drop constraint if exists academic_tasks_energy_check,
  drop constraint if exists academic_tasks_estimated_minutes_check;

alter table public.academic_tasks
  add constraint academic_tasks_status_check
    check (status in ('backlog', 'today', 'in_progress', 'completed', 'skipped')),
  add constraint academic_tasks_priority_check
    check (
      priority is null
      or priority in ('low', 'medium', 'high', 'critical')
    ),
  add constraint academic_tasks_type_check
    check (
      task_type is null
      or task_type in ('Assignment', 'Exam', 'Reading', 'Project', 'Presentation', 'Practice', 'Other')
    ),
  add constraint academic_tasks_energy_check
    check (
      energy_required is null
      or energy_required in ('low', 'medium', 'high')
    ),
  add constraint academic_tasks_estimated_minutes_check
    check (
      estimated_minutes is null
      or estimated_minutes >= 0
    );

alter table public.study_sessions
  drop constraint if exists study_sessions_duration_minutes_check,
  drop constraint if exists study_sessions_focus_score_check;

alter table public.study_sessions
  add constraint study_sessions_duration_minutes_check
    check (
      duration_minutes is null
      or duration_minutes >= 0
    ),
  add constraint study_sessions_focus_score_check
    check (
      focus_score is null
      or (focus_score >= 1 and focus_score <= 10)
    );

create index if not exists academic_subjects_user_id_idx on public.academic_subjects(user_id);
create index if not exists academic_subjects_updated_at_idx on public.academic_subjects(updated_at desc);
create index if not exists academic_subjects_deleted_at_idx on public.academic_subjects(deleted_at);

create index if not exists academic_tasks_user_id_idx on public.academic_tasks(user_id);
create index if not exists academic_tasks_updated_at_idx on public.academic_tasks(updated_at desc);
create index if not exists academic_tasks_subject_id_idx on public.academic_tasks(subject_id);
create index if not exists academic_tasks_due_date_idx on public.academic_tasks(due_date);
create index if not exists academic_tasks_status_idx on public.academic_tasks(status);
create index if not exists academic_tasks_deleted_at_idx on public.academic_tasks(deleted_at);

create index if not exists study_sessions_user_id_idx on public.study_sessions(user_id);
create index if not exists study_sessions_updated_at_idx on public.study_sessions(updated_at desc);
create index if not exists study_sessions_subject_id_idx on public.study_sessions(subject_id);
create index if not exists study_sessions_date_idx on public.study_sessions(date);
create index if not exists study_sessions_deleted_at_idx on public.study_sessions(deleted_at);

create or replace function public.set_academics_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_academic_subjects_updated_at on public.academic_subjects;
create trigger set_academic_subjects_updated_at
before update on public.academic_subjects
for each row
execute function public.set_academics_updated_at();

drop trigger if exists set_academic_tasks_updated_at on public.academic_tasks;
create trigger set_academic_tasks_updated_at
before update on public.academic_tasks
for each row
execute function public.set_academics_updated_at();

drop trigger if exists set_study_sessions_updated_at on public.study_sessions;
create trigger set_study_sessions_updated_at
before update on public.study_sessions
for each row
execute function public.set_academics_updated_at();

create or replace function public.validate_academic_subject_owner()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.subject_id is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.academic_subjects
    where id = new.subject_id
      and user_id = new.user_id
      and deleted_at is null
  ) then
    raise exception 'subject_id must reference an active cloud subject owned by the same user';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_academic_task_subject_owner on public.academic_tasks;
create trigger validate_academic_task_subject_owner
before insert or update of subject_id, user_id on public.academic_tasks
for each row
execute function public.validate_academic_subject_owner();

drop trigger if exists validate_study_session_subject_owner on public.study_sessions;
create trigger validate_study_session_subject_owner
before insert or update of subject_id, user_id on public.study_sessions
for each row
execute function public.validate_academic_subject_owner();

alter table public.academic_subjects enable row level security;
alter table public.academic_tasks enable row level security;
alter table public.study_sessions enable row level security;

drop policy if exists "Academic subjects select own rows" on public.academic_subjects;
create policy "Academic subjects select own rows"
on public.academic_subjects
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Academic subjects insert own rows" on public.academic_subjects;
create policy "Academic subjects insert own rows"
on public.academic_subjects
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Academic subjects update own rows" on public.academic_subjects;
create policy "Academic subjects update own rows"
on public.academic_subjects
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Academic subjects delete own rows" on public.academic_subjects;
create policy "Academic subjects delete own rows"
on public.academic_subjects
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Academic tasks select own rows" on public.academic_tasks;
create policy "Academic tasks select own rows"
on public.academic_tasks
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Academic tasks insert own rows" on public.academic_tasks;
create policy "Academic tasks insert own rows"
on public.academic_tasks
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Academic tasks update own rows" on public.academic_tasks;
create policy "Academic tasks update own rows"
on public.academic_tasks
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Academic tasks delete own rows" on public.academic_tasks;
create policy "Academic tasks delete own rows"
on public.academic_tasks
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Study sessions select own rows" on public.study_sessions;
create policy "Study sessions select own rows"
on public.study_sessions
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Study sessions insert own rows" on public.study_sessions;
create policy "Study sessions insert own rows"
on public.study_sessions
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Study sessions update own rows" on public.study_sessions;
create policy "Study sessions update own rows"
on public.study_sessions
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Study sessions delete own rows" on public.study_sessions;
create policy "Study sessions delete own rows"
on public.study_sessions
for delete
to authenticated
using (auth.uid() = user_id);
