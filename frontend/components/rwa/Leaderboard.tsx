"use client";

import { compact, type RankedEntry } from "@/lib/rwa/leaderboard";

function RankBadge({ rank }: { rank: number }) {
  const medal =
    rank === 1 ? "bg-amber-300/20 text-amber-200 border-amber-300/40"
    : rank === 2 ? "bg-zinc-300/15 text-zinc-200 border-zinc-300/30"
    : rank === 3 ? "bg-orange-400/15 text-orange-200 border-orange-400/30"
    : "bg-bg2 text-fgMuted border-line2";
  return (
    <span className={["flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold", medal].join(" ")}>
      {rank}
    </span>
  );
}

export function Leaderboard({ entries }: { entries: RankedEntry[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-bg">
      <div className="grid grid-cols-[2.25rem_1fr_5.5rem_5.5rem] items-center gap-3 border-b border-line px-4 py-2.5 sm:grid-cols-[2.25rem_1fr_7rem_7rem]">
        <span className="eyebrow text-fgMuted">#</span>
        <span className="eyebrow text-fgMuted">Creator</span>
        <span className="eyebrow text-right text-fgMuted">Engagement</span>
        <span className="eyebrow text-right text-fgMuted">Reward</span>
      </div>
      {entries.map((e) => (
        <div
          key={`${e.handle}-${e.rank}`}
          className={[
            "grid grid-cols-[2.25rem_1fr_5.5rem_5.5rem] items-center gap-3 border-b border-line px-4 py-3 last:border-0 sm:grid-cols-[2.25rem_1fr_7rem_7rem]",
            e.you ? "bg-bg2" : "",
          ].join(" ")}
        >
          <RankBadge rank={e.rank} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold text-fg">{e.creator}</span>
              {e.you ? <span className="rounded-full bg-fg px-1.5 py-0.5 text-[10px] font-bold text-bg">You</span> : null}
            </div>
            <div className="truncate text-xs text-fgMuted">{e.handle} · {e.platform}</div>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold tabular-nums text-fg">{compact(e.views)}</div>
            <div className="text-[11px] tabular-nums text-fgMuted">{compact(e.likes)} likes</div>
          </div>
          <div className="text-right">
            {e.reward > 0 ? (
              <span className="text-sm font-bold tabular-nums text-fg">◆ {e.reward}</span>
            ) : (
              <span className="text-sm text-fgMuted">—</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
