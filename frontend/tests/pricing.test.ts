import { describe, expect, it } from "vitest";
import { creditsFor, etaSeconds, modelById, priceFor, VIDEO_MODELS } from "@/lib/rwa/pricing";

const seedance = modelById("seedance_2");
const mini = modelById("seedance_mini");

describe("pricing", () => {
  it("credits scale up with duration and resolution", () => {
    const short = creditsFor(seedance, "720p", 5);
    const long = creditsFor(seedance, "720p", 10);
    const hi = creditsFor(seedance, "1080p", 5);
    expect(long).toBeGreaterThan(short);
    expect(hi).toBeGreaterThan(short);
  });

  it("charges the user 2x the provider cost (treasury margin)", () => {
    const p = priceFor(seedance, "720p", 5, 0.02781);
    expect(p.genUsd).toBeCloseTo(p.apiUsd * 2, 6);
  });

  it("separates gas and includes it in the total", () => {
    const p = priceFor(seedance, "720p", 5, 0.02781);
    expect(p.gasXdc).toBeGreaterThan(0);
    expect(p.totalXdc).toBe(p.genXdc + p.gasXdc);
  });

  it("a cheaper model costs fewer XDC than the premium one", () => {
    const cheap = priceFor(mini, "720p", 5, 0.02781);
    const premium = priceFor(seedance, "720p", 5, 0.02781);
    expect(cheap.totalXdc).toBeLessThan(premium.totalXdc);
  });

  it("a higher XDC price means fewer XDC for the same USD value", () => {
    const cheapToken = priceFor(seedance, "720p", 5, 0.02);
    const dearToken = priceFor(seedance, "720p", 5, 0.05);
    expect(dearToken.genXdc).toBeLessThan(cheapToken.genXdc);
  });

  it("falls back to a sane rate when given a non-positive price", () => {
    const p = priceFor(seedance, "720p", 5, 0);
    expect(p.xdcUsd).toBeGreaterThan(0);
    expect(p.totalXdc).toBeGreaterThan(0);
  });

  it("gives an ETA of a few minutes, longer for the premium model", () => {
    expect(etaSeconds(seedance, 10)).toBeGreaterThan(etaSeconds(mini, 10));
    expect(etaSeconds(seedance, 10)).toBeGreaterThan(120);
  });

  it("exposes the expected models incl. the Alibaba ones", () => {
    const ids = VIDEO_MODELS.map((m) => m.id);
    expect(ids).toContain("happyhorse");
    expect(ids).toContain("wan_2");
    expect(ids).toContain("seedance_2");
    expect(ids).toContain("kling_3");
  });
});

import { AUTO_MODEL_ID, recommendModel, resolveModel } from "@/lib/rwa/pricing";

describe("auto model routing", () => {
  it("routes macro/ASMR styles to the max-detail model regardless of output", () => {
    expect(recommendModel("unboxing_asmr", { resolution: "720p", duration: 6 }).model.id).toBe("seedance_2");
  });
  it("routes long widescreen to the multi-shot cinematic model", () => {
    expect(recommendModel("product_showcase", { resolution: "1080p", duration: 14, format: "16:9" }).model.id).toBe("kling_3");
  });
  it("routes short 720p drafts to the fast model", () => {
    expect(recommendModel("product_showcase", { resolution: "720p", duration: 6 }).model.id).toBe("seedance_fast");
  });
  it("4K always lands on a 4K-capable model", () => {
    for (const ct of ["unboxing", "product_showcase", "worn_wrist"]) {
      const m = recommendModel(ct, { resolution: "4K", duration: 10, format: "9:16" }).model;
      expect(m.maxRes).toBe("4K");
    }
  });
  it("defaults to best quality and explains itself", () => {
    const c = recommendModel("unboxing", { resolution: "1080p", duration: 10, format: "9:16" });
    expect(c.model.id).toBe("seedance_2");
    expect(c.reason.length).toBeGreaterThan(5);
  });
  it("resolveModel passes explicit ids through and resolves auto", () => {
    expect(resolveModel("kling_3", "unboxing", { resolution: "1080p", duration: 8 }).model.id).toBe("kling_3");
    expect(resolveModel(AUTO_MODEL_ID, "unboxing_asmr", { resolution: "1080p", duration: 8 }).model.id).toBe("seedance_2");
  });
});
