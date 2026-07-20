import { describe, expect, it } from "vitest";
import { qwenBase, qwenChat, qwenModel, readQwenKey } from "@/lib/rwa/qwen";
import { captionProvider } from "@/lib/rwa/llm";

describe("qwen (DashScope) adapter", () => {
  it("reads the key from either env name", () => {
    expect(readQwenKey({ DASHSCOPE_API_KEY: "sk-a" })).toBe("sk-a");
    expect(readQwenKey({ QWEN_API_KEY: "sk-b" })).toBe("sk-b");
    expect(readQwenKey({})).toBeNull();
  });
  it("base + model are overridable", () => {
    expect(qwenBase({})).toContain("dashscope");
    expect(qwenBase({ DASHSCOPE_BASE_URL: "https://x/v1/" })).toBe("https://x/v1");
    expect(qwenModel({})).toBe("qwen-max");
    expect(qwenModel({ QWEN_MODEL: "qwen-plus" })).toBe("qwen-plus");
  });
  it("returns null without a key (no call made)", async () => {
    expect(await qwenChat([{ role: "user", content: "hi" }], { env: {} })).toBeNull();
  });
  it("posts to DashScope and returns the message text", async () => {
    let sentUrl = "", sentAuth = "";
    const f = (async (url: string, init: { headers: Record<string, string>; body: string }) => {
      sentUrl = url; sentAuth = init.headers.Authorization;
      const body = JSON.parse(init.body);
      expect(body.model).toBe("qwen-max");
      return { json: async () => ({ choices: [{ message: { content: "  a caption  " } }] }) };
    }) as unknown as typeof fetch;
    const out = await qwenChat([{ role: "user", content: "write" }], { apiKey: "sk-1", fetchImpl: f, env: {} });
    expect(out).toBe("a caption");
    expect(sentUrl).toContain("/chat/completions");
    expect(sentAuth).toBe("Bearer sk-1");
  });
  it("returns null on a malformed/empty response instead of throwing", async () => {
    const f = (async () => ({ json: async () => ({}) })) as unknown as typeof fetch;
    expect(await qwenChat([{ role: "user", content: "x" }], { apiKey: "sk", fetchImpl: f, env: {} })).toBeNull();
  });
  it("returns null when the fetch itself throws (transport error, caller falls back)", async () => {
    const f = (async () => {
      throw new Error("network");
    }) as unknown as typeof fetch;
    expect(await qwenChat([{ role: "user", content: "x" }], { apiKey: "sk", fetchImpl: f, env: {} })).toBeNull();
  });
});

describe("caption provider selection", () => {
  it("prefers the explicit provider when its key is present", () => {
    expect(captionProvider({ RWA_LLM_PROVIDER: "qwen", DASHSCOPE_API_KEY: "k" })).toBe("qwen");
    expect(captionProvider({ RWA_LLM_PROVIDER: "anthropic", ANTHROPIC_API_KEY: "k" })).toBe("anthropic");
  });
  it("auto-selects by key presence (anthropic wins, then qwen)", () => {
    expect(captionProvider({ ANTHROPIC_API_KEY: "k" })).toBe("anthropic");
    expect(captionProvider({ DASHSCOPE_API_KEY: "k" })).toBe("qwen");
    expect(captionProvider({})).toBeNull();
  });
  it("returns null when the requested provider has no key", () => {
    expect(captionProvider({ RWA_LLM_PROVIDER: "qwen" })).toBeNull();
  });
});
