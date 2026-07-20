# Building a MemoryAgent that learns from real on-chain revenue — RWA-DAO on Qwen Cloud

*Global AI Hackathon Series with Qwen Cloud — Track 1: MemoryAgent*

Most "AI marketing" tools optimise the wrong thing. They chase likes and views — signals that are
cheap to fake and only loosely tied to whether anyone actually *bought* anything. When we sat down
for the Qwen Cloud MemoryAgent track, we started from a different question: **what if an agent's
memory was reinforced by real revenue instead of engagement?**

We had a rare thing that makes that possible. RWA-DAO sells fractions of real, vaulted luxury watches
on XDC. Every purchase is an on-chain `Minted` event — a USD amount, a buyer, and the referral code
of the creator whose content drove it. That's a **ground-truth reward signal**: un-fakeable, and
tied to money changing hands. So we built a marketing MemoryAgent whose memory learns what actually
converts and reasons on **Qwen** — and that we wired to generate on **Alibaba's own video models**.
Its memory improves as real mints roll in.

This post is our build journey: what the agent is, the architecture, the two bugs that taught us the
most, and what we'd still improve. We've tried to be precise about what's *running* versus what's
*built and waiting on a key* — because on a hackathon, a claim a judge can disprove is worse than no
claim at all.

## What the agent does

Each creator gets a hosted agent. Once an hour it runs one loop:

1. **Load the creator's memory** — a compact map of learned weights over content *features* (which
   platform, style, team colourway, and watch convert for *this* creator), persisted in Postgres.
2. **Reinforce it from the chain** — we index the RwaWatchNft `Minted` events on XDC and credit the
   USD a creator's referral code drove back into the features their posted content carried.
3. **Rank the next batch** with a contextual bandit — exploit what's working, keep exploring.
4. **Write the captions on Qwen** — the prompt carries a one-line *memory hint* ("this creator's
   audience responds best to TikTok · luxury reveals · Brazil colourways"), so the copy leans into
   what mints.
5. **Queue the drafts.** The creator reviews and posts in one tap with their referral link — a human
   at the critical decision point, never an auto-posting bot. New mints close the loop.

Video generation is **two-stage and fully Alibaba-native**: compose the exact watch into the scene as
a still on **Wanx**, then animate that frame on **HappyHorse 1.0** — Alibaba's flagship video model
(native 1080p + audio) — or **Wan**, all via DashScope, so the real timepiece stays on-model instead
of a hallucinated look-alike. Both models are confirmed on DashScope at the same video-synthesis
endpoint. The adapters are built, unit-tested and wired; the live compose/animate contract (down to
the Wanx reference-image field) is validated the moment our DashScope key is provisioned. Until then
the default path is honest: compose returns the exact-watch reference plate as the start frame, and
generation returns a prepared plan without calling a provider or spending a credit.

## How we answered the track's three memory questions

The MemoryAgent track asks specifically for *efficient storage and retrieval, timely forgetting, and
recall within a limited context window*. Our design is opinionated about each:

- **Storage & retrieval.** We don't store raw interaction transcripts. Each creator's memory is a
  small vector of feature weights — a few dozen numbers keyed like `platform:TikTok` or
  `style:luxury_reveal_mvp`. One row in `rwa_agent_memory`, loaded in a single query per tick.
- **Timely forgetting.** Every reinforcement applies a `0.98` decay across all weights, so old
  preferences fade as new revenue signals arrive. Forgetting is baked into the update rule rather
  than a separate eviction job — it's event-driven: the decay fires each time a creator's content
  drives fresh mints, keeping the memory tuned to what converts now.
- **Recall within a limited context window.** Because experience is *distilled* into that tiny
  weight vector, the "memory" we hand to Qwen is a single natural-language line, not a wall of
  history. It fits in any context budget, and it's the same summary that renders in the dashboard so
  a human can read exactly what the agent believes.

That distillation is the part we're proudest of. A memory that's a handful of decaying numbers is
cheap to store, cheap to retrieve, trivial to fit in-context, and legible to a person.

## The architecture

```
per-creator memory ──▶ Qwen writes the captions ──▶ generate (Wanx → Wan/HappyHorse)
      ▲                                                          │
      └──── on-chain outcome (Minted events, USD) ◀── creator posts with referral link
```

- **Reasoning:** Qwen (`qwen-max`) via DashScope's OpenAI-compatible endpoint.
- **Generation (wired, gated):** DashScope async task APIs — Wanx image-synthesis (stage 1),
  HappyHorse 1.0 / Wan video-synthesis (stage 2). Both are confirmed DashScope models
  (`happyhorse-1.0-i2v`, `wan2.2-i2v-flash`); the model is a single env switch.
- **Memory & queue:** Supabase Postgres (`rwa_agent_memory`, `rwa_agent_drafts`).
- **Reward signal:** a chunked, cursor-tracked indexer scanning `Minted` events on XDC Apothem.
- **Scheduler:** an hourly timer hits one authenticated endpoint that runs the whole loop per creator
  (running today on a Netlify scheduled function).
- **Backend:** a Next.js standalone container, **ready to run on Alibaba Cloud Function Compute**
  (the `Dockerfile` is our proof-of-deployment code file; build verified locally).
- **Skills as MCP:** the agent's tools (`rank_content_batch`, `reinforce_memory`, `read_conversions`,
  and two more) are also exposed over the Model Context Protocol, so any local MCP client — Claude
  Desktop included — can drive the MemoryAgent directly.

