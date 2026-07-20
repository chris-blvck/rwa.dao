# Qwen Cloud Global AI Hackathon — RWA-DAO submission plan

**Track: MemoryAgent.** We don't submit "a watch video generator" — we submit **an autonomous,
memory-driven marketing agent for RWA creators, powered by Qwen**, where the video model is one tool
the agent wields. That's what scores: Innovation & AI Creativity (30%) + Technical Depth (30%) reward
sophisticated Qwen API use, custom skills/MCP, and real agentic engineering — not a provider wrapper.

## The one-liner
> An agent that remembers each creator's brand voice and *what actually drives on-chain mints*, and
> gets measurably better every session — reasoning on Qwen, generating on Alibaba's video model,
> learning from real revenue (on-chain `Minted` events), not a toy "remembers your name" chatbot.

## Why this wins the MemoryAgent track
The track asks for "persistent memory that autonomously accumulates experience, remembers user
preferences, and makes increasingly accurate decisions across multi-turn, cross-session
interactions." Most entries will be chatbots recalling your name. Ours closes a **real feedback loop**:

```
per-creator memory ──▶ Qwen decides the next content mix ──▶ generate (Alibaba video)
      ▲                                                              │
      └──── on-chain outcome (Minted events, USD driven) ◀── creator posts w/ referral link
```

- **Memory** (`rwa_agent_memory`): each creator's brand voice, best platforms/styles/teams, and
  learned weights updated from the mints their content actually drove.
- **Reasoning**: Qwen (`qwen-max`/`qwen3`) picks the next batch from memory + live conversion data.
- **Generation**: Alibaba's video model (HappyHorse / Wan) via the two-stage compose→animate pipeline.
- **Truth signal**: on-chain conversions (we already index `Minted` events) — un-fakeable, real-world.

Innovation (novel closed loop on real revenue) · Technical Depth (our real scheduler/indexer/two-stage
architecture) · Problem Value (creator marketing that compounds) · Presentation (live demo + these docs).

## How Qwen / Alibaba Cloud plugs in (the qualifying path)
The hackathon requires **use of Alibaba Cloud services & APIs** + backend **running on Alibaba Cloud**.
Going through a 3rd-party aggregator (Higgsfield) does NOT qualify — we must call Alibaba directly:

| Layer | Alibaba-native |
|---|---|
| Agent brain / captions / decisions | **Qwen** via DashScope (`lib/rwa/qwen.ts`, OpenAI-compatible chat) — built ✅ |
| Video generation | **Wan / HappyHorse** via DashScope video-synthesis (`lib/rwa/qwen_video.ts` — building) |
| Scene compose (stage 1) | Alibaba image model (Wanx) via DashScope |
| Memory store + backend | Alibaba Cloud (RDS/Table Store + Function Compute / ECS) — deployment task |
| Custom skills / MCP | expose agent tools (generate, post, read-conversions, remember) as MCP — judges reward this |

> Product note: for the *product* (not the hackathon), HappyHorse/Wan via Higgsfield is a one-line
> model swap and already selectable in the Studio — that's the fast quality win. The hackathon needs
> the Alibaba-native calls above.

## Submission requirements — status & owners
- [ ] **Team structure** 👤 Peter: he's already adding us as teammates → we enter as **one team**, one
  Representative. Need a short internal IP note (hackathon layer vs the RWA-DAO product IP).
- [ ] **Public open-source repo + OSI license** 👤 Peter: scope the submission to the **MemoryAgent
  layer** in its own MIT repo; Peter's audited contracts stay out of scope (separate codebase; the
  Project reaches them via the public on-chain address). Open-source ≠ losing ownership.
- [~] **Proof of Alibaba Cloud deployment**: **deploy kit ready** — `frontend/Dockerfile` (Next.js
  standalone, build verified) + [`DEPLOY_ALIBABA.md`](./DEPLOY_ALIBABA.md) (Function Compute / ECS +
  ACR + timer-trigger cron + full env matrix). Remaining: run it on Peter's Alibaba account (needs
  the account + the DashScope key).
- [x] **Architecture diagram**: formalized in [`ARCHITECTURE.md`](./ARCHITECTURE.md) — system overview,
  two-stage generation, the MemoryAgent closed loop, and the indexer/points flow (Qwen ↔ backend ↔ DB
  ↔ frontend ↔ chain), rendered as GitHub-native Mermaid.
