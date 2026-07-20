import { describe, expect, it } from "vitest";
import {
  absoluteImageUrl,
  authHeader,
  baseUrl,
  buildImage2VideoBody,
  buildMarketingStudioBody,
  HIGGSFIELD_BASE_DEFAULT,
  i2vTargetFor,
  isPubliclyFetchable,
  msEndpoint,
  normalizeStatus,
  readHiggsfieldCreds,
} from "@/lib/rwa/higgsfield";

describe("higgsfield credentials", () => {
  it("reads separate id/secret env vars", () => {
    const c = readHiggsfieldCreds({ HIGGSFIELD_KEY_ID: "id1", HIGGSFIELD_KEY_SECRET: "sec1" });
    expect(c).toEqual({ keyId: "id1", keySecret: "sec1" });
  });

  it("parses the combined KEY_ID:KEY_SECRET form", () => {
    expect(readHiggsfieldCreds({ HIGGSFIELD_API_KEY: "abc:def" })).toEqual({ keyId: "abc", keySecret: "def" });
    expect(readHiggsfieldCreds({ HF_CREDENTIALS: "kid:ks:extra" })).toEqual({ keyId: "kid", keySecret: "ks:extra" });
  });

  it("returns null when nothing usable is set (stays in mock mode)", () => {
    expect(readHiggsfieldCreds({})).toBeNull();
    expect(readHiggsfieldCreds({ HIGGSFIELD_API_KEY: "nocolon" })).toBeNull();
  });

  it("builds the Authorization header in the documented format", () => {
    expect(authHeader({ keyId: "id", keySecret: "sec" })).toBe("Key id:sec");
  });
});

describe("higgsfield base url", () => {
  it("defaults to the platform host and is env-overridable", () => {
    expect(baseUrl({})).toBe(HIGGSFIELD_BASE_DEFAULT);
    expect(baseUrl({ HIGGSFIELD_BASE_URL: "https://example.com/" })).toBe("https://example.com");
  });
});

describe("image url resolution", () => {
  it("makes a relative path absolute against the origin", () => {
    expect(absoluteImageUrl("/brand/watch-encrypto.png", "https://rwadao.netlify.app/")).toBe(
      "https://rwadao.netlify.app/brand/watch-encrypto.png",
    );
  });

  it("leaves an already-absolute url untouched", () => {
    expect(absoluteImageUrl("https://cdn/x.png", "https://site")).toBe("https://cdn/x.png");
  });

  it("flags localhost / private origins as not publicly fetchable", () => {
    expect(isPubliclyFetchable("https://rwadao.netlify.app/x.png")).toBe(true);
    expect(isPubliclyFetchable("http://localhost:3000/x.png")).toBe(false);
    expect(isPubliclyFetchable("http://127.0.0.1/x.png")).toBe(false);
  });
});

describe("image-to-video target mapping", () => {
  it("defaults to the DOP endpoint, turbo for fast/mini tiers", () => {
    expect(i2vTargetFor("seedance_2", {})).toEqual({ endpoint: "/v1/image2video/dop", model: "dop" });
    expect(i2vTargetFor("seedance_fast", {})).toEqual({ endpoint: "/v1/image2video/dop", model: "dop-turbo" });
    expect(i2vTargetFor("seedance_mini", {})).toEqual({ endpoint: "/v1/image2video/dop", model: "dop-turbo" });
  });

  it("is fully env-overridable (repoint the provider without code changes)", () => {
    expect(
      i2vTargetFor("seedance_2", { HIGGSFIELD_I2V_ENDPOINT: "/v1/image2video/seedance", HIGGSFIELD_I2V_MODEL: "seedance-2" }),
    ).toEqual({ endpoint: "/v1/image2video/seedance", model: "seedance-2" });
  });
});

describe("request body", () => {
  it("emits the documented core fields", () => {
    const body = buildImage2VideoBody({ prompt: "cinematic", imageUrl: "https://x/y.png", model: "dop" });
    expect(body).toEqual({
      model: "dop",
      prompt: "cinematic",
      input_images: [{ type: "image_url", image_url: "https://x/y.png" }],
    });
  });

  it("includes a seed only when provided", () => {
    const body = buildImage2VideoBody({ prompt: "p", imageUrl: "u", model: "dop", seed: 42 });
    expect(body.seed).toBe(42);
  });
});

describe("marketing studio (avatar) adapter", () => {
  it("returns null endpoint until explicitly configured (no fabricated path)", () => {
    expect(msEndpoint({})).toBeNull();
    expect(msEndpoint({ HIGGSFIELD_MS_ENDPOINT: "/v1/marketing_studio/video" })).toBe("/v1/marketing_studio/video");
  });

  it("builds the body with avatar + optional product/setting/hook", () => {
    const body = buildMarketingStudioBody({
      prompt: "present the watch",
      avatarId: "av1",
      productId: "prod1",
      settingId: "set1",
      hookId: "hook1",
      resolution: "1080p",
      aspectRatio: "9:16",
      generateAudio: false,
    });
    expect(body).toMatchObject({
      model: "marketing_studio_video",
      prompt: "present the watch",
      avatar_ids: ["av1"],
      product_ids: ["prod1"],
      setting_id: "set1",
      hook_id: "hook1",
      resolution: "1080p",
      aspect_ratio: "9:16",
      generate_audio: false,
    });
  });

  it("omits optional ids when absent", () => {
    const body = buildMarketingStudioBody({ prompt: "p", avatarId: "av1" });
    expect(body).not.toHaveProperty("product_ids");
    expect(body).not.toHaveProperty("setting_id");
    expect(body).not.toHaveProperty("hook_id");
  });
});

describe("status normalization", () => {
  it("reads video.url on completion", () => {
    const s = normalizeStatus({ status: "completed", video: { url: "https://v/out.mp4" } });
    expect(s.state).toBe("completed");
    expect(s.video_url).toBe("https://v/out.mp4");
  });

  it("reads the SDK jobs[0].results.raw.url shape", () => {
    const s = normalizeStatus({ status: "completed", jobs: [{ results: { raw: { url: "https://v/j.mp4" } } }] });
    expect(s.video_url).toBe("https://v/j.mp4");
  });

  it("normalizes in-progress and failed states with no url", () => {
    expect(normalizeStatus({ status: "in_progress" })).toMatchObject({ state: "in_progress", video_url: null });
    expect(normalizeStatus({ status: "failed" })).toMatchObject({ state: "failed", video_url: null });
  });

  it("maps unknown / malformed payloads to 'unknown'", () => {
    expect(normalizeStatus(null).state).toBe("unknown");
    expect(normalizeStatus({ status: "weird" }).state).toBe("unknown");
  });
});
