"use client";

import { type Kpi, sparkPath } from "@/lib/rwa/analytics";
import { compact } from "@/lib/rwa/leaderboard";

const fmtVal = (k: Kpi) => (k.fmt === "usd" ? `$${compact(k.value)}` : compact(k.value));

export function CompetitionPanel({ kpis }: { kpis: Kpi[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {kpis.map((k) => (
        <div key={k.key} className="rounded-2xl border border-line bg-bg p-4">
          <div className="eyebrow text-fgMuted">{k.label}</div>
          <div className="mt-1 text-2xl font-black tabular-nums text-fg">{fmtVal(k)}</div>
          <div className="mt-0.5 text-[11px] font-semibold text-emerald-400">▲ {k.deltaPct}% this week</div>
          <svg viewBox="0 0 100 28" className="mt-2 h-7 w-full text-fg/70" preserveAspectRatio="none" aria-hidden="true">
            <path d={sparkPath(k.trend)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      ))}
    </div>
  );
}
