-- RWA-DAO Creator Studio — store the real generated video on a creation.
-- When live generation is enabled, /api/rwa/generate creates a Higgsfield job and the client polls
-- /api/rwa/generate/status; on completion the result URL + provider request id are saved here so the
-- library plays the real video (not the canned preview). Additive, safe on existing rows.

alter table public.rwa_creations add column if not exists video_url text;
alter table public.rwa_creations add column if not exists request_id text;
