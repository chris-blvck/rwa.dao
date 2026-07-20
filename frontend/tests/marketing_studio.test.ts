import { describe, expect, it } from "vitest";
import { toMarketingStudioRequest } from "@/lib/rwa/marketing_studio";
import { ASSETS, BACKGROUNDS, HOOKS, PERSONAS, PRESETS } from "@/lib/rwa/catalog";

const base = {
  watch: ASSETS[0],
  persona: PERSONAS[0],
  preset: PRESETS.find((p) => p.mode === "product_showcase")!,
  background: BACKGROUNDS.find((b) => b.ms_id)!,
  hook: HOOKS.find((h) => h.ms_id)!,
};

describe("marketing studio mapping", () => {
  it("maps the studio selection to a marketing_studio_video request", () => {
    const req = toMarketingStudioRequest({ ...base, output: { resolution: "1080p", format: "9:16" } });
    expect(req.model).toBe("marketing_studio_video");
    expect(req.mode).toBe("product_showcase");
    expect(req.aspect_ratio).toBe("9:16");
    expect(req.resolution).toBe("1080p");
    expect(req.setting_id).toBe(base.background.ms_id);
    expect(req.hook_id).toBe(base.hook.ms_id);
    expect(req.generate_audio).toBe(true);
  });

  it("caps 4K down to 1080p (Marketing Studio max)", () => {
    const req = toMarketingStudioRequest({ ...base, output: { resolution: "4K", format: "9:16" } });
    expect(req.resolution).toBe("1080p");
  });

  it("omits avatar/product ids until they are created in Higgsfield", () => {
    const req = toMarketingStudioRequest({ ...base, output: { resolution: "720p", format: "9:16" } });
    expect(req.avatar_ids).toBeUndefined();
    expect(req.product_ids).toBeUndefined();
    expect(req.resolution).toBe("720p");
  });
});
