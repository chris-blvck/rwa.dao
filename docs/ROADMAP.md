# ROADMAP — from polished demo to production killer

The client is signing. The bar moves: **no more "works in demo" — everything a real creator touches
must be real, fast, farm-proof, and beautiful.** This file is the execution contract: every item has
a priority, a why, and a concrete how. Legend: ✅ shipped · 🔨 in progress · ⬜ next ·
🔑 needs a key/secret · 👤 blocked on client.

**North star:** a creator lands, generates a video that looks agency-grade, posts it with their
link, drives a real on-chain mint, sees the points appear — and none of it can be faked, and all of
it feels premium. When each of those six verbs is production-true, we've shipped the killer.

---

## P0 — Trust & money correctness (before real users touch rewards)

The demo tolerated client-side trust. Production cannot: points are future money.

- ⬜ **Server-authoritative points ledger.** Today points live in localStorage (editable by anyone
  in devtools). Move to an append-only `rwa_points_ledger` (Supabase): every credit is a row with a
  `kind` (post / agent_post / conversion), a `source_id` (dedup key), and is written **server-side
  only** (service role) after verifying the triggering event. Client reads its balance; never writes.
  The UI keeps localStorage as an offline cache only. *This is the single biggest demo→prod gap.*
- ✅→🔨 **On-chain Minted indexer.** The chunked live scan (shipped) covers recent blocks; full
  history needs an index. A cron step (same scheduler infra) scans new blocks incrementally into
  `rwa_mints` (Supabase); `/api/rwa/referral/conversions` serves from the index (full history,
  instant) and falls back to the live scan when the index is cold. 🔑 service role at runtime.
- ⬜ **Identity & anti-sybil.** One human ↔ one account: bind the anon session to a **wallet
  signature** (SIWE-style message, verified server-side) before points can be withdrawn; referral
  self-dealing checks (a code can't credit its own wallet's mints); per-account daily caps already
  exist in the agent cadence — mirror them server-side in the ledger.
- ⬜ **Withdrawal-ready flow (points → RWAX).** 👤 blocked on the RWAX address for the *payout*, but
  the plumbing ships now: `rwa_withdrawals` table + "Request withdrawal" UI (threshold, wallet
  binding required) + admin review queue. The day Peter sends the address, we flip one switch.
- ⬜ **Auth + rate limits on spend routes.** 🔑 Before `RWA_ALLOW_LIVE_GENERATION=1` on a public URL:
  per-session generation quota (Supabase-counted), CAPTCHA-or-wallet gate on generate, and the
  existing API_GUARD_SECRET on voucher/caption (shipped).
- ⬜ **Error monitoring + analytics.** Sentry (client+server) with source maps, and a
  privacy-friendly analytics (Plausible) with funnel events: land → generate → post → mint-click.
  You can't polish what you can't see.

## P1 — Generation quality ("the model") — make the output undeniable

The product IS the video. Every improvement here is directly visible to the client.

- 🔨 **Cinematic prompt engine v2.** Replace the flat one-line templates with a shot-grammar
  engine: per-style camera language (lens, movement, lighting state), **duration-aware beat
  structure** (≤8s = one move; longer = staged beats so clips feel edited, not drifting),
  format-aware composition (9:16 vertical framing vs 16:9 cinematic), hero end-frame instruction
  (clean last frame → thumbnails + loops), and hardened fidelity constraints. *Shipping now.*
- 🔨 **Auto model routing.** A creator shouldn't need to know what "Seedance Mini" is. An **Auto**
  mode picks the model from the style + length + quality (macro/ASMR → max-detail std; drafts →
  fast; long cinematic 16:9 → multi-shot-capable model), and the UI shows what it chose and why.
  Agents always route Auto. *Shipping now.*
- ⬜ **Multi-take generation.** "Pro take": generate 2–3 variants of the same brief in parallel,
  auto-rank (virality predictor 🔑), creator picks the keeper — the single biggest perceived-quality
  jump per credit spent.
- ⬜ **Post pipeline: upscale + reframe.** 🔑 One master render → 4K upscale for the hero platform +
  automatic 1:1/16:9 reframes so one generation ships to every network.
- ⬜ **LLM captions everywhere.** 🔑 `ANTHROPIC_API_KEY`: the caption route exists — wire it into the
  Studio result screen AND the agent scheduler drafts (template fallback stays). Per-platform voice,
  compliance rules in the system prompt.
- ⬜ **Reference-plate coverage.** Plates exist for hero angles/scenes; fill the gaps the render
  planner already flags (`needs_plate`): per-team colorway plates for the top teams, per-scene
  plates for the remaining scenes, wrist plates per watch. (Budgeted generation run — needs credit
  go-ahead.)
