-- RWA-DAO — growth & monetization backend (ambassadors, referrals, points, mints, purchases,
-- commissions). Additive, `rwa_*` namespace, RLS-on. Financial tables are READ-ONLY to clients
-- (owner-scoped select); all writes happen server-side with the service role so balances and
-- commissions can't be tampered with from the browser. Apply via Supabase MCP like 0001/0002.

-- ── Ambassadors ────────────────────────────────────────────────────────────────────────────
create table if not exists public.rwa_ambassadors (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  owner           uuid references auth.users(id) on delete cascade,
  wallet_address  text,
  ref_code        text not null unique,
  referred_by_code text,                    -- the upline ambassador's ref_code (nullable)
  unique (owner)
);
comment on table public.rwa_ambassadors is 'RWA-DAO ambassadors: unique referral code + upline link.';
alter table public.rwa_ambassadors enable row level security;
drop policy if exists "rwa_ambassadors owner select" on public.rwa_ambassadors;
create policy "rwa_ambassadors owner select" on public.rwa_ambassadors
  for select to authenticated using (owner = auth.uid());
drop policy if exists "rwa_ambassadors owner upsert" on public.rwa_ambassadors;
create policy "rwa_ambassadors owner upsert" on public.rwa_ambassadors
  for insert to authenticated with check (owner = auth.uid());
grant select, insert on public.rwa_ambassadors to authenticated;
create index if not exists rwa_ambassadors_refcode_idx on public.rwa_ambassadors (ref_code);

-- ── Purchases (attributed to an ambassador via ref_code) ───────────────────────────────────
create table if not exists public.rwa_purchases (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  buyer_owner     uuid references auth.users(id) on delete set null,
  buyer_wallet    text,
  amount_usd      numeric(12,2) not null default 0,
  ambassador_code text                      -- ref_code credited for this purchase
);
comment on table public.rwa_purchases is 'Purchases, attributed to an ambassador ref_code for commissions.';
alter table public.rwa_purchases enable row level security;
drop policy if exists "rwa_purchases buyer select" on public.rwa_purchases;
create policy "rwa_purchases buyer select" on public.rwa_purchases
  for select to authenticated using (buyer_owner = auth.uid());
-- inserts: service role only (server attributes + records purchases)
create index if not exists rwa_purchases_amb_idx on public.rwa_purchases (ambassador_code, created_at desc);

-- ── Commissions (10% L1 / 1% L2), computed server-side ─────────────────────────────────────
create table if not exists public.rwa_commissions (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  ambassador_owner uuid references auth.users(id) on delete cascade,
  purchase_id      uuid references public.rwa_purchases(id) on delete cascade,
  level            smallint not null check (level in (1,2)),
  amount_usd       numeric(12,2) not null default 0,
  paid             boolean not null default false,
  tx_hash          text
);
comment on table public.rwa_commissions is 'Referral commissions (L1 10% / L2 1%); on-chain payout tracked via tx_hash.';
alter table public.rwa_commissions enable row level security;
drop policy if exists "rwa_commissions owner select" on public.rwa_commissions;
create policy "rwa_commissions owner select" on public.rwa_commissions
  for select to authenticated using (ambassador_owner = auth.uid());
-- inserts/updates: service role only
create index if not exists rwa_commissions_owner_idx on public.rwa_commissions (ambassador_owner, created_at desc);

-- ── Points ledger (1 cent = 1 point) ───────────────────────────────────────────────────────
create table if not exists public.rwa_points_ledger (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  owner       uuid references auth.users(id) on delete cascade,
  delta       integer not null,             -- + earned, - redeemed
  reason      text not null,                -- 'mint' | 'referral' | 'redeem' | ...
  ref_id      text                          -- related entity (mint id, purchase id, ...)
);
comment on table public.rwa_points_ledger is 'Append-only points ledger; balance = sum(delta) per owner.';
alter table public.rwa_points_ledger enable row level security;
drop policy if exists "rwa_points owner select" on public.rwa_points_ledger;
create policy "rwa_points owner select" on public.rwa_points_ledger
  for select to authenticated using (owner = auth.uid());
-- inserts: service role only (no client-side point minting)
create index if not exists rwa_points_owner_idx on public.rwa_points_ledger (owner, created_at desc);

-- ── Mints ──────────────────────────────────────────────────────────────────────────────────
create table if not exists public.rwa_mints (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  owner          uuid references auth.users(id) on delete set null,
  wallet_address text,
  token_id       bigint,
  price_usd      numeric(12,2) not null default 0,
  points_awarded integer not null default 0,
  tx_hash        text,
  status         text not null default 'pending'   -- pending | confirmed | failed
);
comment on table public.rwa_mints is 'NFT mints (audited OZ/thirdweb contract); price/points/tx recorded.';
alter table public.rwa_mints enable row level security;
drop policy if exists "rwa_mints owner select" on public.rwa_mints;
create policy "rwa_mints owner select" on public.rwa_mints
  for select to authenticated using (owner = auth.uid());
-- inserts/updates: service role only (server confirms on-chain mints)
create index if not exists rwa_mints_owner_idx on public.rwa_mints (owner, created_at desc);
