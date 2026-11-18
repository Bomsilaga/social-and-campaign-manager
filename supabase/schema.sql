-- Run in Supabase SQL Editor for the first single-owner prototype.
-- This table stores JSON manifests ONLY (not uploaded media file bytes).
create extension if not exists pgcrypto;
create table if not exists public.video_projects (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 1 and 120),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists video_projects_updated_at_idx on public.video_projects(updated_at desc);
alter table public.video_projects enable row level security;
-- No public/anon RLS policies. The server-side secret key is used only by protected API routes.
-- Before multi-user release: replace the shared-token architecture with Supabase Auth,
-- tenant_id and strict tenant RLS, audit logs and media storage permissions.
