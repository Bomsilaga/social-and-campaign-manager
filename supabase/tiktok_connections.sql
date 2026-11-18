-- TikTok Sandbox single-owner encrypted OAuth vault
-- Execute in your Supabase project's SQL Editor.
create table if not exists public.tiktok_connections (
  id text primary key,
  encrypted_credentials text not null,
  open_id text not null,
  scopes text not null default '',
  connected_at timestamptz not null default now()
);
alter table public.tiktok_connections enable row level security;
-- No public select/write RLS policies. Access only via authenticated
-- backend routes using a server-only Supabase service/secret key.
-- Store AES-256-GCM master key only as TIKTOK_TOKEN_ENCRYPTION_KEY in Vercel.
