-- Meta Facebook Pages vault. Run separately in Supabase SQL Editor.
-- No anon/authenticated access policies; server service secret only.
create table if not exists public.meta_connections (
  id text primary key,
  encrypted_user_token text not null,
  connected_at timestamptz not null default now()
);
alter table public.meta_connections enable row level security;
-- Server-side AES-256-GCM key is stored only in Vercel as META_TOKEN_ENCRYPTION_KEY.
-- No plaintext user/Page tokens in the browser or repository.
