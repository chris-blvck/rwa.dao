import { describe, expect, it, vi } from "vitest";
import { buildCaptionPrompt, llmCaption } from "@/lib/rwa/llm";

describe("llm caption", () => {
  it("builds a prompt with the watch, platform and team", () => {
    const p = buildCaptionPrompt({ watchTitle: "Encrypto", styleTitle: "Luxury Reveal", personaName: "Ava", platform: "TikTok", team: "france" });
    expect(p).toContain("Encrypto");
    expect(p).toContain("TikTok");
    expect(p).toContain("france");
    expect(p).toContain("relevant hashtags");
  });

  it("switches to 'no hashtags' for X", () => {
    expect(buildCaptionPrompt({ watchTitle: "W", styleTitle: "S", personaName: "P", platform: "X" })).toContain("no hashtags");
  });

  it("weaves the memory hint in when present, omits it otherwise", () => {
    const withHint = buildCaptionPrompt({ watchTitle: "W", styleTitle: "S", personaName: "P", platform: "TikTok", memoryHint: "TikTok, luxury_reveal, brazil" });
    expect(withHint).toContain("responds best to TikTok, luxury_reveal, brazil");
    const without = buildCaptionPrompt({ watchTitle: "W", styleTitle: "S", personaName: "P", platform: "TikTok" });
    expect(without).not.toContain("responds best to");
    // A blank hint is treated as absent (no dangling clause).
    expect(buildCaptionPrompt({ watchTitle: "W", styleTitle: "S", personaName: "P", platform: "TikTok", memoryHint: "  " })).not.toContain("responds best to");
  });

  it("returns null when no API key (no cost, caller falls back to template)", async () => {
    const f = vi.fn();
    const r = await llmCaption({ watchTitle: "W", styleTitle: "S", personaName: "P", platform: "TikTok" }, { fetchImpl: f as unknown as typeof fetch });
    expect(r).toBeNull();
    expect(f).not.toHaveBeenCalled();
  });

  it("returns the trimmed caption when the API responds", async () => {
    const f = (async () => ({ json: async () => ({ content: [{ text: "  Iced out. ⌚️  " }] }) }) as Response) as unknown as typeof fetch;
    const r = await llmCaption({ watchTitle: "W", styleTitle: "S", personaName: "P", platform: "TikTok" }, { apiKey: "sk-test", fetchImpl: f });
    expect(r).toBe("Iced out. ⌚️");
  });
});
