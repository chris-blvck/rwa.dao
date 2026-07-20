"use client";

import { COMMISSION_L1, COMMISSION_L2, earningsFrom, type Referral, refLink } from "@/lib/rwa/referral";

const usd = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

export function AmbassadorPanel({
  joined,
  code,
  referrals,
  onJoin,
  onCopy,
  copied,
}: {
  joined: boolean;
  code: string;
  referrals: Referral[];
  onJoin: () => void;
  onCopy: (link: string) => void;
  copied: boolean;
}) {
  if (!joined) {
    return (
      <div className="rounded-2xl border border-line bg-bg2 p-6">
        <div className="grid items-center gap-6 sm:grid-cols-[1fr_auto]">
          <div>
            <div className="text-lg font-bold text-fg">Earn with RWA-DAO — become an ambassador</div>
            <p className="mt-1 max-w-xl text-sm text-fgMuted">
              Share your link. Earn <span className="font-semibold text-fg">10%</span> of everything your referrals buy,
              plus <span className="font-semibold text-fg">1%</span> of what their referrals buy. Paid in token.
            </p>
          </div>
          <button
            type="button"
            onClick={onJoin}
            className="rounded-full bg-fg px-5 py-2.5 text-sm font-semibold text-bg transition-opacity hover:opacity-90"
          >
            Get my referral link
          </button>
        </div>
      </div>
    );
  }

  const e = earningsFrom(referrals);
  const link = refLink(code);
  return (
    <div className="rounded-2xl border border-line bg-bg p-6">
      {/* Share link */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <div className="eyebrow text-fgMuted">Your referral link</div>
          <div className="mt-1 truncate rounded-lg border border-line2 bg-bg2 px-3 py-2 font-mono text-sm text-fg">{link}</div>
        </div>
        <button
          type="button"
          onClick={() => onCopy(link)}
          className="shrink-0 rounded-full bg-fg px-4 py-2 text-sm font-semibold text-bg transition-opacity hover:opacity-90"
        >
          {copied ? "Copied ✓" : "Copy link"}
        </button>
      </div>

      {/* Earnings — illustrative: real ambassador earnings come from the on-chain "Mints you drove"
          section above (Peter's Minted events); this block previews how the 10%/1% tiers look. */}
      <div className="mt-6 mb-2 flex items-center gap-2">
        <span className="eyebrow text-fgMuted">Earnings preview</span>
        <span className="inline-flex items-center gap-1 rounded-full border border-line2 px-2 py-0.5 text-[10px] font-semibold text-fgMuted">Sample data</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          ["Level 1 · 10%", usd(e.l1), `${e.l1Count} referrals`],
          ["Level 2 · 1%", usd(e.l2), `${e.l2Count} referrals`],
          ["Total earned", usd(e.total), "in token (demo)"],
        ].map(([k, v, sub], i) => (
          <div key={k} className={["rounded-xl border border-line p-3", i === 2 ? "bg-bg2" : ""].join(" ")}>
            <div className="eyebrow text-fgMuted">{k}</div>
            <div className="mt-1 text-xl font-bold tabular-nums text-fg">{v}</div>
            <div className="text-[11px] text-fgMuted">{sub}</div>
          </div>
        ))}
      </div>

      {/* Referrals table */}
      <div className="mt-5 overflow-hidden rounded-xl border border-line">
        <div className="grid grid-cols-[1fr_4rem_5.5rem_5.5rem] gap-2 border-b border-line px-3 py-2">
          <span className="eyebrow text-fgMuted">Referral</span>
          <span className="eyebrow text-fgMuted">Tier</span>
          <span className="eyebrow text-right text-fgMuted">Bought</span>
          <span className="eyebrow text-right text-fgMuted">You earn</span>
        </div>
        {referrals.map((r) => (
          <div key={r.handle} className="grid grid-cols-[1fr_4rem_5.5rem_5.5rem] items-center gap-2 border-b border-line px-3 py-2.5 last:border-0">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-fg">{r.handle}</div>
              <div className="text-[11px] text-fgMuted">{r.joinedDaysAgo}d ago</div>
            </div>
            <span className={["w-fit rounded-full px-2 py-0.5 text-[10px] font-bold", r.level === 1 ? "bg-fg text-bg" : "bg-bg2 text-fgSoft"].join(" ")}>L{r.level}</span>
            <span className="text-right text-sm tabular-nums text-fg">{usd(r.purchasesUsd)}</span>
            <span className="text-right text-sm font-semibold tabular-nums text-fg">
              {usd(r.purchasesUsd * (r.level === 1 ? COMMISSION_L1 : COMMISSION_L2))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
