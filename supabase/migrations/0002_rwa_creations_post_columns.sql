-- RWA-DAO Creator Studio — social submission columns on rwa_creations.
-- Additive only; existing RLS/policies unchanged. Applied to the remote project via MCP.
-- Lets a creator record where they posted their generated video (platform + URL).
-- Automated performance tracking (views/likes polling) is a later phase (OAuth per platform).

alter table public.rwa_creations add column if not exists post_platform text;
alter table public.rwa_creations add column if not exists post_url text;
alter table public.rwa_creations add column if not exists post_submitted_at timestamptz;
