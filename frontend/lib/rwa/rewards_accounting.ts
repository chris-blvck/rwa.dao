// Reward accounting — the farm-resistant math behind what the oracle is willing to sign.
//
// Rewards are weighted toward what's PROVABLE and hard to game:
//   • conversions (on-chain purchases via a referral link) → the core, can't be faked
//   • clicks (our own redirect) → small, deduped + capped/day
//   • posts (submitted) → a flat reward
//   • views/watch-minutes → NOT here (leaderboard bonus only; paying on raw views = farmable)
// Pure + deterministic so it's unit-tested; the voucher route feeds it verified events (from
// Supabase in prod) and signs a voucher for the resulting amount.

export type RewardEvent =
  | { kind: "conversion"; id: string; amountUsd: number }
  | { kind: "click"; id: string }
  | { kind: "post"; id: string };

export type AccountingCaps = {
  rwaxPerUsdConversion: number;
  rwaxPerClick: number;
  maxClicksPerDay: number;
  rwaxPerPost: number;
};

export const DEFAULT_CAPS: AccountingCaps = {
  rwaxPerUsdConversion: 10,
  rwaxPerClick: 1,
  maxClicksPerDay: 50,
  rwaxPerPost: 500,
};

export type OwedBreakdown = { conversions: number; clicks: number; posts: number; total: number };

/** Compute owed RWAX from verified events. Dedupes by kind:id and caps clicks/day (anti-farm). */
export function computeOwedRwax(events: RewardEvent[], caps: AccountingCaps = DEFAULT_CAPS): OwedBreakdown {
  const seen = new Set<string>();
  let convUsd = 0;
  let clickCount = 0;
  let postCount = 0;
  for (const e of events) {
    const key = `${e.kind}:${e.id}`;
    if (seen.has(key)) continue; // one payout per unique event
    seen.add(key);
    if (e.kind === "conversion") convUsd += Math.max(0, e.amountUsd);
    else if (e.kind === "click") clickCount++;
    else if (e.kind === "post") postCount++;
  }
  const conversions = Math.round(convUsd * caps.rwaxPerUsdConversion);
  const clicks = Math.min(clickCount, caps.maxClicksPerDay) * caps.rwaxPerClick;
  const posts = postCount * caps.rwaxPerPost;
  return { conversions, clicks, posts, total: conversions + clicks + posts };
}
