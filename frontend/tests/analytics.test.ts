import { describe, expect, it } from "vitest";
import { DEMO_KPIS, sparkPath } from "@/lib/rwa/analytics";

describe("analytics", () => {
  it("exposes the four competition KPIs", () => {
    expect(DEMO_KPIS.map((k) => k.key)).toEqual(["signups", "views", "minutes", "revenue"]);
    for (const k of DEMO_KPIS) {
      expect(k.value).toBeGreaterThan(0);
      expect(k.trend.length).toBe(7);
    }
  });

  it("sparkPath starts with a move command and stays within the box", () => {
    const p = sparkPath([1, 5, 3, 8], 100, 28);
    expect(p.startsWith("M")).toBe(true);
    const ys = [...p.matchAll(/[ML]([\d.]+),([\d.]+)/g)].map((m) => Number(m[2]));
    for (const y of ys) {
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(28);
    }
  });

  it("handles a single point and empty input", () => {
    expect(sparkPath([5])).toContain("M");
    expect(sparkPath([])).toBe("");
  });
});
