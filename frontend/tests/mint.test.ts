import { describe, expect, it } from "vitest";
import { MAX_TIME_BONUS, MINT_BASE_USD, MINT_STEP_USD, mmss, POINTS_PER_USD, pointsForMint, pointsUsd, priceAt, timeBonus, TIMER_SECONDS } from "@/lib/rwa/mint";

describe("mint economics", () => {
  it("price rises with every mint", () => {
    expect(priceAt(0)).toBe(MINT_BASE_USD);
    expect(priceAt(10)).toBe(MINT_BASE_USD + 10 * MINT_STEP_USD);
    expect(priceAt(11)).toBeGreaterThan(priceAt(10));
  });

  it("time bonus is max at full timer and zero at expiry", () => {
    expect(timeBonus(TIMER_SECONDS)).toBe(MAX_TIME_BONUS);
    expect(timeBonus(0)).toBe(0);
    expect(timeBonus(TIMER_SECONDS / 2)).toBe(Math.round(MAX_TIME_BONUS / 2));
  });

  it("points for a mint include price value plus the time bonus", () => {
    const atFull = pointsForMint(0, TIMER_SECONDS);
    const atEnd = pointsForMint(0, 0);
    expect(atEnd).toBe(MINT_BASE_USD * POINTS_PER_USD);
    expect(atFull).toBe(atEnd + MAX_TIME_BONUS);
  });

  it("converts points to USD at 1 cent per point", () => {
    expect(pointsUsd(500)).toBe(5);
    expect(pointsUsd(50_000)).toBe(500);
  });

  it("formats the countdown as m:ss", () => {
    expect(mmss(500)).toBe("8:20");
    expect(mmss(9)).toBe("0:09");
    expect(mmss(-5)).toBe("0:00");
  });
});
