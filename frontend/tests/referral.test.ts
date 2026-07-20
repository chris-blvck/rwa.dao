import { describe, expect, it } from "vitest";
import { COMMISSION_L1, COMMISSION_L2, DEMO_REFERRALS, earningsFrom, refCode, refLink } from "@/lib/rwa/referral";

describe("referral", () => {
  it("computes 10% on level 1 and 1% on level 2", () => {
    const e = earningsFrom([
      { handle: "a", level: 1, purchasesUsd: 1000, joinedDaysAgo: 1 },
      { handle: "b", level: 2, purchasesUsd: 1000, joinedDaysAgo: 1 },
    ]);
    expect(e.l1).toBeCloseTo(100, 6); // 10% of 1000
    expect(e.l2).toBeCloseTo(10, 6); // 1% of 1000
    expect(e.total).toBeCloseTo(110, 6);
    expect(e.l1Count).toBe(1);
    expect(e.l2Count).toBe(1);
  });

  it("tier rates are 10% and 1%", () => {
    expect(COMMISSION_L1).toBe(0.1);
    expect(COMMISSION_L2).toBe(0.01);
  });

  it("refCode is stable and 8 chars", () => {
    expect(refCode("0xabc")).toBe(refCode("0xabc"));
    expect(refCode("0xabc")).toHaveLength(8);
    expect(refCode("0xabc")).not.toBe(refCode("0xdef"));
  });

  it("refLink builds the shareable short link", () => {
    expect(refLink("ABCD1234")).toContain("/r/ABCD1234");
  });

  it("demo referrals produce positive earnings", () => {
    expect(earningsFrom(DEMO_REFERRALS).total).toBeGreaterThan(0);
  });
});
