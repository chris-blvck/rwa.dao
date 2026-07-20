import { describe, expect, it } from "vitest";
import { ASSETS, PERSONAS, PRESETS } from "@/lib/rwa/catalog";
import { CAPTION_PLATFORMS, captionFor } from "@/lib/rwa/captions";

const ctx = { watch: ASSETS[0], persona: PERSONAS[0], preset: PRESETS[0] };

describe("social captions", () => {
  it("interpolates the watch name into the tagline", () => {
    for (const p of CAPTION_PLATFORMS) {
      expect(captionFor(p, ctx).tagline).toContain(ASSETS[0].title);
    }
  });

  it("adds hashtags for TikTok and Instagram, none for X", () => {
    expect(captionFor("TikTok", ctx).hashtags.length).toBeGreaterThan(0);
    expect(captionFor("Instagram", ctx).hashtags.length).toBeGreaterThan(0);
    expect(captionFor("X", ctx).hashtags).toHaveLength(0);
  });

  it("X full caption carries no '#' character", () => {
    expect(captionFor("X", ctx).full.includes("#")).toBe(false);
  });

  it("is deterministic for the same selection", () => {
    expect(captionFor("TikTok", ctx).full).toBe(captionFor("TikTok", ctx).full);
  });
});
