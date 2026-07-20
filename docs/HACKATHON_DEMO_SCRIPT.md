# Demo video script (< 3 min) — Qwen Cloud Hackathon, MemoryAgent track

Goal: prove in under three minutes that this is a **memory-driven agent that reasons on Qwen and
learns from real on-chain revenue** — not a video-generator wrapper. Show the *loop*, then the proof.

**Format:** screen recording of the live app + one terminal for the "money shot" call. No copyrighted
music. Target ~2:45. Shot list below with on-screen narration (VO) and exactly what to click.

---

## 0:00–0:20 — The hook (the problem + the one-liner)
**On screen:** the home page (`/`), the vaulted watch hero.
**VO:** "RWA-DAO turns a luxury-watch community into a marketing army. Every creator gets an AI agent
that doesn't just make content — it *remembers what actually sells* and gets smarter every day.
The twist: its reward signal isn't likes. It's real, on-chain mints."

## 0:20–0:55 — The MemoryAgent (the differentiator)
**On screen:** `/dashboard` → **AI agent** tab. Point at the **"Agent memory"** card ("learns from
your mints"), then the drafted batch below.
**VO:** "This is the agent's memory. It tracks which platform, style, and colourway this creator's
audience has actually minted on. Each cycle it reinforces those weights from on-chain revenue, then
**Qwen writes the next batch's captions** biased toward what works — reasoning on Alibaba Cloud,
grounded in real outcomes."
**Click:** the sub-nav (Account · My videos · AI agent · Ambassador) to show it's a real product.

## 0:55–1:35 — Generation on Alibaba's own model (two-stage)
**On screen:** `/studio`. Pick a watch + persona + style. Show the **compose** step (a still plate of
the exact watch), then **animate**.
**VO:** "Generation is two-stage: compose the exact watch into the scene, then animate it — so the
real timepiece stays on-model. Running on Alibaba's **Wan / HappyHorse** via DashScope, the
hackathon-native path." *(If live generation isn't wired for the recording, say so: "here in demo
mode it returns the prepared plan — no credits burned; the live path is one env flag.")*

## 1:35–2:10 — The truth signal (un-fakeable)
**On screen:** `/dashboard` → **Account** tab → the on-chain conversions cards (mints driven,
volume, points), and the mint link.
**VO:** "The creator posts with their referral link. When it drives a mint on the RwaWatchNft
contract, we read it straight off XDC — indexed `Minted` events, not self-reported numbers. That USD
is exactly what reinforces the memory. The loop is closed on real revenue."

## 2:10–2:40 — The money shot (one call = the whole loop, on Alibaba Cloud)
**On screen:** a terminal against the **Alibaba-Cloud-deployed** URL.
```bash
# 1) confirm the Qwen path is live (no generation cost)
curl -H "Authorization: Bearer $CRON_SECRET" "$URL/api/rwa/agent/preflight?probe=1"
#   → llm.reachable: true, sample: "OK", video.models: {...}

# 2) run one agent tick — reasons on Qwen, ranks by memory, indexes the chain
curl -X POST -H "Authorization: Bearer $CRON_SECRET" "$URL/api/rwa/agent/run"
#   → { ran: true, agents: {enqueued, reinforced}, indexer: {...} }
```
**VO:** "One call exercises the whole system running on Alibaba Cloud: Qwen for reasoning, Supabase
for the persistent memory, and the chain for the reward signal."

## 2:40–2:55 — Close
**On screen:** the architecture diagram (`docs/ARCHITECTURE.md`, the MemoryAgent loop).
**VO:** "Memory, reinforced by real revenue. Reasoning on Qwen. Generation on Alibaba's model. That's
a MemoryAgent that compounds."

---

## Pre-record checklist
- [ ] Deployed on Alibaba Cloud (Function Compute URL) — or localhost with `DASHSCOPE_API_KEY` set.
- [ ] `preflight?probe=1` returns `reachable: true` (run it once before recording).
- [ ] A creator has an ambassador code + at least one on-chain conversion to show real numbers
      (or narrate the demo values honestly).
- [ ] `CRON_SECRET` set; `$URL` points at the live deploy.
- [ ] Screen at 1080p+, no personal tabs/notifications, no copyrighted audio.
- [ ] Keep it under 3:00. Upload unlisted/public to YouTube; put the link in the submission.

## What changed during the submission period (state this in the submission)
The RWA-DAO platform pre-existed. The **submission-period work is the MemoryAgent + Qwen layer**:
`agent_memory.ts` (memory reinforced by on-chain USD), the scheduler's memory→Qwen reasoning path
(`agent_scheduler.ts` + `llm.ts`/`qwen.ts`), the Alibaba-native video adapter (`qwen_video.ts`), the
`Minted` indexer that supplies the reward signal, the Alibaba Cloud deploy kit, and the provider
preflight. That layer is what makes the agent *memory-driven* and *Alibaba-native*.