## The bug that taught us the most: reinforcing the same window 24× a day

Our first version reinforced memory from "the last 30 days of outcomes" on every hourly tick. It
looked fine in a single run. But run it hourly and it quietly re-credits the *same* window ~24 times
a day: `posts` inflates without bound, and the weights **saturate** — every feature pins to its
ceiling, the exploration term stops mattering, and the agent freezes on whatever it first tried.

The fix is a per-creator **last-reinforced high-water-mark**: each run only credits outcomes since
the previous reinforcement, then advances the mark — and only when a real reinforcement actually
happened. We also added a **zero-revenue guard** — a window that drove $0 teaches nothing, so we
don't bump the experience counter for it. The reward *is* the signal; posting without mints isn't
evidence.

This is the kind of thing you only catch by thinking about the loop as a loop, not as a function. It
was the single biggest correctness win in the project.

## The honest hard part: attribution

Here's a constraint we didn't design away, because we can't: the chain tells us the USD a creator's
*referral code* drove, not which specific post drove which mint. So when several posts share a
window, we split the credit evenly across them. That's genuine — no per-post ground truth exists —
and it's exactly why the **human-in-the-loop** matters: the creator posting the drafts they believe
in is a sharpening signal on top of the revenue. We think the cleanest future gain is nudging toward
posting fewer, higher-conviction videos so each on-chain outcome attributes more cleanly.

We'd rather ship a system that's honest about this than a demo that pretends attribution is solved.

## Deploying on Alibaba Cloud

We built the whole thing to be safe-by-default and Alibaba-Cloud-ready. With no keys set, generation
returns a prepared plan and burns zero credits, captions fall back to a deterministic template, and
only on-chain *reads* are live. Every paid path is behind an explicit flag, and a one-call preflight
endpoint confirms the Qwen key is present and reports the resolved model ids before anything expensive
runs.

For Alibaba Cloud specifically, the pieces map cleanly: the standalone container targets **Function
Compute**, the image pushes to **ACR**, and the hourly loop becomes an **FC timer trigger** hitting
our authenticated `/agent/run` endpoint — the same endpoint a Netlify scheduled function drives
today. We wrote those steps out as an exact runbook and verified the container build locally; the
live deploy runs the moment the Alibaba Cloud account is wired up. Keeping the infra as code meant the
Alibaba target was a deployment concern, not a rewrite.

## What we'd still improve

Beyond the live-validation of the generation contract: richer memory features (posting time,
caption-style), per-creator budget controls, and tighter clip-to-clip consistency in longer videos.
And a cleaner attribution story — the per-referral signal is honest but coarse, and we have ideas for
sharpening it without pretending the chain gives us something it doesn't.

## On planning vs building

One honest note on process: we used Claude to think through the architecture — the memory model, the
reinforcement update rule, the deployment shape — and to pressure-test our own claims against the
code with an adversarial review pass before we shipped anything user-facing (including fact-checking
this very post against the repo). Planning and implementation are genuinely different modes of work,
and keeping a clear line between "what should this do and why" and "make the tests green" made both
halves faster.

## Where it landed

A marketing agent whose memory is grounded in real, on-chain revenue; that reasons on Qwen; that's
wired to generate on Alibaba's own models; and whose learning loop you can watch happen live in the
browser — reinforce an outcome, see the memory shift and the next batch re-rank. Not a chatbot that
remembers your name. An agent that compounds, on a reward signal that can't be faked.

*Built with: Qwen (`qwen-max`) · DashScope (Wanx, HappyHorse 1.0, Wan) · Next.js · TypeScript · Supabase/Postgres ·
viem / XDC · Model Context Protocol. Targeting Alibaba Cloud Function Compute + ACR for deployment.*

*Tags: Qwen · AlibabaCloud · Devpost · Hackathons · Artificial Intelligence*
