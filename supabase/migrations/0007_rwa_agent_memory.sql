-- MemoryAgent store — per-creator learned preferences (the Qwen Cloud hackathon differentiator).
-- The agent reinforces these weights from the on-chain mints each creator's content drove
-- (rwa_minted_events), and biases its next batch toward what works. Owner-scoped; the owner reads
-- their own memory, the scheduler (service role) updates it.

create table if not exists public.rwa_agent_memory (
  owner       uuid primary key references auth.users(id) on delete cascade,
  weights     jsonb not null default '{}'::jsonb,   -- feature key ("platform:X") → learned weight
  posts       integer not null default 0,           -- reinforced outcomes (experience accumulated)
  updated_at  timestamptz not null default now()
);
comment on table public.rwa_agent_memory is 'Per-creator MemoryAgent weights, reinforced by on-chain mint outcomes.';
alter table public.rwa_agent_memory enable row level security;
drop policy if exists "rwa_agent_memory owner select" on public.rwa_agent_memory;
create policy "rwa_agent_memory owner select" on public.rwa_agent_memory for select to authenticated using (owner = auth.uid());
grant select on public.rwa_agent_memory to authenticated;
-- inserts/updates: service role only (the scheduler reinforces from verified on-chain outcomes)
