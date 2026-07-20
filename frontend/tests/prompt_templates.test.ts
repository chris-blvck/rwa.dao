import { describe, expect, it } from "vitest";
import { buildPrompt, PROMPT_TEMPLATES, STYLE_BIBLE } from "@/lib/rwa/prompt_templates";
import { ASSETS, BACKGROUNDS, HOOKS, MUSIC, PERSONAS, PRESETS } from "@/lib/rwa/catalog";

const base = {
  watch: ASSETS[0],
  persona: PERSONAS[0],
  preset: PRESETS[0],
  background: BACKGROUNDS[0],
  hook: HOOKS[0],
};

describe("prompt templates", () => {
  it("has a template for every preset concept_type", () => {
    for (const p of PRESETS) {
      expect(PROMPT_TEMPLATES[p.concept_type], `missing template for ${p.concept_type}`).toBeTruthy();
    }
  });

  it("builds a prompt that includes the shared bible and the watch", () => {
    const prompt = buildPrompt({ ...base, output: { format: "9:16", duration: 12 } });
    expect(prompt).toContain(STYLE_BIBLE);
    expect(prompt).toContain(base.watch.title);
    expect(prompt).toContain("12s");
  });

  it("leaves no unfilled placeholders and no doubled whitespace", () => {
    for (const preset of PRESETS) {
      const prompt = buildPrompt({ ...base, preset, music: MUSIC[1], hook: HOOKS[1], output: { format: "9:16", duration: 8 } });
      expect(prompt).not.toMatch(/\{[a-zA-Z]+\}/); // every placeholder resolved
      expect(prompt).not.toMatch(/ {2,}/); // whitespace collapsed
    }
  });

  it("reflects the no-music choice", () => {
    const prompt = buildPrompt({ ...base, music: MUSIC[0] });
    expect(prompt).toContain("No background music");
  });
});

describe("cinematic prompt engine v2", () => {
  it("stages beats by duration: one move short, three beats long", () => {
    const short = buildPrompt({ ...base, output: { format: "9:16", duration: 6 } });
    const long = buildPrompt({ ...base, output: { format: "9:16", duration: 15 } });
    expect(short).toContain("Single continuous camera move");
    expect(long).toContain("Three beats");
  });
  it("adapts composition to the format", () => {
    const vertical = buildPrompt({ ...base, output: { format: "9:16", duration: 10 } });
    const wide = buildPrompt({ ...base, output: { format: "16:9", duration: 10 } });
    expect(vertical).toContain("Vertical composition");
    expect(wide).toContain("Widescreen cinematic composition");
  });
  it("always ends on a clean hero frame", () => {
    const p = buildPrompt({ ...base, output: { format: "1:1", duration: 8 } });
    expect(p).toContain("thumbnail-ready");
  });
});

describe("prompt intelligence v2.1", () => {
  it("weaves the watch's named materials into the prompt", () => {
    const p = buildPrompt({ ...base, output: { format: "9:16", duration: 10 } });
    expect(p).toContain("Materials:");
    expect(p).toContain("black diamond");
  });
  it("a selected hook becomes the opening beat, not a vague mention", () => {
    const withHook = buildPrompt({ ...base, hook: HOOKS[1], output: { format: "9:16", duration: 15 } });
    expect(withHook).toContain("(1) the watch glides into frame");
  });
  it("no hook falls back to the style's own opening beat", () => {
    const noHook = buildPrompt({ ...base, output: { format: "9:16", duration: 15 } });
    expect(noHook).not.toContain("glides into frame");
  });
});
