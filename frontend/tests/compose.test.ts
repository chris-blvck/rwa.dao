import { describe, expect, it } from "vitest";
import { buildComposePrompt } from "@/lib/rwa/compose";
import { pollCompose } from "@/lib/rwa/compose_client";
import { buildComposeImageBody, imageTargetFor, normalizeImageStatus, pickImageUrl } from "@/lib/rwa/higgsfield";
import { ASSETS, BACKGROUNDS, PRESETS } from "@/lib/rwa/catalog";
import { teamById } from "@/lib/rwa/teams";

const base = { watch: ASSETS[0], preset: PRESETS[0], background: BACKGROUNDS[0] };

describe("compose prompt (stage 1)", () => {
  it("composes the watch's materials + scene + fidelity into a still prompt", () => {
    const p = buildComposePrompt({ ...base, format: "9:16" });
    expect(p).toContain("The watch:");
    expect(p).toContain("black diamond");
    expect(p).toContain("Setting:");
    expect(p).toContain("Reproduce the watch identically");
    expect(p).toContain("Vertical composition");
  });
  it("adds a team colourway when a team is selected", () => {
    const p = buildComposePrompt({ ...base, team: teamById("france"), format: "1:1" });
    expect(p).toContain("France national colours");
    expect(p).toContain("Square composition");
  });
  it("omits the team line for no team", () => {
    const p = buildComposePrompt({ ...base, team: teamById("none") });
    expect(p).not.toContain("national colours");
  });
});

describe("compose image adapter", () => {
  it("keeps the reference image as input_images (image-to-image → exact watch)", () => {
    const body = buildComposeImageBody({ prompt: "x", referenceImageUrl: "https://h/w.png", aspectRatio: "9:16", seed: 5 }, "soul");
    expect(body.input_images).toEqual([{ type: "image_url", image_url: "https://h/w.png" }]);
    expect(body.model).toBe("soul");
    expect(body.seed).toBe(5);
  });
  it("target endpoint/model are env-overridable", () => {
    expect(imageTargetFor({}).endpoint).toBe("/v1/text2image/soul");
    expect(imageTargetFor({ HIGGSFIELD_IMAGE_ENDPOINT: "/v2/img", HIGGSFIELD_IMAGE_MODEL: "m2" })).toEqual({ endpoint: "/v2/img", model: "m2" });
  });
  it("picks an image url from several payload shapes", () => {
    expect(pickImageUrl({ image: { url: "a" } })).toBe("a");
    expect(pickImageUrl({ images: [{ url: "b" }] })).toBe("b");
    expect(pickImageUrl({ results: { url: "c" } })).toBe("c");
    expect(pickImageUrl({})).toBeNull();
  });
  it("normalizes status state", () => {
    expect(normalizeImageStatus({ status: "completed", image: { url: "x" } })).toMatchObject({ state: "completed", image_url: "x" });
    expect(normalizeImageStatus(null).state).toBe("unknown");
  });
});

describe("pollCompose", () => {
  const opts = (fetchImpl: typeof fetch) => ({ fetchImpl, sleep: async () => {}, intervalMs: 1, timeoutMs: 1000, now: () => 0 });
  it("resolves the image url when ready", async () => {
    const f = (async () => ({ json: async () => ({ state: "completed", image_url: "https://h/frame.png" }) })) as unknown as typeof fetch;
    expect(await pollCompose("/p", opts(f))).toEqual({ image_url: "https://h/frame.png", failed: false, state: "completed" });
  });
  it("fails on a failed job", async () => {
    const f = (async () => ({ json: async () => ({ state: "failed" }) })) as unknown as typeof fetch;
    const r = await pollCompose("/p", opts(f));
    expect(r.failed).toBe(true);
    expect(r.image_url).toBeNull();
  });
});
