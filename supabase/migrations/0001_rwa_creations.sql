-- RWA-DAO Creator Studio — namespace `rwa_*`.
--
-- This project (Supabase "Exhelia", ref dmseqppomoulbuhkbizx) is shared across several
-- products via table prefixes: core "kabal" tables, exhelia_*, siam_*. RWA-DAO data lives
-- under the `rwa_*` namespace so it stays isolated and tidy. This migration is ADDITIVE —
-- it does not touch any existing table or data.
--
-- Secure by default: RLS on, owner-scoped, authenticated-only (no anon access on this
-- production project). Cloud sync of the "My videos" library activates once wallet/auth is
-- wired; until then the frontend uses localStorage.
--
-- Applied to the remote project on 2026-06-29 via Supabase MCP (apply_migration).

create table if not exists public.rwa_creations (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  owner        uuid references auth.users(id) on delete cascade,
  wallet_address text,
  watch_id     text not null,
  watch_title  text not null,
  watch_image  text,
  creator_id   text not null,
  creator_name text not null,
  style_id     text not null,
  style_title  text not null,
  scene_title  text,
  status       text not null default 'demo_preview',
  mode         text not null default 'mock_only'
);

comment on table public.rwa_creations is 'RWA-DAO Creator Studio: saved video creations (My videos library). Owner-scoped.';

alter table public.rwa_creations enable row level security;

drop policy if exists "rwa_creations owner select" on public.rwa_creations;
create policy "rwa_creations owner select" on public.rwa_creations
  for select to authenticated using (owner = auth.uid());

drop policy if exists "rwa_creations owner insert" on public.rwa_creations;
create policy "rwa_creations owner insert" on public.rwa_creations
  for insert to authenticated with check (owner = auth.uid());

drop policy if exists "rwa_creations owner delete" on public.rwa_creations;
create policy "rwa_creations owner delete" on public.rwa_creations
  for delete to authenticated using (owner = auth.uid());

grant select, insert, delete on public.rwa_creations to authenticated;

create index if not exists rwa_creations_owner_created_idx
  on public.rwa_creations (owner, created_at desc);