- ⬜ **Sound design pass.** 🔑 Generated music/ambience for the "music on" toggle (the film concepts
  established the mint-chime motif — reuse it as the brand sound across videos).

## P2 — Product surface (what the creator touches every day)

- ✅ **Activate the Hook slot.** The picker is enabled end-to-end; the hook renders as the opening
  beat of the prompt.
- ✅ **Dashboard sub-tabs.** Split into `Account / My videos / AI agent / Ambassador` tabs (the
  "different onglets" request) — same data, calmer surface; the AI-agent tab surfaces the MemoryAgent.
- ✅→🔨 **Video actions.** Download (proper filename, blob-fetch fallback) + copy-caption-with-mint-link
  shipped on the library cards. Remaining: one-tap platform share targets.
- ⬜ **Leaderboard v1-real.** Replace demo rows with the real points ledger ranking (weekly window,
  anti-farm: only verified-event points count); keep "Demo data" badge until then — never fake it.
- ⬜ **Studio quality-of-life.** Recent-selections memory, "duplicate & tweak" from a library card,
  generation progress with real provider status text, failure retry with one click.
- ✅ **PWA + SEO.** Manifest + on-brand icon set (192/512/maskable) + apple-touch-icon, robots +
  sitemap, and **branded per-page OG/Twitter cards** (next/og — root/studio/mint/leaderboard).

## P3 — Agents at scale (the marketing army, for real)

- ⬜ **LLM-written drafts in the scheduler** (P1 item wired into the cron path). 🔑
- ⬜ **Per-agent analytics.** Which drafts get posted, which platforms convert (join with the
  Minted index by referral code) → the agent learns the creator's best mix (start: simple weighted
  rotation by past post-rate).
- ⬜ **Auto-publish via official APIs.** 👤🔑 X API (paid tier) first — the human-in-the-loop toggle
  already models it (`autoPublish`); publishing worker + token vault + per-platform rate rules.
- ⬜ **Agent budget controls.** Per-user monthly credit budget for agent-triggered generations
  (the auto-budget idea): hard cap server-side, visible burn-down in the panel.

## P4 — Ops & confidence

- ⬜ **E2E tests (Playwright).** The five golden paths: compose→generate(demo), post→points,
  mint state render, referral capture→mint attribution, agent queue post. Run in CI.
- ✅→🔨 **CI pipeline.** GitHub Actions runs typecheck + lint + vitest + build on every frontend PR
  (`.github/workflows/frontend-ci.yml`) — **now green** (the standing `tsc` failure in
  `mint_client.test.ts` is fixed). Remaining: add E2E, block-merge-on-red, and fix the *separate*
  Python `ci.yml` (3 Windows-only path-normalization failures in `test_rwa_intelligence.py` —
  `runneradmin` vs 8.3 `RUNNER~1`; passes on Linux, out of the frontend scope).
- ⬜ **Staging environment.** A second Netlify site on `main`; production deploys from tags.
- ⬜ **Runbook.** `docs/PRODUCTION.md`: env matrix, deploy, rollback, incident basics, key rotation.
- ⬜ **Load sanity.** The conversions cache and mint-state route under burst (simple k6 script).

## Blocked on client / keys (the honest list)

| Item | Needs |
|---|---|
| Points → RWAX cash-out | 👤 RWAX token address + ABI |
| Vault/Redeem/Referral deep-links | 👤 mint-site URL (`NEXT_PUBLIC_MINT_SITE_URL`) |
| Live video generation | 🔑 `HIGGSFIELD_API_KEY` + auth/quota (P0) |
| LLM captions | 🔑 `ANTHROPIC_API_KEY` |
| Autonomous agent queue in prod | 🔑 `SUPABASE_SERVICE_ROLE_KEY` + `CRON_SECRET` (code shipped) |
| Auto-publish | 👤🔑 X/TikTok/Meta API access |
| Exact-watch plates from real photos | 👤 product photography set |

## Sequencing

1. **Now (this pass):** cinematic prompt engine v2 · Auto model routing · Hook slot · Minted
   indexer · this roadmap.
2. **Next pass (no keys needed):** points-ledger migration + server routes · withdrawal plumbing ·
   dashboard sub-tabs · leaderboard-from-ledger · E2E + CI.
3. **On keys:** LLM captions · live generation behind quota · upscale/reframe · agent LLM drafts.
4. **On Peter:** RWAX cash-out · deep-links · real-photo plates · auto-publish.
