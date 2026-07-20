import { describe, expect, it } from "vitest";
import { emptyMemory, ideaFeatures, memorySummary, rankByMemory, rankedByMemory, reinforce, scoreIdea } from "@/lib/rwa/agent_memory";
import type { ContentIdea } from "@/lib/rwa/autopilot";

function idea(over: Partial<ContentIdea>): ContentIdea {
  return {
    id: over.id ?? "i", watchId: over.watchId ?? "w1", presetId: over.presetId ?? "unboxing",
    personaId: "m", backgroundId: "b", teamId: over.teamId ?? "france",
    watchTitle: "W", watchImage: "/x.png", presetTitle: "P", personaName: "N", sceneTitle: "S",
    platform: (over.platform ?? "TikTok") as ContentIdea["platform"], caption: "c", rewardPts: 100,
  };
}

describe("MemoryAgent core", () => {
  it("a fresh memory scores every idea equally (default weight)", () => {
    const m = emptyMemory("u1");
    expect(scoreIdea(m, idea({}))).toBe(1);
    expect(memorySummary(m)).toContain("exploring");
  });

  it("reinforcement pulls up the features that drove mints, and counts experience", () => {
    let m = emptyMemory("u1");
    const winner = idea({ platform: "TikTok", presetId: "luxury_reveal", teamId: "brazil" });
    m = reinforce(m, winner, 500); // $500 minted
    expect(m.posts).toBe(1);
    // The winner now scores higher than an unrelated idea.
    const other = idea({ platform: "X", presetId: "tutorial", teamId: "none" });
    expect(scoreIdea(m, winner)).toBeGreaterThan(scoreIdea(m, other));
    for (const k of ideaFeatures(winner)) expect(m.weights[k]).toBeGreaterThan(1);
  });

  it("bigger rewards move weights more (diminishing returns)", () => {
    const small = reinforce(emptyMemory("u"), idea({}), 10);
    const big = reinforce(emptyMemory("u"), idea({}), 5000);
    expect(scoreIdea(big, idea({}))).toBeGreaterThan(scoreIdea(small, idea({})));
  });

  it("rankedByMemory returns the exact ranking scores, non-increasing and consistent with rankByMemory", () => {
    let m = emptyMemory("u1");
    m = reinforce(m, idea({ platform: "TikTok", presetId: "luxury_reveal" }), 800);
    const candidates = [
      idea({ id: "a", platform: "X", presetId: "tutorial" }),
      idea({ id: "b", platform: "TikTok", presetId: "luxury_reveal" }),
      idea({ id: "c", platform: "Instagram", presetId: "unboxing" }),
    ];
    const scored = rankedByMemory(m, candidates, 42);
    // Displayed scores must never contradict the ordering (the judge-tour regression).
    for (let i = 1; i < scored.length; i++) expect(scored[i - 1].score).toBeGreaterThanOrEqual(scored[i].score);
    // Same ordering as the ideas-only variant (single source of truth).
    expect(rankByMemory(m, candidates, 42).map((x) => x.id)).toEqual(scored.map((x) => x.idea.id));
  });

  it("ranks candidates by learned preference, best-first, deterministically", () => {
    let m = emptyMemory("u1");
    m = reinforce(m, idea({ platform: "TikTok", presetId: "luxury_reveal" }), 800);
    const candidates = [
      idea({ id: "a", platform: "X", presetId: "tutorial" }),
      idea({ id: "b", platform: "TikTok", presetId: "luxury_reveal" }),
      idea({ id: "c", platform: "Instagram", presetId: "unboxing" }),
    ];
    const ranked = rankByMemory(m, candidates, 42);
    expect(ranked[0].id).toBe("b"); // the learned winner surfaces first
    // Deterministic: same seed → same order.
    expect(rankByMemory(m, candidates, 42).map((x) => x.id)).toEqual(ranked.map((x) => x.id));
  });

  it("summary names what it learned once there's experience", () => {
    let m = emptyMemory("u1");
    m = reinforce(m, idea({ platform: "TikTok" }), 900);
    expect(memorySummary(m)).toContain("Learned from 1 posts");
  });
});

import { reinforceFromPosts } from "@/lib/rwa/agent_memory";

describe("reinforceFromPosts", () => {
  it("credits on-chain USD to the content actually posted", () => {
    const posts = [idea({ platform: "TikTok", presetId: "luxury_reveal" }), idea({ platform: "X", presetId: "tutorial" })];
    const m = reinforceFromPosts(emptyMemory("u"), posts, 1000);
    expect(m.posts).toBe(2);
    // Both posted styles gained weight.
    expect(scoreIdea(m, posts[0])).toBeGreaterThan(1);
    expect(scoreIdea(m, posts[1])).toBeGreaterThan(1);
  });
  it("no posts → memory unchanged", () => {
    const m0 = emptyMemory("u");
    expect(reinforceFromPosts(m0, [], 500)).toBe(m0);
  });
  it("zero or negative revenue → memory unchanged (no learning without a real signal)", () => {
    const m0 = emptyMemory("u");
    expect(reinforceFromPosts(m0, [idea({}), idea({})], 0)).toBe(m0);
    expect(reinforceFromPosts(m0, [idea({})], -5)).toBe(m0);
  });
});
