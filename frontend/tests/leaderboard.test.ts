import { describe, expect, it } from "vitest";
import { compact, DEMO_LEADERBOARD, mockMetrics, rankEntries, REWARD_TIERS, scoreOf } from "@/lib/rwa/leaderboard";

describe("leaderboard", () => {
  it("ranks entries by score descending with 1-based ranks", () => {
    const ranked = rankEntries(DEMO_LEADERBOARD);
    expect(ranked).toHaveLength(DEMO_LEADERBOARD.length);
    expect(ranked[0].rank).toBe(1);
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1].score).toBeGreaterThanOrEqual(ranked[i].score);
      expect(ranked[i].rank).toBe(i + 1);
    }
  });

  it("awards the reward tiers to the top ranks and zero beyond the tiers", () => {
    const ranked = rankEntries(DEMO_LEADERBOARD);
    expect(ranked[0].reward).toBe(REWARD_TIERS[0]);
    ranked.forEach((e, i) => expect(e.reward).toBe(REWARD_TIERS[i] ?? 0));
  });

  it("scores weight likes more than raw views", () => {
    expect(scoreOf(1000, 100)).toBe(1000 + 600);
    expect(scoreOf(0, 100)).toBeGreaterThan(scoreOf(500, 0));
  });

  it("produces stable, in-range mock metrics for a seed", () => {
    const a = mockMetrics("creation-abc");
    const b = mockMetrics("creation-abc");
    expect(a).toEqual(b); // deterministic
    expect(a.views).toBeGreaterThanOrEqual(8_000);
    expect(a.likes).toBeGreaterThan(0);
    expect(a.likes).toBeLessThan(a.views);
  });

  it("formats counts compactly", () => {
    expect(compact(412_000)).toBe("412K");
    expect(compact(1_200_000)).toBe("1.2M");
    expect(compact(950)).toBe("950");
  });
});
