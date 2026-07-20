"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatEther } from "viem";
import { AmbassadorPanel } from "@/components/rwa/AmbassadorPanel";
import { AutopilotPanel } from "@/components/rwa/AutopilotPanel";
import { Button } from "@/components/ui/Button";
import { CreationCard } from "@/components/rwa/studio-ui";
import { DEMO_REFERRALS } from "@/lib/rwa/referral";
import { pointsUsd } from "@/lib/rwa/mint";
import { buildMintLink, pointsFromConversions } from "@/lib/rwa/rwa_watch_nft";
import { emptyMemory, memorySummary, reinforce } from "@/lib/rwa/agent_memory";
import { useStudio } from "@/lib/rwa/studio-context";

type Conversions = { mints: number; fractions: string; totalUsdtWei: string };
type Holdings = { fractions: string; threshold: string };
type Tab = "account" | "videos" | "agent" | "ambassador";

const TABS: { id: Tab; label: string }[] = [
  { id: "account", label: "Account" },
  { id: "videos", label: "My videos" },
  { id: "agent", label: "AI agent" },
  { id: "ambassador", label: "Ambassador" },
];

export function DashboardScreen() {
  const s = useStudio();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("account");

  // Real on-chain conversions this creator's referral code drove on Peter's mint contract.
  const [conv, setConv] = useState<Conversions | null>(null);
  const code = s.ambassadorCode;
  useEffect(() => {
    if (!code) return;
    let alive = true;
    fetch(`/api/rwa/referral/conversions?ref=${encodeURIComponent(code)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => { if (alive && typeof j?.mints === "number") setConv(j); })
      .catch(() => {});
    return () => { alive = false; };
  }, [code]);
  const mintLink = code ? buildMintLink(code) : "";
  const conversionPoints = conv ? pointsFromConversions(conv.totalUsdtWei) : 0;

  // Real on-chain holdings (fractions owned → progress to redeem a physical watch).
  const [holdings, setHoldings] = useState<Holdings | null>(null);
  const walletAddr = s.wallet?.address;
  useEffect(() => {
    if (!walletAddr) return;
    let alive = true;
    fetch(`/api/rwa/mint/holdings?address=${encodeURIComponent(walletAddr)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => { if (alive && typeof j?.fractions === "string") setHoldings(j); })
      .catch(() => {});
    return () => { alive = false; };
  }, [walletAddr]);
  const heldPct = holdings ? Math.min(100, Math.round((Number(holdings.fractions) / Math.max(1, Number(holdings.threshold))) * 100)) : 0;
  const totalPoints = (s.mounted ? s.points : 0) + conversionPoints;

  // MemoryAgent — a faithful in-UI view of the learning loop, built from what was posted this
  // session (the real pure functions). In cloud mode it mirrors the hosted agent's memory.
  const memory = useMemo(() => {
    const posted = s.autopilotBatch.filter((i) => s.postedIds.has(i.id));
    return posted.reduce((m, idea) => reinforce(m, idea, 100), emptyMemory("me"));
  }, [s.autopilotBatch, s.postedIds]);
  const memoryPrefs = Object.entries(memory.weights)
    .filter(([, v]) => v > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([k]) => k.replace(/^(\w+):/, "$1 · "));

  const stats = [
    { label: "Reward points", value: s.mounted ? totalPoints.toLocaleString("en-US") : "—", sub: s.mounted ? `≈ $${pointsUsd(totalPoints).toFixed(0)} · convert to RWAX at withdrawal` : "" },
    { label: "My videos", value: s.mounted ? String(s.creations.length) : "—", sub: s.libMode === "cloud" ? "synced to cloud" : "on this device" },
    { label: "Mints driven", value: conv ? conv.mints.toLocaleString("en-US") : (s.mounted ? "0" : "—"), sub: "on-chain, via your code" },
    { label: "Ambassador", value: s.ambassadorCode || "—", sub: s.ambassadorCode ? "10% + 1% on referrals" : "not joined yet" },
  ];

  return (
    <>
      {/* Sub-tabs */}
      <div className="fade-up mx-auto max-w-6xl px-5 pt-10 sm:px-8 sm:pt-12">
        <div className="eyebrow text-fgMuted">Dashboard</div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-pressed={tab === t.id}
              className={[
                "rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors",
                tab === t.id ? "bg-fg text-bg" : "border border-line2 text-fgMuted hover:border-fg hover:text-fg",
              ].join(" ")}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Account ─────────────────────────────────────────────────────────────────── */}
      {tab === "account" ? (
        <section className="fade-up mx-auto max-w-6xl px-5 pb-16 pt-6 sm:px-8">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map((st) => (
              <div key={st.label} className="rounded-2xl border border-line bg-bg2 p-4">
                <div className="eyebrow text-fgMuted">{st.label}</div>
                <div className="mt-1 truncate text-2xl font-bold tabular-nums text-fg">{st.value}</div>
                {st.sub ? <div className="mt-0.5 text-[11px] text-fgMuted">{st.sub}</div> : null}
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-bg2 p-4">
            <div>
              <div className="text-sm font-semibold text-fg">Your rewards · {s.mounted ? totalPoints.toLocaleString("en-US") : 0} points</div>
              <div className="mt-0.5 text-[11px] text-fgMuted">
                Earned from posts + the mints you drive. Convert to RWAX at withdrawal (RWA-DAO&apos;s audited flow).
              </div>
            </div>
            <button
              type="button"
              onClick={() => s.toast("Withdrawal to RWAX opens once RWA-DAO wires the token — your points are safe.")}
              className="rounded-full border border-line2 px-4 py-2 text-sm font-semibold text-fgSoft transition-colors hover:border-fg"
            >
              Withdraw to RWAX · soon
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-line bg-bg2 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-fg">Your RWAXDC fractions</div>
              <div className="text-sm font-bold tabular-nums text-fg">
                {holdings ? Number(holdings.fractions).toLocaleString("en-US") : "0"}
                <span className="font-normal text-fgMuted"> / {holdings ? Number(holdings.threshold).toLocaleString("en-US") : "1,000"}</span>
              </div>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-bg3">
              <div className="h-full rounded-full bg-fg transition-[width] duration-300" style={{ width: `${heldPct}%` }} />
            </div>
            <div className="mt-1 text-[11px] text-fgMuted">{heldPct}% to redeem the physical watch (on-chain, live).</div>
          </div>

          {/* On-chain conversions — real mints driven by this creator's referral code */}
          {code ? (
            <div className="mt-8">
              <div className="mb-4">
                <div className="eyebrow text-fgMuted">On-chain conversions · live</div>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-fg">Mints you drove</h2>
                <p className="mt-1 max-w-xl text-sm text-fgMuted">Real, un-fakeable: read from the RwaWatchNft contract&apos;s Minted events for your code <span className="font-semibold text-fg">{code}</span>.</p>
              </div>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                  { label: "Mints driven", value: conv ? conv.mints.toLocaleString("en-US") : "0" },
                  { label: "Fractions", value: conv ? Number(conv.fractions).toLocaleString("en-US") : "0" },
                  { label: "Volume (USD)", value: conv ? `$${Number(formatEther(BigInt(conv.totalUsdtWei || "0"))).toLocaleString("en-US", { maximumFractionDigits: 2 })}` : "$0" },
                  { label: "Points earned", value: conversionPoints.toLocaleString("en-US"), sub: "10% of volume" },
                ].map((st) => (
                  <div key={st.label} className="rounded-2xl border border-line bg-bg2 p-4">
                    <div className="eyebrow text-fgMuted">{st.label}</div>
                    <div className="mt-1 text-2xl font-black tabular-nums text-fg">{st.value}</div>
                    {"sub" in st && st.sub ? <div className="mt-0.5 text-[11px] text-fgMuted">{st.sub}</div> : null}
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-fgMuted">Points from real mint volume accrue off-chain and convert to RWAX at withdrawal (via RWA-DAO&apos;s audited flow).</p>
              {mintLink ? (
                <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-bg2 p-3">
                  <span className="eyebrow text-fgMuted">Your mint link</span>
                  <code className="truncate rounded bg-bg px-2 py-1 text-xs text-fgSoft">{mintLink}</code>
                  <Button variant="secondary" size="md" onClick={() => s.copyRefLink(mintLink)}>{s.refCopied ? "Copied" : "Copy"}</Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {/* ── My videos ───────────────────────────────────────────────────────────────── */}
      {tab === "videos" ? (
        <section className="fade-up mx-auto max-w-6xl px-5 pb-16 pt-6 sm:px-8">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight text-fg">My videos · {s.mounted ? s.creations.length : 0}</h2>
            <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-line2 px-3 py-1 text-[11px] font-semibold text-fgMuted">
              {s.libMode === "cloud" ? "☁ Synced to cloud" : "On this device"}
            </span>
          </div>
          {s.mounted && s.creations.length ? (
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {s.creations.map((c) => (
                <CreationCard key={c.id} creation={c} mintLink={mintLink || undefined} onRemove={() => s.removeCreation(c.id)} onSubmit={() => s.openSubmit(c)} />
              ))}
            </div>
          ) : (
            <p className="mt-6 rounded-2xl border border-line bg-bg2 p-6 text-sm text-fgMuted">
              No videos yet — head to the Studio to generate your first one.
            </p>
          )}
        </section>
      ) : null}

      {/* ── AI agent ────────────────────────────────────────────────────────────────── */}
      {tab === "agent" ? (
        <section className="fade-up mx-auto max-w-6xl px-5 pb-16 pt-6 sm:px-8">
          <div className="mb-5">
            <h2 className="text-2xl font-bold tracking-tight text-fg">AI took the job — now it earns for you</h2>
            <p className="mt-1 max-w-xl text-sm text-fgMuted">Activate your hosted agent — it drafts on-brand content daily (no VPS, no setup). Post in one tap, earn points — the community becomes a marketing army, powered by AI.</p>
          </div>

          {/* MemoryAgent — what the agent has learned (reinforced by the mints your content drives). */}
          <div className="mb-5 rounded-2xl border border-line bg-bg2 p-4">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-fg text-[11px] text-bg">✦</span>
              <span className="text-sm font-bold text-fg">Agent memory</span>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 px-2 py-0.5 text-[9px] font-semibold text-emerald-400">learns from your mints</span>
            </div>
            <p className="mt-2 text-sm text-fgSoft">{memorySummary(memory)}</p>
            {memoryPrefs.length ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {memoryPrefs.map((p) => (
                  <span key={p} className="rounded-full border border-line2 px-2.5 py-1 text-[11px] font-semibold text-fgMuted">{p}</span>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-[11px] text-fgMuted">Post a few drafts below — the agent reinforces what drives on-chain mints and biases your next batch toward it.</p>
            )}
          </div>

          <AutopilotPanel
            ideas={s.autopilotBatch}
            postedIds={s.postedIds}
            queueMode={s.agentQueueMode}
            onPost={s.postIdea}
            onRefresh={s.refreshBatch}
            onCreate={(idea) => { s.applyIdea(idea); router.push("/studio"); }}
            config={s.agentConfig}
            onConfig={s.setAgentConfig}
            connected={false}
          />
        </section>
      ) : null}

      {/* ── Ambassador ──────────────────────────────────────────────────────────────── */}
      {tab === "ambassador" ? (
        <section className="fade-up mx-auto max-w-6xl px-5 pb-16 pt-6 sm:px-8 sm:pb-20">
          <div className="mb-5">
            <h2 className="text-2xl font-bold tracking-tight text-fg">Refer &amp; earn — 10% + 1%</h2>
          </div>
          <AmbassadorPanel
            joined={!!s.ambassadorCode}
            code={s.ambassadorCode}
            referrals={DEMO_REFERRALS}
            onJoin={s.joinAmbassador}
            onCopy={s.copyRefLink}
            copied={s.refCopied}
          />
        </section>
      ) : null}

      {/* Submit post modal */}
      {s.submitFor ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => s.setSubmitFor(null)}>
          <div role="dialog" aria-modal="true" aria-labelledby="submit-post-title" aria-describedby="submit-post-description" className="w-full max-w-md rounded-2xl border border-line2 bg-bg p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div id="submit-post-title" className="text-lg font-bold text-fg">Submit your post</div>
            <p id="submit-post-description" className="mt-1 text-xs text-fgMuted">
              Posted your video? Paste the link — it goes into your campaign so its performance can be tracked. One submission per day.
            </p>
            <div className="mt-4">
              <div className="eyebrow text-fgMuted">Platform</div>
              <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Post platform">
                {["TikTok", "Instagram", "YouTube", "X"].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => s.setSubmitPlatform(p)}
                    aria-pressed={s.submitPlatform === p}
                    className={["rounded-full px-3 py-1 text-xs font-semibold transition-colors", s.submitPlatform === p ? "bg-fg text-bg" : "bg-bg2 text-fgSoft hover:bg-bg3"].join(" ")}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <label className="mt-4 block text-xs font-semibold text-fgMuted">
              Post link
              <input
                value={s.submitUrl}
                onChange={(e) => s.setSubmitUrl(e.target.value)}
                placeholder="https://…"
                autoFocus
                name="post-url"
                type="url"
                className="mt-1.5 w-full rounded-lg border border-line2 bg-bg px-3 py-2 text-sm font-normal text-fg focus:border-fg focus:outline-none"
              />
            </label>
            <div className="mt-5 flex items-center gap-3">
              <Button onClick={s.submitPost} disabled={s.busy === "submit"}>
                {s.busy === "submit" ? "Saving…" : "Submit"}
              </Button>
              <Button variant="secondary" size="md" onClick={() => s.setSubmitFor(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
