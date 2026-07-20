import { describe, expect, it } from "vitest";
import { buildPreflightReport } from "@/lib/rwa/preflight";

describe("buildPreflightReport", () => {
  it("with no keys: not ready, template fallback noted, no live probe", () => {
    const r = buildPreflightReport({});
    expect(r.ready).toBe(false);
    expect(r.llm.provider).toBeNull();
    expect(r.llm.reachable).toBeNull();
    expect(r.notes.some((n) => n.includes("template"))).toBe(true);
  });

  it("with a DashScope key: Qwen is the active provider and the path is ready", () => {
    const r = buildPreflightReport({ DASHSCOPE_API_KEY: "sk", RWA_LLM_PROVIDER: "qwen" });
    expect(r.ready).toBe(true);
    expect(r.llm.provider).toBe("qwen");
    expect(r.llm.qwenKey).toBe(true);
  });

  it("reports resolved video model ids + endpoint, honouring overrides", () => {
    const r = buildPreflightReport({ DASHSCOPE_API_KEY: "sk", QWEN_HAPPYHORSE_I2V: "happyhorse-i2v-pro", DASHSCOPE_VIDEO_BASE_URL: "https://dashscope.aliyuncs.com" });
    expect(r.video.models.happyhorse_i2v).toBe("happyhorse-i2v-pro");
    expect(r.video.models.wan_i2v).toContain("wan");
    expect(r.video.base).toBe("https://dashscope.aliyuncs.com");
  });

  it("flags an active video provider that can't run live yet (prepared-only)", () => {
    const r = buildPreflightReport({ DASHSCOPE_API_KEY: "sk", RWA_VIDEO_PROVIDER: "qwen" });
    expect(r.video.active).toBe(true);
    expect(r.video.liveAllowed).toBe(false);
    expect(r.notes.some((n) => n.includes("prepared-only"))).toBe(true);
  });

  it("carries the live-probe result and flags a failed probe", () => {
    const ok = buildPreflightReport({ DASHSCOPE_API_KEY: "sk" }, { reachable: true, sample: "OK" });
    expect(ok.llm.reachable).toBe(true);
    expect(ok.llm.sample).toBe("OK");
    const bad = buildPreflightReport({ DASHSCOPE_API_KEY: "sk" }, { reachable: false, sample: null });
    expect(bad.notes.some((n) => n.includes("Live probe failed"))).toBe(true);
  });
});
