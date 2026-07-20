import { describe, expect, it } from "vitest";
import { buildVideoSynthesisBody, dashscopeVideoModel, dashscopeVideoBase, normalizeResolution, normalizeVideoTask, qwenVideoActive } from "@/lib/rwa/qwen_video";

describe("qwen video (DashScope) adapter", () => {
  it("builds an image-to-video task body when an image is given (resolution uppercased for DashScope)", () => {
    const b = buildVideoSynthesisBody({ prompt: "p", imageUrl: "https://h/f.png", model: "wan2.2-i2v-flash", resolution: "1080p" }) as any;
    expect(b.model).toBe("wan2.2-i2v-flash");
    expect(b.input.prompt).toBe("p");
    expect(b.input.img_url).toBe("https://h/f.png");
    expect(b.parameters.resolution).toBe("1080P"); // DashScope rejects lowercase "1080p"
  });
  it("normalizeResolution uppercases the trailing quality letter", () => {
    expect(normalizeResolution("1080p")).toBe("1080P");
    expect(normalizeResolution(" 720p ")).toBe("720P");
    expect(normalizeResolution("1080P")).toBe("1080P");
  });
  it("omits img_url for text-to-video", () => {
    const b = buildVideoSynthesisBody({ prompt: "p", model: "wan2.2-t2v-plus" }) as any;
    expect(b.input.img_url).toBeUndefined();
  });
  it("resolves model ids per internal model, image-aware, env-overridable", () => {
    expect(dashscopeVideoModel("happyhorse", true, {})).toBe("happyhorse-1.0-i2v");
    expect(dashscopeVideoModel("wan_2", false, {})).toBe("wan2.2-t2v-plus");
    expect(dashscopeVideoModel("wan_2", true, { QWEN_VIDEO_MODEL: "custom" })).toBe("custom");
  });
  it("normalizes DashScope task states", () => {
    expect(normalizeVideoTask({ output: { task_status: "SUCCEEDED", video_url: "v", task_id: "t" } })).toEqual({ state: "succeeded", video_url: "v", taskId: "t" });
    expect(normalizeVideoTask({ output: { task_status: "RUNNING", task_id: "t" } }).state).toBe("running");
    expect(normalizeVideoTask({ output: { task_status: "FAILED" } }).state).toBe("failed");
    expect(normalizeVideoTask(null).state).toBe("unknown");
  });
  it("base is overridable; active only with provider=qwen + key", () => {
    expect(dashscopeVideoBase({})).toContain("dashscope");
    expect(qwenVideoActive({ RWA_VIDEO_PROVIDER: "qwen", DASHSCOPE_API_KEY: "k" })).toBe(true);
    expect(qwenVideoActive({ RWA_VIDEO_PROVIDER: "qwen" })).toBe(false);
    expect(qwenVideoActive({ DASHSCOPE_API_KEY: "k" })).toBe(false);
  });
});
