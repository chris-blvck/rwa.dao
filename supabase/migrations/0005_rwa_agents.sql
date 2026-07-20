-- Managed Agent persistence — active agents + their draft queue.
-- The scheduler (POST /api/rwa/agent/run) iterates enabled agents and enqueues drafts per user;
-- the user's queue reads from rwa_agent_drafts. Owner-scoped RLS; drafts are inserted by the
-- service role (the scheduler), read/updated by the owner. Additive, rwa_* namespace.

create table if not exists public.rwa_agents (
  owner       uuid primary key references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  enabled     boolean not null default false,
  config      jsonb not null default '{}'::jsonb   -- AgentConfig (cadence, autoPublish, platforms)
);
comment on table public.rwa_agents is 'Managed Agent config per user (hosted, no VPS).';
alter table public.rwa_agents enable row level security;
drop policy if exists "rwa_agents owner select" on public.rwa_agents;
create policy "rwa_agents owner select" on public.rwa_agents for select to authenticated using (owner = auth.uid());
drop policy if exists "rwa_agents owner insert" on public.rwa_agents;
create policy "rwa_agents owner insert" on public.rwa_agents for insert to authenticated with check (owner = auth.uid());
drop policy if exists "rwa_agents owner update" on public.rwa_agents;
create policy "rwa_agents owner update" on public.rwa_agents for update to authenticated using (owner = auth.uid());
grant select, insert, update on public.rwa_agents to authenticated;

create table if not exists public.rwa_agent_drafts (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  owner       uuid references auth.users(id) on delete cascade,
  idea        jsonb not null,                        -- ContentIdea produced by the agent
  status      text not null default 'queued'         -- queued | posted | dismissed
);
comment on table public.rwa_agent_drafts is 'Agent-produced drafts queued for the user to post.';
alter table public.rwa_agent_drafts enable row level security;
drop policy if exists "rwa_agent_drafts owner select" on public.rwa_agent_drafts;
create policy "rwa_agent_drafts owner select" on public.rwa_agent_drafts for select to authenticated using (owner = auth.uid());
drop policy if exists "rwa_agent_drafts owner update" on public.rwa_agent_drafts;
create policy "rwa_agent_drafts owner update" on public.rwa_agent_drafts for update to authenticated using (owner = auth.uid());
-- inserts: service role only (the scheduler enqueues drafts)
grant select, update on public.rwa_agent_drafts to authenticated;
create index if not exists rwa_agent_drafts_owner_idx on public.rwa_agent_drafts (owner, created_at desc);
