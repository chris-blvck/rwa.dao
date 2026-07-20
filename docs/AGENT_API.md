# RWA-DAO Agent API — the "open claw" (spec / roadmap)

Peter's vision: **agentic AI influencers** that market RWA-DAO, earn tokens via posts + referrals,
and buy/hold/resell tokens & NFTs — through an **open API for agents**. This spec is how we build
that **for real and compliantly**, in phases. Nothing here bypasses platform ToS or the money-path
audit: autonomous posting goes through **official platform APIs**, and rewards are **utility points
→ on-chain payout** with anti-sybil, not investment returns.

Status: **spec** (Phase 1 shipped as human-in-the-loop AI Auto-pilot; Phases 2–3 below).

## V1 scope — keep it SIMPLE (don't build the framework/MCP layer yet)
For launch, the mainstream community wants **one button, not a framework**. So V1 is a **closed,
platform-owned lightweight agent** — no Hermes/OpenClaw deployment per user, no open MCP API:
> a **scheduler (cron)** → for each active user, **call the LLM** (captions/scripts) + our video
> pipeline → drop the draft in the user's **queue** → user posts in one tap → **on-chain rewards**.

That's it. It's cheaper, simpler to run, and fully controlled. **Already shipped:** `lib/rwa/agent.ts`
(`runAgentTick`), `POST /api/rwa/agent/tick` (the hosted run), the Managed-Agent UI, and the on-chain
payout (`web3/` + oracle + claim). The **open Agent API / MCP / third-party agents / agent-wallets
(OpenClaw, Hermes) below are LATER-ONLY** — build them only if technical users later ask to plug in
their own agents. Don't over-build a framework for a need you don't have yet.

## Phases
| Phase | Capability | Gate |
|---|---|---|
| **1 — shipped** | AI drafts content daily; human posts in one tap; earns rewards + referral | — |
| **2 — near** | Agent **auto-publishes** to the user's **connected** socials (official APIs) | business accounts + platform app review |
| **3 — open claw** | **Third-party agents** plug in via the Agent API; **agent wallets** hold/earn/trade RWAX & NFTs | audited contract + treasury automation + legal (securities/AML) |

## Hosting model — Managed (default) vs Bring-your-own
Self-hosting an agent on a VPS is too complex for a mainstream community, so the default is a
**Managed Agent** (agent-as-a-service): the user toggles it on in the app (cadence, platforms,
one-tap vs auto), and RWA-DAO **runs the loop server-side** — no VPS, no install. Advanced users can
**bring their own** agent (OpenClaw / Hermes / any MCP client) and point it at the same API.
- Shipped scaffold: `lib/rwa/agent.ts` (config + `runAgentTick`) + `POST /api/rwa/agent/tick`
  (runs a tick server-side) + the "Your Managed Agent" panel (activate / cadence / platforms).

## Framework-agnostic (MCP)
Don't marry one framework. Expose an **MCP-compatible API** so **OpenClaw, Hermes, Claude Code,
Codex** — anything MCP — can plug into RWA-DAO. That IS Peter's "open token API for agentic
influencers", and it's future-proof (pick the default agent for the community; power users swap).

## Auth
- **User agents** (Phase 2): the user connects socials via OAuth; the app stores per-platform tokens
  server-side and publishes on their behalf. The user owns the connection and can revoke anytime.
- **Third-party agents** (Phase 3): API key **or** OAuth client credentials scoped to one wallet
  (`agent_wallet`). All calls signed; per-agent rate limits + reputation.

## Endpoints (Phase 3 draft)
```
POST /agent/v1/register          → { agent_id, agent_wallet }         # bind an agent to a wallet
GET  /agent/v1/briefs            → [{ brief_id, watch, style, team, caption, target_platform }]
POST /agent/v1/publish           { brief_id, platform, connected_account_id } → { post_id }
GET  /agent/v1/performance/:post_id → { views, engagement, verified_at }      # via platform APIs
POST /agent/v1/claim             { post_id }        → { reward_rwax, tx_hash } # oracle-gated payout
GET  /agent/v1/referrals         → { code, l1_pct, l2_pct, pending_rwax }
POST /agent/v1/trade             { action:"buy"|"sell", asset:"token"|"nft", qty } → { tx_hash }
```

## Reward rail (on-chain, anti-farm)
- **Performance oracle**: reads verified metrics from the official platform APIs (not self-reported)
  → maps to an RWAX payout curve. Only **verified, unique** posts pay out.
- **Anti-sybil / attribution**: 1 payout per post; device/account/wallet fingerprinting; the existing
  1-post/day floor generalizes to per-agent quotas + reputation decay for low-quality output.
- **Treasury**: payouts stream from `RWA_TREASURY_ADDRESS`; the 2× generation markup helps fund it.

## Agent wallets (Phase 3)
- **ERC-4337 smart accounts** + **session keys**: an agent holds RWAX/NFTs, earns rewards, and can
  buy/sell within policy limits (spend caps, allow-lists) — so "agents earning and reselling" is real
  but bounded. Keys are revocable; the human owner sets the policy.

## Hard constraints (why we don't just "let bots post")
- **Platform ToS**: autonomous posting is allowed **only** via official publishing APIs with user
  consent + app review. Headless/scraping automation = account bans. Phase 2 uses the sanctioned path.
- **Legal**: agents autonomously earning + trading tradeable tokens can implicate securities/AML.
  Structure rewards as **utility** (points → redeem), keep disclosures, get a regulatory review before
  enabling Phase 3 trading.

## What exists today (maps to the vision)
- `lib/rwa/autopilot.ts` + AutopilotPanel — the agent that drafts the daily briefs (Phase 1).
- Auto-pilot **Manual / Auto-publish** toggle in the app — surfaces the Phase 2 path (connect socials).
- `lib/rwa/referral.ts` — the referral fees an agent (or its owner) earns.
- `lib/rwa/mint.ts` + points/rewards — the token/NFT earn-and-redeem loop.
- The generation pipeline — how an agent produces on-brand content.
