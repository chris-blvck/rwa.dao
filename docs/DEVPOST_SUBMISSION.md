# Devpost submission package — ready to paste

Everything the Devpost form asks for, pre-written. Paste each block into the matching field.
Placeholders to fill at submit time: `<LIVE_URL>` (Alibaba/Netlify deploy), `<VIDEO_URL>` (YouTube),
`<REPO_URL>` (the public repo). Deadline: **July 20, 2026, 2:00 PM PDT.**

---

## Project name
**RWA-DAO MemoryAgent** — a marketing agent that learns from on-chain revenue

## Elevator pitch (tagline, ~200 chars)
> An autonomous marketing agent for real-world-asset creators: its memory is reinforced by the
> on-chain mints its posts drive, and its reasoning runs on Qwen. It gets measurably better with
> every on-chain outcome.

## Track
**MemoryAgent**

## Inspiration
Creator marketing tools optimise vanity metrics — likes, views — signals that are cheap to fake and
weakly tied to value. RWA-DAO sells fractions of real, vaulted luxury watches on XDC, which gives us
something rare: a **ground-truth reward signal**. Every mint driven through a creator's referral link is an on-chain
`Minted` event with a USD amount and their referral code. We asked: what if an agent's memory was
reinforced by *that* — real revenue, un-fakeable — instead of engagement?

## What it does
Each creator gets a hosted agent. Every hour it:
1. **Loads the creator's memory** — learned weights per content feature (platform, style, team
   colourway, watch), persisted across sessions.
2. **Reinforces it from the chain** — the USD their posted content drove (indexed `Minted` events on
   the RwaWatchNft contract), credited once per outcome via a high-water-mark window.
3. **Ranks a candidate batch** with a contextual bandit (learned exploitation + deterministic
   exploration).
