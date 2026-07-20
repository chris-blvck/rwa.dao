import { describe, expect, it } from "vitest";
import {
  buildImageSynthesisBody,
  dashscopeImageBase,
  dashscopeImageModel,
  normalizeImageTask,
  qwenImageActive,
  sizeForFormat,
} from "@/lib/rwa/qwen_image";

describe("qwen image (DashScope Wanx) adapter", () => {
  it("builds a reference-guided body when a ref image is given", () => {
    const b = buildImageSynthesisBody({ prompt: "p", refImageUrl: "https://h/w.png", size: "720*1280", model: "wanx2.1-t2i-turbo" }, {}) as any;
    expect(b.model).toBe("wanx2.1-t2i-turbo");
    expect(b.input.prompt).toBe("p");
    expect(b.input.ref_img).toBe("https://h/w.png");
    expect(b.parameters.size).toBe("720*1280");
    expect(b.parameters.n).toBe(1);
  });
  it("omits the ref field for prompt-only, and honours QWEN_IMAGE_REF_FIELD override", () => {
    expect((buildImageSynthesisBody({ prompt: "p", model: "m" }, {}) as any).input.ref_img).toBeUndefined();
    const b = buildImageSynthesisBody({ prompt: "p", refImageUrl: "u", model: "m" }, { QWEN_IMAGE_REF_FIELD: "base_image_url" }) as any;
    expect(b.input.base_image_url).toBe("u");
    expect(b.input.ref_img).toBeUndefined();
  });
  it("maps aspect formats to DashScope WIDTH*HEIGHT sizes", () => {
    expect(sizeForFormat("9:16")).toBe("720*1280");
    expect(sizeForFormat("1:1")).toBe("1024*1024");
    expect(sizeForFormat("16:9")).toBe("1280*720");
    expect(sizeForFormat(undefined)).toBe("720*1280");
  });
  it("model + base are overridable", () => {
    expect(dashscopeImageModel({})).toBe("wanx2.1-t2i-turbo");
    expect(dashscopeImageModel({ QWEN_IMAGE_MODEL: "wanx2.1-imageedit" })).toBe("wanx2.1-imageedit");
    expect(dashscopeImageBase({})).toContain("dashscope");
    expect(dashscopeImageBase({ DASHSCOPE_IMAGE_BASE_URL: "https://x/" })).toBe("https://x");
  });
  it("normalizes a Wanx task payload (results[0].url) + states", () => {
    expect(normalizeImageTask({ output: { task_status: "SUCCEEDED", task_id: "t", results: [{ url: "https://img/1.png" }] } })).toEqual({
      state: "succeeded",
      image_url: "https://img/1.png",
      taskId: "t",
    });
    expect(normalizeImageTask({ output: { task_status: "RUNNING", task_id: "t" } }).state).toBe("running");
    expect(normalizeImageTask({ output: { task_status: "FAILED" } }).state).toBe("failed");
    expect(normalizeImageTask(null).state).toBe("unknown");
  });
  it("active only with provider=qwen + key", () => {
    expect(qwenImageActive({ RWA_VIDEO_PROVIDER: "qwen", DASHSCOPE_API_KEY: "k" })).toBe(true);
    expect(qwenImageActive({ RWA_VIDEO_PROVIDER: "qwen" })).toBe(false);
    expect(qwenImageActive({ DASHSCOPE_API_KEY: "k" })).toBe(false);
  });
});
