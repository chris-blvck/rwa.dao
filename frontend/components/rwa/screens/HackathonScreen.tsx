"use client";

// Judge tour — Qwen Cloud Global AI Hackathon (MemoryAgent track).
//
// A self-contained, zero-key walkthrough for judges: the interactive lab below runs the REAL
// MemoryAgent functions (agent_memory.ts / autopilot.ts / llm.ts — the same unit-tested modules the
// hosted agent uses) in the browser. Click an on-chain outcome and watch the memory reinforce, the
// next batch re-rank, and the exact Qwen prompt update. Deterministic (no Math.random), no cost.

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  emptyMemory,
  memoryHint,
  memorySummary,
  rankedByMemory,
  reinforceFromPosts,
  type CreatorMemory,
} from "@/lib/rwa/agent_memory";
import { generateBatch, type ContentIdea } from "@/lib/rwa/autopilot";
import { buildCaptionPrompt } from "@/lib/rwa/llm";
import { teamById } from "@/lib/rwa/teams";

type Outcome = { label: string; usd: number; idea: Pick<ContentIdea, "platform" | "presetId" | "teamId" | "watchId"> };

// Simulated on-chain outcomes — feature keys match the real catalog so the ranked batch responds.
// In production this signal comes from indexed RwaWatchNft `Minted` events (see mint_indexer.ts).
const OUTCOMES: Outcome[] = [
  { label: "🇧🇷 TikTok · Luxury Reveal drove $800 in mints", usd: 800, idea: { platform: "TikTok", presetId: "luxury_reveal_mvp", teamId: "brazil", watchId: "watch_qr_concept_001" } },
  { label: "🇫🇷 X · Tutorial drove $250 in mints", usd: 250, idea: { platform: "X", presetId: "tutorial_mvp", teamId: "france", watchId: "diamond_luxury_visual_001" } },
  { label: "🇦🇷 Instagram · Unboxing ASMR drove $1,500 in mints", usd: 1500, idea: { platform: "Instagram", presetId: "unboxing_asmr_mvp", teamId: "argentina", watchId: "watch_qr_concept_001" } },
];

const LOOP_STEPS = [
  { t: "Memory ranks", d: "per-creator weights rank the next batch (contextual bandit)" },
  { t: "Qwen writes", d: "the captions for the ranked batch, biased by the memory hint" },
  { t: "Generate", d: "Wan / HappyHorse via DashScope (two-stage)" },
  { t: "Post", d: "one tap, with the creator's referral link" },
  { t: "On-chain mints", d: "Minted events on XDC — un-fakeable USD" },
];

