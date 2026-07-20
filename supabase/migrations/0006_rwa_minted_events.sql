-- On-chain Minted-event index — full-history conversion attribution without per-request RPC scans.
-- The cron (POST /api/rwa/agent/run) scans new blocks incrementally (service role writes);
-- /api/rwa/referral/conversions aggregates from here (instant, full history) and falls back to the
-- bounded live scan while the index is cold. Mint events are public on-chain data → public reads.

create table if not exists public.rwa_minted_events (
  tx_hash      text not null,
  log_index    integer not null,
  block_number bigint not null,
  minter       text not null,               -- Minted.user (checksummed address)
  quantity     numeric not null,            -- fractions minted
  total_paid   numeric not null,            -- native XDC wei
  total_usdt   numeric not null,            -- USD value wei (18dp)
  referral_id  text not null default '',    -- creator code carried by the mint ('' = unattributed)
  created_at   timestamptz not null default now(),
  primary key (tx_hash, log_index)
);
comment on table public.rwa_minted_events is 'Indexed RwaWatchNft Minted events (Apothem) for reward attribution.';
create index if not exists rwa_minted_events_referral_idx on public.rwa_minted_events (referral_id);
create index if not exists rwa_minted_events_block_idx on public.rwa_minted_events (block_number desc);

alter table public.rwa_minted_events enable row level security;
drop policy if exists "rwa_minted_events public read" on public.rwa_minted_events;
create policy "rwa_minted_events public read" on public.rwa_minted_events for select to anon, authenticated using (true);
grant select on public.rwa_minted_events to anon, authenticated;
-- writes: service role only (the indexer)

-- Indexer cursor (and future sync cursors) — service role only.
create table if not exists public.rwa_sync_state (
  key        text primary key,
  last_block bigint not null,
  updated_at timestamptz not null default now()
);
comment on table public.rwa_sync_state is 'Incremental sync cursors (e.g. minted-event indexer last scanned block).';
alter table public.rwa_sync_state enable row level security;
-- no policies/grants: service role bypasses RLS; clients never touch cursors
