"use client";

import { useState } from "react";
import Image from "next/image";
import { formatEther } from "viem";
import { useStudio } from "@/lib/rwa/studio-context";

// Deep-links to the RWA-DAO vault site (Mint lives here; My Vault / Redeem / Referral are theirs).
// Set NEXT_PUBLIC_MINT_SITE_URL to their site to wire the sub-nav; otherwise fall back to the explorer.
const MINT_SITE = (process.env.NEXT_PUBLIC_MINT_SITE_URL || "").replace(/\/+$/, "");
const EXPLORER = "https://apothem.xdcscan.io/address/0xb76F7df88695447b180f9CD1c7c32A9532752a11";
const sectionHref = (path: string) => (MINT_SITE ? `${MINT_SITE}${path}` : EXPLORER);
const VAULT_WATCH = "/brand/watch-xdc.png"; // the XDC rainbow-sapphire tonneau (the vaulted piece)

const fmt = (wei: string, dp = 4) => Number(formatEther(BigInt(wei || "0"))).toLocaleString("en-US", { maximumFractionDigits: dp });

/**
 * On-chain price-per-fraction history. The contract's USD price only changes by `priceIncrementUsdt`
 * per mint, so the past/next prices are reconstructed exactly from the live values — no faked data.
 */
function ValuationChart({ priceUsdtWei, incrementWei, supply }: { priceUsdtWei: string; incrementWei: string; supply: number }) {
  const price = Number(formatEther(BigInt(priceUsdtWei || "0")));
  const inc = Number(formatEther(BigInt(incrementWei || "0")));
  const start = Math.max(0, supply - 8);
  const pts: { s: number; p: number }[] = [];
  for (let sv = start; sv <= supply + 4; sv++) pts.push({ s: sv, p: Math.max(0, price - (supply - sv) * inc) });
  const W = 320, H = 104, pad = 8;
  const ys = pts.map((x) => x.p);
  const min = Math.min(...ys), max = Math.max(...ys), span = max - min || Math.max(price, 1);
  const xy = pts.map((x, i) => [
    pad + (i / Math.max(1, pts.length - 1)) * (W - 2 * pad),
    H - pad - ((x.p - min) / span) * (H - 2 * pad),
  ] as const);
  const line = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${xy[xy.length - 1][0].toFixed(1)},${H - pad} L${xy[0][0].toFixed(1)},${H - pad} Z`;
  const curIdx = pts.findIndex((x) => x.s === supply);
  const cur = xy[curIdx >= 0 ? curIdx : xy.length - 1];
  return (
    <div className="rounded-2xl border border-line bg-bg2 p-4">
      <div className="flex items-center justify-between">
        <span className="eyebrow text-fgMuted">On-chain valuation · $/fraction</span>
        <span className="text-[11px] font-semibold text-emerald-400">
          {inc > 0 ? `+$${inc.toLocaleString("en-US", { maximumFractionDigits: 4 })} / mint` : "flat"}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 h-24 w-full overflow-visible" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="valfill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(52 211 153)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="rgb(52 211 153)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#valfill)" />
        <path d={line} fill="none" stroke="rgb(52 211 153)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <circle cx={cur[0]} cy={cur[1]} r="3.5" fill="rgb(52 211 153)" />
      </svg>
      <div className="mt-1 flex items-center justify-between text-[11px] text-fgMuted">
        <span>supply {start}</span>
        <span className="font-semibold text-fg">now ${price.toLocaleString("en-US", { maximumFractionDigits: 4 })}</span>
        <span>{supply + 4}</span>
      </div>
    </div>
  );
}

export function MintScreen() {
  const s = useStudio();
  const ms = s.mintState;
  const maxPerTx = ms ? Math.max(1, Number(ms.maxMintPerTx)) : 10;
  const [qty, setQty] = useState(1);
  const q = Math.min(maxPerTx, Math.max(1, qty));
  const totalXdc = ms ? fmt((BigInt(ms.priceXdcWei) * BigInt(q)).toString()) : "—";
  const totalUsd = ms ? fmt((BigInt(ms.priceUsdt) * BigInt(q)).toString(), 2) : "—";
  const supply = ms ? Number(ms.totalSupply) : 0;
  const threshold = ms ? Number(ms.redemptionThreshold) : 1000;

  const SECTIONS = [
    { label: "Mint", href: null as string | null },
    { label: "My Vault", href: sectionHref("/vault") },
    { label: "Redeem", href: sectionHref("/redeem") },
    { label: "Referral", href: sectionHref("/referral") },
  ];

  return (
    <section className="fade-up mx-auto max-w-6xl px-5 pb-16 pt-10 sm:px-8 sm:pt-12">
      {/* Section sub-nav (mirrors the RWA-DAO vault site: Mint · My Vault · Redeem · Referral) */}
      <div className="flex flex-wrap items-center gap-1.5">
        {SECTIONS.map((sec) =>
          sec.href === null ? (
            <span key={sec.label} className="rounded-full bg-fg px-3.5 py-1.5 text-sm font-semibold text-bg">{sec.label}</span>
          ) : (
            <a key={sec.label} href={sec.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-line2 px-3.5 py-1.5 text-sm font-semibold text-fgMuted transition-colors hover:border-fg hover:text-fg">
              {sec.label} <span aria-hidden="true" className="text-[11px]">↗</span>
            </a>
          ),
        )}
      </div>

      <div className="mt-6">
        <div className="eyebrow text-fgMuted">RWAXDC · Fractional RWA · XDC Apothem</div>
        <h2 className="mt-1 text-3xl font-black tracking-tightest text-fg sm:text-4xl">Own a fraction of a real, vaulted watch</h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-fgSoft">
          Each fraction is an ERC-721 (RWAXDC) backed by an authenticated, insured, vaulted timepiece — legally
          backed ownership. Collect {threshold.toLocaleString("en-US")} fractions to redeem the physical watch.
        </p>
        {/* Status badges (like the vault site header) */}
        <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold">
          <span className={["inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1", ms?.mintingEnabled ? "border-emerald-400/40 text-emerald-400" : "border-line2 text-fgMuted"].join(" ")}>
            <span className={["h-1.5 w-1.5 rounded-full", ms?.mintingEnabled ? "bg-emerald-400" : "bg-fgMuted"].join(" ")} /> Minting {ms ? (ms.mintingEnabled ? "on" : "paused") : "…"}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 px-2.5 py-1 text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Redemption on
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line2 px-2.5 py-1 text-fgMuted">XDC Apothem · chain 51</span>
        </div>
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_360px]">
        {/* Left: the vaulted watch + on-chain valuation + stats */}
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
            <div className="overflow-hidden rounded-2xl border border-line bg-black">
              <Image src={VAULT_WATCH} alt="The vaulted watch backing RWAXDC" width={200} height={266} className="h-auto w-full" />
            </div>
            <div className="min-w-0">
              {ms ? (
                <ValuationChart priceUsdtWei={ms.priceUsdt} incrementWei={ms.priceIncrementUsdt} supply={supply} />
              ) : (
                <div className="h-full min-h-[9rem] animate-pulse rounded-2xl border border-line bg-bg2" />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Price / fraction", value: ms ? `${fmt(ms.priceXdcWei)} XDC` : "—", sub: ms ? `$${fmt(ms.priceUsdt, 4)}` : "" },
              { label: "Total supply", value: ms ? supply.toLocaleString("en-US") : "—", sub: "fractions minted" },
              { label: "Redeem at", value: threshold.toLocaleString("en-US"), sub: "= 1 watch" },
              { label: "Max / tx", value: ms ? String(maxPerTx) : "—", sub: "per mint" },
            ].map((st) => (
              <div key={st.label} className="rounded-2xl border border-line bg-bg2 p-4">
                <div className="eyebrow text-fgMuted">{st.label}</div>
                <div className="mt-1 truncate text-xl font-bold tabular-nums text-fg">{st.value}</div>
                {st.sub ? <div className="mt-0.5 text-[11px] text-fgMuted">{st.sub}</div> : null}
              </div>
            ))}
          </div>
          <a href={ms?.explorer ?? EXPLORER} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-line2 px-3 py-1.5 text-[11px] font-semibold text-fgMuted hover:border-fg hover:text-fg">
            View contract on XDCScan (Apothem) ↗
          </a>
        </div>

        {/* Right: acquire card */}
        <div className="rounded-2xl border border-line2 bg-bg2 p-5">
          <div className="flex items-center justify-between">
            <span className="eyebrow text-fgMuted">Acquire fractions</span>
            <span className="inline-flex items-center gap-1 rounded-full border border-line2 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
              {ms?.mintingEnabled ? "● live" : "…"}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm text-fgMuted">Quantity</span>
            <span className="text-[11px] text-fgMuted">Max {maxPerTx} / tx</span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <button type="button" aria-label="Fewer" onClick={() => setQty((n) => Math.max(1, n - 1))} className="flex h-8 w-8 items-center justify-center rounded-full border border-line2 text-fgSoft hover:border-fg">−</button>
            <div className="flex-1 rounded-lg border border-line2 bg-bg py-2 text-center text-sm font-bold tabular-nums text-fg">{q}</div>
            <button type="button" aria-label="More" onClick={() => setQty((n) => Math.min(maxPerTx, n + 1))} className="flex h-8 w-8 items-center justify-center rounded-full border border-line2 text-fgSoft hover:border-fg">+</button>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
            <span className="text-sm font-semibold text-fg">Total</span>
            <div className="text-right">
              <div className="font-bold text-fg">{totalXdc} XDC</div>
              <div className="text-[11px] text-fgMuted">${totalUsd}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => s.mintFractions(q)}
            disabled={s.minting || (ms ? !ms.mintingEnabled : true)}
            className="mt-4 w-full rounded-full bg-fg px-4 py-2.5 text-sm font-semibold text-bg transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {s.minting ? "Minting…" : !s.wallet ? "Connect wallet to mint" : `Mint ${q} fraction${q > 1 ? "s" : ""}`}
          </button>
          <p className="mt-2 text-[11px] leading-relaxed text-fgMuted">
            Real on-chain mint on XDC Apothem (native XDC){ms && s.wallet ? "" : " — needs a wallet on chain 51"}.
            {" "}
            {s.referredBy
              ? `This mint credits ${s.referredBy}, who referred you.`
              : "Your creator code is attached as the referral, so mints you drive are attributed to you."}
          </p>
          <p className="mt-3 border-t border-line pt-3 text-[11px] leading-relaxed text-fgMuted">
            Redeem, your vault and the 2-tier referral program live on the RWA-DAO vault site — open a section
            above. Prices update on-chain (Supra oracle), rising with supply.
          </p>
        </div>
      </div>
    </section>
  );
}
