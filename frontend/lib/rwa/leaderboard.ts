// Creator leaderboard & rewards — DEMO logic (mock metrics, no live platform APIs yet).
//
// For the client demo this makes the rewards loop tangible: creators post their generated videos,
// the best-performing posts climb the leaderboard and earn token rewards. Anti-farm: one post per
// day per creator (enforced at submission). Real metrics (TikTok/Meta APIs) and on-chain payouts
// come after scope sign-off — this module is the visual/logic placeholder.

export type LeaderEntry = {
  creator: string;
  handle: string;
  platform: string;
  views: number;
  likes: number;
  you?: boolean;
};

export type RankedEntry = LeaderEntry & { rank: number; score: number; reward: number };

// Token rewards (demo XDC) for the top posts of the period.
export const REWARD_TIERS = [250, 150, 100, 75, 50, 25];

// Seeded fictional creators so the leaderboard looks alive in a pitch (clearly demo data).
export const DEMO_LEADERBOARD: LeaderEntry[] = [
  { creator: "Luxe Léo", handle: "@luxeleo", platform: "TikTok", views: 412_000, likes: 38_200 },
  { creator: "Mia Carat", handle: "@miacarat", platform: "Instagram", views: 287_500, likes: 31_900 },
  { creator: "CryptoWrist", handle: "@cryptowrist", platform: "TikTok", views: 198_300, likes: 21_450 },
  { creator: "Noir Atelier", handle: "@noiratelier", platform: "YouTube", views: 154_900, likes: 12_700 },
  { creator: "Dior Vibes", handle: "@diorvibes", platform: "TikTok", views: 121_000, likes: 14_300 },
  { creator: "Sami Drops", handle: "@samidrops", platform: "Instagram", views: 88_400, likes: 9_100 },
  { creator: "Vault 24", handle: "@vault24", platform: "X", views: 51_200, likes: 4_300 },
];

// Engagement score: reward reach but weight active engagement (likes) much more heavily.
export function scoreOf(views: number, likes: number): number {
  return Math.round(views + likes * 6);
}

// Deterministic mock metrics from a stable seed (a creation id) — stable across renders, testable.
export function mockMetrics(seed: string): { views: number; likes: number } {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h >>>= 0;
  const views = 8_000 + (h % 340_000); // 8k–348k
  const likePct = 40 + ((h >>> 9) % 70); // 4.0%–11.0%, in per-mille
  const likes = Math.round((views * likePct) / 1000);
  return { views, likes };
}

// Rank entries by score (desc), assigning 1-based rank and the reward tier for that rank.
export function rankEntries(entries: LeaderEntry[]): RankedEntry[] {
  return entries
    .map((e) => ({ ...e, score: scoreOf(e.views, e.likes) }))
    .sort((a, b) => b.score - a.score)
    .map((e, i) => ({ ...e, rank: i + 1, reward: REWARD_TIERS[i] ?? 0 }));
}

// Compact "412.5K" / "1.2M" formatting for big counts.
export function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return String(n);
}
