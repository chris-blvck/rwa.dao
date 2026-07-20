# RWA-DAO — Creator Studio & MemoryAgent

A Web3 luxury-watch content platform on **XDC**: creators pick a watch, a persona and a style,
generate a cinematic video, post it with their referral link, and earn as the **on-chain mints they
drive** are read back from the chain — none of it fakeable. The autonomous marketing brain is a
**MemoryAgent** that learns what actually converts and reasons on **Qwen (Alibaba Cloud)**.

> **Qwen Cloud Global AI Hackathon — MemoryAgent track.** We don't submit "a video generator." We
> submit a memory-driven marketing agent whose reasoning runs on Qwen and whose memory is reinforced
> by a **real revenue signal** (on-chain `Minted` events), so it makes measurably better decisions
> each session. See [`docs/HACKATHON_QWEN.md`](docs/HACKATHON_QWEN.md).
>
> **Judges: start at [`/hackathon`](frontend/app/hackathon/page.tsx)** — an interactive tour that
> runs the MemoryAgent's real, unit-tested functions in your browser (reinforce the memory, watch
> the batch re-rank and the Qwen prompt change). No keys, no cost.

## The loop (what makes it a MemoryAgent, not a chatbot)

```
per-creator memory ──▶ Qwen writes the next batch ──▶ generate (Alibaba video)
      ▲                                                        │
      └──── on-chain outcome (Minted events, USD) ◀── creator posts with referral link
```

Full system + diagrams: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Where the hackathon code lives (all under `frontend/`)

| Concern | File(s) |
|---|---|
| Qwen reasoning (LLM) | `lib/rwa/qwen.ts` · `lib/rwa/llm.ts` |
| MemoryAgent core (contextual bandit) | `lib/rwa/agent_memory.ts` |
| Autonomous scheduler (memory → Qwen → drafts) | `lib/rwa/agent_scheduler.ts` · `app/api/rwa/agent/run/route.ts` |
| Alibaba-native video (Wan / HappyHorse) | `lib/rwa/qwen_video.ts` · `app/api/rwa/generate/route.ts` |
| On-chain reinforcement (Minted indexer + conversions) | `lib/rwa/mint_indexer.ts` · `lib/rwa/rwa_watch_nft.ts` |
| Provider preflight | `lib/rwa/preflight.ts` · `app/api/rwa/agent/preflight/route.ts` |
| **MCP server** (agent tools for any MCP client) | [`mcp/`](mcp/) — `rank_content_batch` · `reinforce_memory` · `read_conversions` · … |

## Run it locally

```bash
cd frontend
npm ci
npm run dev        # http://localhost:3000  (demo mode — safe, no keys, no credits burned)

npm run typecheck  # tsc --noEmit
npm run lint
npm test           # vitest (216 tests)
npm run build
```

**Demo-safe by default:** with no keys set, generation returns a prepared plan (no provider call, no
credits), agent captions use a deterministic template, and on-chain reads run against the public XDC
Apothem RPC. Set the keys below to light up the live paths.

## Deploy on Alibaba Cloud

Turnkey container (Function Compute / ECS): [`docs/DEPLOY_ALIBABA.md`](docs/DEPLOY_ALIBABA.md) — build,
push to ACR, the timer-trigger cron, and the full env matrix. Once the DashScope key is set, verify
the whole path with one call:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<url>/api/rwa/agent/preflight        # config check
curl -H "Authorization: Bearer $CRON_SECRET" "https://<url>/api/rwa/agent/preflight?probe=1"  # +live Qwen probe
```

## Key environment variables

| Var | Enables |
|---|---|
| `DASHSCOPE_API_KEY` (or `QWEN_API_KEY`) | Qwen reasoning + captions + Alibaba video |
| `RWA_LLM_PROVIDER=qwen` | force captions through Qwen |
| `RWA_VIDEO_PROVIDER=qwen` + `RWA_ALLOW_LIVE_GENERATION=1` | live DashScope video generation |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | agent queue, memory store, Minted indexer |
| `CRON_SECRET` | guards `/api/rwa/agent/run` + `/agent/preflight` |
| `NEXT_PUBLIC_SITE_URL` | canonical host for metadata / robots / sitemap / OG cards |

Full matrix in [`docs/DEPLOY_ALIBABA.md`](docs/DEPLOY_ALIBABA.md).

## Docs

- [`docs/HACKATHON_QWEN.md`](docs/HACKATHON_QWEN.md) — submission plan & status
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — system diagrams
- [`docs/DEPLOY_ALIBABA.md`](docs/DEPLOY_ALIBABA.md) — Alibaba Cloud deploy
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — production roadmap
- [`docs/ONCHAIN_REWARDS.md`](docs/ONCHAIN_REWARDS.md) — points → RWAX model

## Repo layout

- `frontend/` — the Next.js 14 app (the hackathon submission surface).
- `docs/` — architecture, deploy, hackathon, roadmap.
- `supabase/` — SQL migrations (agent drafts, memory, Minted events).
- The Python `rwa_watch_intelligence/` side is a separate internal tooling subsystem, not part of the
  hackathon submission surface.

---

_Demo/creative content is for information only — not financial advice._
