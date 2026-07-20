"use client";

import { Leaderboard } from "@/components/rwa/Leaderboard";
import { useStudio } from "@/lib/rwa/studio-context";

export function LeaderboardScreen() {
  const s = useStudio();
  return (
    <section className="fade-up mx-auto max-w-6xl px-5 pb-16 pt-12 sm:px-8 sm:pb-20">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="eyebrow text-fgMuted">Creator rewards</div>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-fg">Leaderboard</h2>
          <p className="mt-1 max-w-xl text-sm text-fgMuted">
            Post your videos, climb the ranks, earn tokens. The top posts each period are rewarded in XDC — one submission per creator per day to keep it fair.
          </p>
        </div>
        <span className="rounded-full border border-line2 px-3 py-1 text-[11px] font-semibold text-fgMuted">Demo data</span>
      </div>
      <div className="mt-6">
        <Leaderboard entries={s.leaderboard} />
      </div>
    </section>
  );
}