4. **Writes the captions on Qwen** — the prompt carries a memory hint ("this creator's audience
   responds best to …"), so the copy leans into what actually converts.
5. **Queues the drafts**; the creator posts in one tap with their referral link (human-in-the-loop —
   never an auto-posting bot). New mints close the loop.

Video generation is two-stage and Alibaba-native: compose the exact watch into the scene on **Wanx**
(still), then animate on **HappyHorse 1.0** (Alibaba's flagship video model — native 1080p + audio) or
**Wan** via DashScope — so the real timepiece stays on-model. Both are confirmed DashScope models
(the adapters are built, unit-tested and env-gated; the model is a single env switch).
The agent's tools are also exposed over **MCP** (`mcp/`), so any MCP client (e.g. Claude Desktop) can
drive the MemoryAgent directly.

## How we built it
- **Memory core:** a contextual bandit (`agent_memory.ts`) — decay 0.98, learn-rate 0.15 with
  diminishing returns (`log10` of USD), exploration floor 0.12, deterministic seeded ranking (no
  `Math.random`). Pure and fully unit-tested.
- **Reasoning:** Qwen (`qwen-max`) via DashScope's OpenAI-compatible API; the caption prompt weaves
  in the memory hint. Template fallback → zero cost, never blocks a batch.
- **Reward signal:** a chunked, cursor-tracked indexer scans `Minted` events on XDC into Postgres;
  conversions resolve per referral code.
- **Generation:** DashScope async task APIs (Wanx image-synthesis, Wan/HappyHorse video-synthesis),
  env-gated with a provider-preflight endpoint that live-checks the Qwen key/auth and reports the
  resolved video model ids in one call (generation itself stays behind its own flag).
- **Scheduler:** an hourly timer hits one authenticated endpoint that runs the full loop
  (reinforce → rank → Qwen-write → enqueue) plus the chain indexer, per enabled creator.
- **Stack:** Next.js 14 + TypeScript, Supabase (Postgres), viem (XDC), MCP SDK. 226 unit tests;
  typecheck/lint/build green in CI; the MCP server has a stdio smoke test.

## Challenges we ran into
- **Reinforcement correctness:** an hourly cron naively re-credits the same rolling window ~24×/day,
  inflating experience and saturating weights (exploration dies). We fixed it with a per-creator
  last-reinforced high-water-mark and a zero-revenue guard (the agent only learns from real USD).
- **Keeping the real watch on-model:** text-to-video invents watches. The two-stage compose→animate
  pipeline anchors generation to a composed still of the exact timepiece.
- **Honest gating:** every live path (LLM, image, video) is env-gated with safe fallbacks, so the
  demo burns zero credits and a flaky provider can never block the agent.

## Accomplishments we're proud of
- A **closed learning loop on real revenue** — not a "remembers your name" chatbot.
- The loop is **inspectable live**: the `/hackathon` judge tour runs the agent's real functions in
  the browser — click a simulated on-chain outcome (the same signal our indexer reads from XDC in
  production), watch the memory reinforce, the batch re-rank, and the
  exact Qwen prompt change.
- **MCP-native**: five agent tools (`rank_content_batch`, `reinforce_memory`, `memory_summary`,
  `draft_caption_prompt`, `read_conversions`) wrap the same tested logic.

## What we learned
Reward design beats model size: grounding memory in an un-fakeable economic signal changes agent
behaviour more than any prompt tweak. And idempotency is the hard part of "autonomous" — a loop that
runs hourly must credit each outcome exactly once.

## What's next
Live validation of the DashScope model ids at scale, per-agent budget controls, auto-publish via
official platform APIs (keeping human-in-the-loop defaults), and richer memory features (posting
time, caption style embeddings).

## Built with
`qwen-max` · DashScope (Wanx, Wan/HappyHorse) · Alibaba Cloud Function Compute + ACR · Next.js 14 ·
TypeScript · Supabase (Postgres) · viem / XDC · Model Context Protocol · Netlify · Vitest

## Try it out (testing access)
- **Live demo:** `<LIVE_URL>` — start at `<LIVE_URL>/hackathon` (the judge tour), then Dashboard →
  AI agent tab, and the Studio.
- **Repo:** `<REPO_URL>` — see `README.md`, `docs/ARCHITECTURE.md` (diagrams), `docs/SYSTEM_SPEC.md`
  (full spec), `mcp/README.md` (drive the agent from Claude Desktop).
- **Video:** `<VIDEO_URL>` (< 3 min).
- **Proof of Alibaba Cloud deployment (code file):** `frontend/Dockerfile` +
  `docs/DEPLOY_ALIBABA.md` — backend live at `<LIVE_URL>`.

## What changed during the submission period (required statement)
The RWA-DAO platform pre-existed. The submission-period work is the **MemoryAgent + Qwen layer**:
the contextual-bandit memory reinforced by on-chain USD (`agent_memory.ts` + `rwa_agent_memory`),
the scheduler's memory→Qwen reasoning path (`agent_scheduler.ts`, `llm.ts`, `qwen.ts`), the
Alibaba-native generation adapters (`qwen_video.ts`, `qwen_image.ts`), the `Minted`-event indexer
that supplies the reward signal, the MCP server (`mcp/`), the provider preflight, the Alibaba Cloud
deploy kit, and the `/hackathon` interactive judge tour. That layer is what makes the agent
memory-driven and Alibaba-native.

---

### Submit-day checklist
- [ ] Repo flipped to **public**; `curl -o /dev/null -w '%{http_code}' <REPO_URL>` → 200 anonymously
- [ ] LICENSE copyright line confirmed by Peter
- [ ] `<LIVE_URL>` serves `/hackathon`, `/studio`, `/dashboard` (all 200)
- [ ] `preflight?probe=1` returns `reachable: true` (key set)
- [ ] Video uploaded (< 3:00, public/unlisted) — script: `HACKATHON_DEMO_SCRIPT.md`
- [ ] Team + one Representative registered on Devpost; IP note written
- [ ] All three placeholders above replaced
