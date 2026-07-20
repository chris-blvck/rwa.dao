# RWA-DAO — System Specification

A complete spec of what's built. **Status legend:** ✅ live & tested · ⚙️ built + gated (one env
flag to activate) · 🔑 built, needs the DashScope key for live validation · 🎬 demo/mock default
(safe, zero cost).

---

## 1. Overview

A Web3 luxury-watch **creator platform** on XDC. Creators generate cinematic watch videos, post them
with a referral link, and earn from the **on-chain mints they drive** — read back from the chain, so
nothing is fakeable. An autonomous **MemoryAgent** drafts on-brand content daily, learns what
converts from real revenue, and reasons on **Qwen (Alibaba Cloud)**.

- **Stack:** Next.js 14 (App Router, TypeScript), Tailwind, viem, Supabase (Postgres), Vitest.
- **Hosting:** Netlify today; turnkey **Alibaba Cloud** container kit (Function Compute / ECS).
- **Chain:** XDC Apothem (chain 51) — RwaWatchNft `0xb76F7df88695447b180f9CD1c7c32A9532752a11`.
- **Quality:** 226 unit tests, typecheck + lint + build green in CI; MCP server has a stdio smoke test.

---

## 2. The Managed Agent system (content creation + scheduling)

The core. An autonomous per-creator agent that **drafts content, learns from on-chain outcomes, and
reasons on Qwen** — human-in-the-loop publishing (the agent prepares, the creator posts in one tap;
never an auto-posting bot, so it's ToS-safe).

### 2.1 Content generation — `lib/rwa/autopilot.ts` ✅
- `generateBatch(count, offset, platforms)` drafts ready-to-post **content ideas** from the catalog
  (watches, personas, presets/styles, scenes, team colourways) via a deterministic rotation.
- Each **`ContentIdea`** = `{ watch, preset, persona, background, team, platform, caption, rewardPts }`.
- Rewards are a stable per-idea hash (200–499 pts) so a batch is reproducible across renders.

### 2.2 MemoryAgent core — `lib/rwa/agent_memory.ts` ✅
A lightweight **contextual bandit**. Each content **feature** carries a learned weight; real revenue
nudges the weights of the features that produced it; the agent biases the next batch toward what
works while still exploring.
- **Features per idea:** `platform:<X>`, `style:<presetId>`, `team:<teamId>`, `watch:<watchId>`.
- **Constants:** default weight 1, decay 0.98 (stale prefs fade), learn-rate 0.15, exploration floor 0.12.
- `scoreIdea` = average learned weight of an idea's features.
- `reinforce(mem, idea, rewardUsd)` — gain = `0.15 · min(4, log10(1+usd))` (**diminishing returns**);
  decays all weights a touch, pulls up the idea's features, increments `posts` (experience).
- `reinforceFromPosts(mem, postedIdeas, rewardUsd)` — splits the on-chain USD across the posted ideas
  and reinforces each. **Guard:** $0 window → memory unchanged (learn only from a real revenue signal).
- `rankByMemory(mem, candidates, seed)` — best-first with **deterministic** seeded exploration jitter
  (no `Math.random`, reproducible).
- `memorySummary` / `memoryHint` — a human summary + a short phrase fed into the Qwen prompt.
- **Persistence:** `rwa_agent_memory` (Supabase); `updated_at` doubles as the last-reinforced
  high-water-mark.

### 2.3 Scheduler — `lib/rwa/agent_scheduler.ts` ✅
`runScheduledAgents(db, now, { memory?, writeCaption? })` — one autonomous tick:
1. Iterate **enabled agents** (`rwa_agents`).
2. Per creator, top the queue up to their **`cadencePerDay`** for the current UTC day (idempotent:
   counts existing drafts, only fills the gap; a stable per-user/per-day seed continues the rotation).
3. **MemoryAgent path** (when a memory provider is wired): reinforce the creator's memory from the
   real on-chain USD their **posted** content drove — **windowed from the last-reinforced
   high-water-mark** so each outcome is credited **once** (not re-credited every hour) — then rank a
   3× candidate pool by memory and take the best N.
4. **Reasoning path** (when an LLM provider is active): rewrite each draft's caption via the LLM,
   informed by the memory hint (§2.5). Any error/absence keeps the deterministic template caption.
5. Enqueue the drafts into `rwa_agent_drafts`.
- Returns `{ agents, enqueued, skipped, reinforced }`. Toggle memory off with `RWA_MEMORY_AGENT=0`.

### 2.4 Trigger (cron) — `netlify/functions/agent-cron.mts` → `POST /api/rwa/agent/run` ✅
- **Hourly** scheduled function calls the run endpoint (`Authorization: Bearer $CRON_SECRET` — header
  only, never a query param). On Alibaba Cloud this is an EventBridge/FC **timer trigger** (same URL).
- Each tick runs **two isolated jobs**: (a) the scheduler (drafts), (b) the Minted-event indexer
  (§4). One failing never blocks the other.
- No service key → a stateless **demo tick** (computes, persists nothing).

### 2.5 Reasoning on Qwen — `lib/rwa/qwen.ts` + `lib/rwa/llm.ts` 🔑
- `qwen.ts` — DashScope adapter (OpenAI-compatible `/chat/completions`, Bearer key, default model
  `qwen-max`, base + model env-overridable). Returns `null` on any error → caller falls back.
- `llm.ts` — `captionProvider()` picks **Qwen** (a DashScope key present) or Anthropic; `llmCaption`
  builds an on-brand, **non-financial** caption prompt **weaving in the memory hint** ("this creator's
  audience responds best to …"). The scheduler wires this as its `writeCaption`.
- **The closed loop:** memory (reinforced by on-chain mints) → Qwen writes the batch → creator posts →
  new on-chain mints → reinforce. Real revenue is the reward signal.

### 2.6 Human-in-the-loop posting — dashboard AI-agent tab ✅
- The creator reviews the queued drafts, **posts in one tap**, and the caption + their **mint link**
  are copied so the post drives attributed mints. Posting a draft marks it `posted` server-side and
  credits off-chain reward points.

---

## 3. Two-stage generation pipeline

Compose the exact watch into the scene as a **still (stage 1)**, preview/regenerate, then **animate
that frame (stage 2)** — image-to-video, so the real timepiece stays on-model.

### 3.1 Stage 1 — compose — `lib/rwa/compose.ts`, `app/api/rwa/compose[/status]`
- Pure prompt builder (shot framing per style, exact-watch fidelity, format-aware composition).
- Providers: 🎬 reference **plate** (default, instant, no cost) · ⚙️ **Higgsfield** image · 🔑
  **DashScope Wanx** (`lib/rwa/qwen_image.ts`, Alibaba-native) when `RWA_VIDEO_PROVIDER=qwen`.

### 3.2 Stage 2 — animate — `app/api/rwa/generate[/status]`
- Providers: 🎬 **mock** (prepared plan, 0 credits, default) · ⚙️ **Higgsfield** image-to-video
  (multi-take, distinct seeds) · 🔑 **DashScope Wan / HappyHorse** (`lib/rwa/qwen_video.ts`,
  Alibaba-native async task create + poll).
- **Prompt engine v2.1** (`lib/rwa/prompt_templates.ts`): per-style shot grammar, duration-aware
  beats, format-aware composition, the hook as the opening beat, the watch's material prompt,
  anti-artifact constraints.
- **Auto model routing** (`lib/rwa/pricing.ts`): picks the model from concept type + output settings.
- **Multi-takes:** 1–3 seeded variants; the creator keeps the best.
- **Provider preflight** (`/api/rwa/agent/preflight`) confirms the Qwen path + resolved video model
  ids without running a generation (config-only by default; `?probe=1` = one ~5-token live check).

---

## 4. On-chain layer

- **Reads** — `lib/rwa/rwa_watch_nft.ts`: `conversionsForReferral(code)` scans the RwaWatchNft
  `Minted` events for a referral code — **chunked** `eth_getLogs` (≤1000-block windows, anchored at
  the deploy block, 60s cache) so it never sweeps from block 0.
- **Indexer** — `lib/rwa/mint_indexer.ts`: `indexNewMints` incrementally scans new blocks into
  `rwa_minted_events` with a persisted cursor (`rwa_sync_state`); runs every cron tick.
- **Points** — off-chain by design: `pointsFromConversions` = 10% of USD volume; convert to **RWAX
  at withdrawal** (RWA-DAO's audited flow). The chain is the source of truth for conversions.

---

## 5. Frontend surfaces (Next.js 14)

- **`/`** home · **`/studio`** two-stage generation · **`/mint`** mirrors Peter's Mint tab (vaulted
  hero, on-chain valuation, deep-links) · **`/leaderboard`** · **`/dashboard`**.
- **Dashboard** — four sub-tabs: **Account** (points, fractions, on-chain conversions), **My videos**
  (library; download + copy-caption-with-mint-link on each card), **AI agent** (the **Agent memory**
  card + the Managed Agent panel: cadence, platforms, drafts, one-tap post), **Ambassador** (refer &
  earn 10% + 1%).
- **PWA & SEO:** web manifest + on-brand icon set (192/512/maskable) + apple-touch-icon; robots +
  sitemap; branded **per-page Open Graph / Twitter cards** (`next/og`); theme-color.

---

## 6. API endpoints (`app/api/rwa/*`)

| Route | Purpose |
|---|---|
| `POST /agent/run` | scheduler tick + Minted indexer (CRON_SECRET) |
| `GET/POST /agent/preflight` | provider readiness (config-only; `?probe=1` live check) |
| `POST /agent/caption` | LLM caption for one idea (provider-aware) |
| `POST /agent/tick` | stateless demo tick |
| `POST /compose` · `GET /compose/status` | stage-1 still (mock / Higgsfield / Qwen) |
| `POST /generate` · `GET /generate/status` | stage-2 video (mock / Higgsfield / Qwen) |
| `GET /mint/state` · `GET /mint/holdings` | live mint price/supply + a wallet's fractions |
| `GET /referral/conversions` | on-chain conversions for a referral code |
| `POST /rewards/voucher` | reward voucher (guarded) |
| `GET /xdc-price` | XDC/USD |

---

## 7. Data model (Supabase)

| Table | Holds |
|---|---|
| `rwa_agents` | per-creator agent config (cadence, platforms, enabled) |
| `rwa_agent_drafts` | queued / posted content ideas |
| `rwa_agent_memory` | learned feature weights + posts + last-reinforced mark |
| `rwa_minted_events` | indexed on-chain Minted events (unique `tx_hash,log_index`) |
| `rwa_sync_state` | indexer cursor (last block) |
| `rwa_ambassadors` | creator ↔ referral-code mapping |
| `rwa_creations` | the "My videos" library (cloud sync; else localStorage) |

Server-side writes go through the **service-role** admin client (`lib/rwa/supabase_admin.ts`),
config-gated (no key → demo mode, nothing persisted). Never imported by client code.

---

## 8. MCP server — `mcp/` ✅

A Model Context Protocol server (stdio) so any MCP client (Claude Desktop) can drive the agent.
Isolated package (own deps/lockfile — no impact on the app). Five tools, each a thin wrapper over the
**same tested `frontend/lib/rwa` logic**:

| Tool | Backed by |
|---|---|
| `rank_content_batch` | `generateBatch` + `rankByMemory` |
| `reinforce_memory` | `reinforceFromPosts` |
| `memory_summary` | `memorySummary` / `memoryHint` |
| `draft_caption_prompt` | `buildCaptionPrompt` (memory-informed) |
| `read_conversions` | `conversionsForReferral` (live XDC RPC) |

Verified with `npm run smoke` (spawns the server + a real MCP client over stdio).

---

## 9. Deployment

- **Now:** Netlify (Next runtime + the hourly scheduled function).
- **Alibaba Cloud kit:** `frontend/Dockerfile` (Next standalone, non-root, build-verified) +
  `docs/DEPLOY_ALIBABA.md` — Function Compute (custom container) or ECS, ACR push, the **timer-trigger
  cron** replacing Netlify's, and the full env matrix. Opt-in standalone (`BUILD_STANDALONE=1`) so the
  Netlify build is untouched.

---

## 10. Configuration (key env)

| Var | Enables |
|---|---|
| `DASHSCOPE_API_KEY` / `QWEN_API_KEY` | Qwen reasoning + captions + Alibaba video/image |
| `RWA_LLM_PROVIDER=qwen` | force captions through Qwen |
| `RWA_VIDEO_PROVIDER=qwen` + `RWA_ALLOW_LIVE_GENERATION=1` | live DashScope generation |
| `RWA_ALLOW_LIVE_COMPOSE=1` | live stage-1 compose |
| `RWA_MEMORY_AGENT=0` | disable the MemoryAgent (plain rotation) |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | agent queue, memory, indexer |
| `CRON_SECRET` | guards `/agent/run` + `/agent/preflight` |
| `NEXT_PUBLIC_SITE_URL` | canonical host (metadata / robots / sitemap / OG) |
| `HIGGSFIELD_API_KEY` | Higgsfield generation (alternative provider) |

---

## 11. Safety posture

- **No credits without intent** — generation is mock/plate by default; live is a flagged flip behind
  a provider key.
- **Cron authenticated** — Bearer `CRON_SECRET`, header only.
- **On-chain reads bounded** — chunked, cursor-tracked, deploy-block-anchored.
- **Points off-chain**, human-in-the-loop posting (no auto-posting bot).
- **Provider endpoints env-overridable + gated**; DashScope video/image model ids are flagged
  best-effort until validated live with the key.