- [ ] **Demo video < 3 min** on YouTube, functioning footage, no copyrighted music.
- [ ] **"Significantly updated"**: our platform pre-exists — the Qwen integration + MemoryAgent layer
  IS the significant update; we state exactly what changed during the submission period.
- [ ] **Free testing access**: the live demo URL (already public) + creds if needed.

## Built so far (this push)
- `lib/rwa/qwen.ts` — DashScope adapter (OpenAI-compatible chat), env-gated, key from
  `DASHSCOPE_API_KEY`/`QWEN_API_KEY`, model via `QWEN_MODEL`, base via `DASHSCOPE_BASE_URL`.
- Captions are provider-aware: `RWA_LLM_PROVIDER=qwen` (or a DashScope key) routes the agent's
  captions through Qwen; the "✨ AI rewrite" button and the caption route report the provider.
- HappyHorse 1.0 + Wan 2.7 are selectable video models in the Studio.

## Built so far (this push — cont.)
- `lib/rwa/qwen_video.ts` — **Alibaba-native** DashScope video adapter (Wan/HappyHorse, async task
  create + poll). Env-gated `RWA_VIDEO_PROVIDER=qwen` + DashScope key; model ids env-overridable.
  Wired into `/api/rwa/generate` (+ provider-aware `/status`) so generation runs on Alibaba's own
  API — the hackathon-qualifying path, alongside the two-stage compose→animate flow.
- `lib/rwa/agent_memory.ts` — **the MemoryAgent core** (contextual-bandit memory): per-creator
  feature weights reinforced by the on-chain USD each piece of content drove, `rankByMemory` biases
  the next batch toward what works (with exploration), `memorySummary` for the UI + Qwen prompt.
  Pure + fully unit-tested. Store: `rwa_agent_memory` (migration applied to the live project).

## Built so far (this push — cont.)
- `agent_scheduler.ts` — **memory wired into the scheduler**: each tick loads the creator's memory,
  reinforces it from posted drafts × on-chain USD (`rwa_minted_events` via their ref code), then
  `rankByMemory` biases the next batch — the loop closed end-to-end. Additive: `RWA_MEMORY_AGENT=0`
  falls back to the plain rotation. Surfaced in the Dashboard → AI agent tab ("Agent memory" card).
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — the full system formalized (4 diagrams).
- **Fully Alibaba-native two-stage pipeline** (`lib/rwa/qwen_image.ts`): stage-1 compose now has a
  DashScope **Wanx** image-synthesis adapter (async create + poll), wired into `/api/rwa/compose`
  (+ provider-aware `/status`) when `RWA_VIDEO_PROVIDER=qwen`. So BOTH stages run on Alibaba's own
  API (Wanx still → Wan/HappyHorse video), not just stage-2. Model id + reference field are
  env-overridable and live-unvalidated until the key (same posture as the video adapter).
- **Reasoning on Qwen, closed onto memory** (`llm.ts` + `agent_scheduler.ts`): the scheduler now
  writes each draft's caption via the LLM (`captionProvider()` → Qwen when a DashScope key is set),
  and the prompt is **informed by the creator's `memoryHint`** — so the copy leans into the exact
  platform/style/team the audience has minted on. Gated + template fallback (no key → deterministic
  caption stands, zero cost); any provider error keeps the template. This is the literal
  memory→reasoning→generation loop the track asks for. Unit-tested end-to-end (mocked provider).
- **Agent tools exposed as MCP** ([`mcp/`](../mcp/)): a Model Context Protocol server registering
  `rank_content_batch`, `reinforce_memory`, `memory_summary`, `draft_caption_prompt`, and
  `read_conversions` — thin wrappers over the same tested `frontend/lib/rwa/*` logic. Any MCP client
  (Claude Desktop) can drive the MemoryAgent. Verified with a real stdio smoke test. Judges reward
  custom skills/MCP (Technical Depth 30%).

## Next (deployment / submission)
1. **Give the key** → validate the DashScope video model ids + endpoints live (the one thing the
   adapters can't self-verify), then deploy the agent backend on **Alibaba Cloud** (Function Compute
   / ECS + RDS/Table Store) — the required proof; link the code file using Alibaba Cloud services.
2. Record the demo video (<3 min) per [`HACKATHON_DEMO_SCRIPT.md`](./HACKATHON_DEMO_SCRIPT.md);
   open-source repo scoping + license (Peter's call).
