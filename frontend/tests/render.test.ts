import { describe, expect, it } from "vitest";
import { buildRenderPlan, renderModeFor } from "@/lib/rwa/render";
import { ASSETS, BACKGROUNDS, HOOKS, MUSIC, PERSONAS, PRESETS } from "@/lib/rwa/catalog";
import { teamById } from "@/lib/rwa/teams";

const base = {
  watch: ASSETS[0],
  persona: PERSONAS[0],
  background: BACKGROUNDS[0],
  hook: HOOKS[0],
  music: MUSIC[0],
  team: teamById("none"),
  output: { format: "9:16", resolution: "1080p", duration: 8, model: "seedance_2" } as const,
};

const productPreset = PRESETS.find((p) => (p.render_mode ?? "product") === "product")!;
const avatarPreset = PRESETS.find((p) => p.render_mode === "avatar")!;

describe("render routing", () => {
  it("product styles → Seedance image-to-video with the exact watch as start frame, no avatar", () => {
    const plan = buildRenderPlan({ ...base, preset: productPreset });
    expect(plan.mode).toBe("product");
    expect(plan.provider).toBe("seedance");
    expect(plan.use_avatar).toBe(false);
    // Start frame is the best reference plate (here the default showroom has a real in-scene plate).
    expect(plan.start_image).toBe(plan.product_image);
    expect(plan.start_image).toContain("/brand/");
    expect(plan.reference_kind).toBe("scene");
    expect(plan.prompt.toLowerCase()).toContain("identical to the reference");
  });

  it("avatar styles → Marketing Studio with an avatar, silent by default", () => {
    const plan = buildRenderPlan({ ...base, preset: avatarPreset });
    expect(plan.mode).toBe("avatar");
    expect(plan.provider).toBe("marketing_studio");
    expect(plan.use_avatar).toBe(true);
    expect(plan.voice).toBe(false);
    expect(plan.prompt.toLowerCase()).toContain("no dialogue");
  });

  it("carries the user's parameters into the plan", () => {
    const plan = buildRenderPlan({ ...base, preset: productPreset, output: { ...base.output, resolution: "4K", duration: 12, model: "kling_3" } });
    expect(plan.resolution).toBe("4K");
    expect(plan.duration).toBe(12);
    expect(plan.aspect_ratio).toBe("9:16");
  });

  it("renderModeFor defaults to product", () => {
    expect(renderModeFor(productPreset)).toBe("product");
    expect(renderModeFor(avatarPreset)).toBe("avatar");
  });
});
