import { describe, expect, it } from "vitest";
import { computeOwedRwax, DEFAULT_CAPS, type RewardEvent } from "@/lib/rwa/rewards_accounting";

describe("reward accounting (anti-farm math)", () => {
  it("weights conversions as the core reward", () => {
    const r = computeOwedRwax([{ kind: "conversion", id: "p1", amountUsd: 100 }]);
    expect(r.conversions).toBe(100 * DEFAULT_CAPS.rwaxPerUsdConversion);
    expect(r.total).toBe(r.conversions);
  });

  it("dedupes repeated events so the same action can't be paid twice", () => {
    const events: RewardEvent[] = [
      { kind: "post", id: "a" },
      { kind: "post", id: "a" },
      { kind: "post", id: "b" },
    ];
    expect(computeOwedRwax(events).posts).toBe(2 * DEFAULT_CAPS.rwaxPerPost);
  });

  it("caps clicks per day (farm-resistant)", () => {
    const clicks: RewardEvent[] = Array.from({ length: 200 }, (_, i) => ({ kind: "click", id: `c${i}` }));
    expect(computeOwedRwax(clicks).clicks).toBe(DEFAULT_CAPS.maxClicksPerDay * DEFAULT_CAPS.rwaxPerClick);
  });

  it("pays nothing for an empty set (views never count here)", () => {
    expect(computeOwedRwax([]).total).toBe(0);
  });
});
