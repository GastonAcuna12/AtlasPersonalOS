-- Migration: 008_notes_sync_hardening.sql
-- Safely adds sync-ready fields to public.notes and configures composite indexes.
-- This prepares the table for Phase 2 real cloud synchronization.

-- 1. Add new columns if they do not already exist
alter table public.notes add column if not exists local_id text;
alter table public.notes add column if not exists synced_at timestamptz;
alter table public.notes add column if not exists conflict_state text;

-- 2. Add performance index on user_id and local_id
create index if not exists notes_user_local_idx on public.notes (user_id, local_id);

-- 3. Add unique composite constraint index on user_id and local_id (excluding nulls) to prevent sync duplicates
create unique index if not exists notes_user_local_uniq_idx on public.notes (user_id, local_id) where local_id is not null;