export function HackathonScreen() {
  const [memory, setMemory] = useState<CreatorMemory>(() => emptyMemory("judge"));
  const [history, setHistory] = useState<string[]>([]);

  const apply = (o: Outcome) => {
    setMemory((m) => reinforceFromPosts(m, [o.idea], o.usd));
    setHistory((h) => [o.label, ...h].slice(0, 5));
  };
  const reset = () => {
    setMemory(emptyMemory("judge"));
    setHistory([]);
  };

  // The same pool→rank step the hosted scheduler runs each tick (agent_scheduler.ts). Scores come
  // from rankedByMemory so the numbers shown are the EXACT values the ordering used.
  const pool = useMemo(() => generateBatch(12, 0), []);
  const ranked = useMemo(() => rankedByMemory(memory, pool, 42).slice(0, 4), [memory, pool]);
  const hint = memoryHint(memory);
  const top = ranked[0]?.idea;
  const prompt = top
    ? buildCaptionPrompt({
        watchTitle: top.watchTitle,
        styleTitle: top.presetTitle,
        personaName: top.personaName,
        platform: top.platform,
        team: teamById(top.teamId)?.name ?? null,
        memoryHint: hint,
      })
    : "";
  const topWeights = Object.entries(memory.weights)
    .filter(([, v]) => v > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  return (
    <>
      {/* Hero */}
      <section className="fade-up mx-auto max-w-6xl px-5 pt-10 sm:px-8 sm:pt-14">
        <div className="eyebrow text-fgMuted">Qwen Cloud Global AI Hackathon · MemoryAgent track</div>
        <h1 className="mt-2 max-w-2xl text-3xl font-black tracking-tight text-fg sm:text-4xl">
          Watch the agent learn from real revenue.
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-fgSoft">
          RWA-DAO&apos;s marketing agent doesn&apos;t optimise likes — its memory is reinforced by the{" "}
          <span className="font-semibold text-fg">on-chain mints</span> each post drives, and its reasoning runs on{" "}
          <span className="font-semibold text-fg">Qwen (Alibaba Cloud)</span>. This page is a hands-on tour for judges:
          the lab below runs the agent&apos;s real, unit-tested functions in your browser — no keys, no cost.
        </p>

        {/* The loop */}
        <div role="list" className="mt-6 flex flex-wrap items-stretch gap-2" aria-label="The MemoryAgent loop">
          {LOOP_STEPS.map((s, i) => (
            <div role="listitem" key={s.t} className="flex items-center gap-2">
              <div className="rounded-2xl border border-line bg-bg2 px-3.5 py-2.5">
                <div className="text-sm font-bold text-fg">{i + 1} · {s.t}</div>
                <div className="mt-0.5 max-w-[180px] text-[11px] text-fgMuted">{s.d}</div>
              </div>
              {i < LOOP_STEPS.length - 1 ? <span aria-hidden="true" className="text-fgMuted">→</span> : <span aria-hidden="true" className="text-fgMuted">↺</span>}
            </div>
          ))}
        </div>
      </section>

      {/* Interactive lab */}
      <section className="fade-up mx-auto max-w-6xl px-5 pb-4 pt-10 sm:px-8">
        <div className="eyebrow text-fgMuted">Live lab · the real functions, in your browser</div>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-fg">Reinforce the memory, watch the next batch change</h2>
        <p className="mt-1 max-w-2xl text-sm text-fgMuted">
          Each button simulates an indexed on-chain outcome. In production this exact signal comes from the{" "}
          RwaWatchNft <code className="rounded bg-bg2 px-1">Minted</code> events our indexer scans on XDC.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {OUTCOMES.map((o) => (
            <button
              key={o.label}
              type="button"
              onClick={() => apply(o)}
              className="rounded-full border border-line2 px-3.5 py-1.5 text-sm font-semibold text-fg transition-colors hover:border-fg hover:bg-bg2"
            >
              {o.label}
            </button>
          ))}
          {/* aria-disabled (not disabled) so keyboard focus survives the click that empties the
              memory — a disabled control would drop focus to <body>. Resetting empty is a no-op. */}
          <button
            type="button"
            onClick={() => { if (memory.posts) reset(); }}
            aria-disabled={!memory.posts}
            className={[
              "rounded-full border border-line2 px-3.5 py-1.5 text-sm font-semibold transition-colors",
              memory.posts ? "text-fgMuted hover:border-fg hover:text-fg" : "cursor-default text-fgMuted opacity-40",
            ].join(" ")}
          >
            Reset memory
          </button>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {/* Memory card */}
          <div className="rounded-2xl border border-line bg-bg2 p-4">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-fg text-[11px] text-bg">✦</span>
              <span className="text-sm font-bold text-fg">Creator memory</span>
              {/* role="status" = polite live region: each click announces the new outcome count. */}
              <span role="status" className="ml-auto rounded-full border border-line2 px-2.5 py-0.5 text-[11px] font-semibold tabular-nums text-fgMuted">
                {memory.posts} reinforced outcome{memory.posts === 1 ? "" : "s"}
              </span>
            </div>
            <p className="mt-2 text-sm text-fgSoft">{memorySummary(memory)}</p>
            {topWeights.length ? (
              <div className="mt-3 space-y-1.5">
                {topWeights.map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2">
                    <span className="w-44 truncate text-[11px] font-semibold text-fgMuted">{k.replace(":", " · ")}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg3">
                      <div className="h-full rounded-full bg-fg transition-[width] duration-500" style={{ width: `${Math.min(100, (v - 1) * 120)}%` }} />
                    </div>
                    <span className="w-10 text-right text-[11px] tabular-nums text-fgMuted">{v.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-[11px] text-fgMuted">Weights appear here as outcomes land — click a button above.</p>
            )}
            {history.length ? (
              <div className="mt-3 border-t border-line pt-2 text-[11px] text-fgMuted">
                {history.map((h, i) => (
                  <div key={`${h}-${i}`}>↳ reinforced from: {h}</div>
                ))}
              </div>
            ) : null}
          </div>

          {/* Ranked batch */}
          <div className="rounded-2xl border border-line bg-bg2 p-4">
            <div className="text-sm font-bold text-fg">Next batch — ranked by memory (best first)</div>
            <p className="mt-0.5 text-[11px] text-fgMuted">
              The same pool→rank step the hosted scheduler runs each tick. Scores = learned memory + a
              deterministic exploration nudge — the exact values the ordering uses.
            </p>
            <div className="mt-3 space-y-2">
              {ranked.map(({ idea, score }, i) => (
                <div key={idea.id} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2">
                  <span className={["flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold", i === 0 ? "bg-fg text-bg" : "border border-line2 text-fgMuted"].join(" ")}>
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-fg">{idea.presetTitle} · {idea.watchTitle}</div>
                    <div className="truncate text-[11px] text-fgMuted">{idea.platform} · {teamById(idea.teamId)?.name ?? idea.teamId} · {idea.sceneTitle}</div>
                  </div>
                  <span className="shrink-0 text-[11px] tabular-nums text-fgMuted">score {score.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* The Qwen prompt */}
        <div className="mt-4 rounded-2xl border border-line bg-bg2 p-4">
          <div className="text-sm font-bold text-fg">The exact user prompt Qwen receives for the top pick</div>
          <p className="mt-0.5 text-[11px] text-fgMuted">
            Built by <code className="rounded bg-bg px-1">buildCaptionPrompt()</code> — the memory hint{hint ? "" : " (appears after the first outcome)"} steers the copy toward what this audience mints on.
            Production sends it with a short brand-safety system message (see <code className="rounded bg-bg px-1">llm.ts</code>).
          </p>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-xl bg-bg p-3 text-xs leading-relaxed text-fgSoft">{prompt}</pre>
        </div>
      </section>

      {/* Verify it yourself */}
      <section className="fade-up mx-auto max-w-6xl px-5 pb-6 pt-8 sm:px-8">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-line bg-bg2 p-4">
            <div className="text-sm font-bold text-fg">Verify the live system (one call each)</div>
            <pre className="mt-3 overflow-x-auto rounded-xl bg-bg p-3 text-xs leading-relaxed text-fgSoft">{`# Provider preflight — is the Qwen path wired? (config-only, zero cost)
curl -H "Authorization: Bearer $CRON_SECRET" \\
  $URL/api/rwa/agent/preflight

# One agent tick — reasons on Qwen, ranks by memory, indexes the chain
curl -X POST -H "Authorization: Bearer $CRON_SECRET" \\
  $URL/api/rwa/agent/run`}</pre>
            <p className="mt-2 text-[11px] text-fgMuted">Both endpoints are CRON_SECRET-guarded; the hourly scheduler calls the second one autonomously.</p>
          </div>
          <div className="rounded-2xl border border-line bg-bg2 p-4">
            <div className="text-sm font-bold text-fg">Explore the product & the code</div>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link href="/dashboard" className="font-semibold text-fg underline-offset-4 hover:underline">Dashboard → AI agent tab</Link><span className="text-fgMuted"> — the hosted agent, its memory card and one-tap posting</span></li>
              <li><Link href="/studio" className="font-semibold text-fg underline-offset-4 hover:underline">Studio</Link><span className="text-fgMuted"> — two-stage compose → animate generation</span></li>
              <li><span className="font-semibold text-fg">docs/ARCHITECTURE.md</span><span className="text-fgMuted"> — the four system diagrams</span></li>
              <li><span className="font-semibold text-fg">docs/SYSTEM_SPEC.md</span><span className="text-fgMuted"> — the full specification</span></li>
              <li><span className="font-semibold text-fg">mcp/</span><span className="text-fgMuted"> — drive these same tools from any MCP client (Claude Desktop)</span></li>
            </ul>
          </div>
        </div>

        {/* Honest status */}
        <p className="mt-4 rounded-2xl border border-line bg-bg2 p-4 text-[11px] leading-relaxed text-fgMuted">
          <span className="font-semibold text-fgSoft">Honest status:</span> this demo runs in mock mode — generation returns a prepared plan and no credits are spent.
          The Qwen reasoning path, the DashScope Wan/HappyHorse + Wanx adapters and the Alibaba Cloud deploy kit are built, unit-tested and env-gated; they activate with the
          DashScope key (<code className="rounded bg-bg px-1">/api/rwa/agent/preflight?probe=1</code> live-checks the Qwen key/auth and reports the resolved video model ids — video generation itself stays behind its own flag). On-chain reads are live against XDC Apothem right now.
        </p>
      </section>
    </>
  );
}
