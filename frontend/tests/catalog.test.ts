import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ASSETS, BACKGROUNDS, DEFAULT_SELECTION, PERSONAS, PRESETS } from "@/lib/rwa/catalog";

describe("selection catalog", () => {
  it("has unique identifiers in each list", () => {
    const ids = (arr: { [k: string]: unknown }[], key: string) => arr.map((x) => x[key] as string);
    const uniq = (xs: string[]) => new Set(xs).size === xs.length;
    expect(uniq(ids(PRESETS, "preset_id"))).toBe(true);
    expect(uniq(ids(PERSONAS, "model_id"))).toBe(true);
    expect(uniq(ids(BACKGROUNDS, "background_id"))).toBe(true);
    expect(uniq(ids(ASSETS, "asset_id"))).toBe(true);
  });

  it("keeps a compliance disclaimer on every preset (not financial advice)", () => {
    for (const p of PRESETS) {
      expect(p.disclaimer.toLowerCase()).toContain("not financial advice");
      expect(p.cta).toBe("TO_DEFINE"); // no final CTA until confirmed
    }
  });

  it("exposes no location/asset with confirmed rights (mock-only)", () => {
    for (const b of BACKGROUNDS) expect(b.rights_status).toBe("to_confirm_before_publication");
    for (const a of ASSETS) expect(a.rights_status).toBe("to_confirm_before_publication");
  });

  it("DEFAULT_SELECTION points to existing items", () => {
    expect(PRESETS.some((p) => p.preset_id === DEFAULT_SELECTION.preset_id)).toBe(true);
    expect(PERSONAS.some((p) => p.model_id === DEFAULT_SELECTION.persona_id)).toBe(true);
    expect(BACKGROUNDS.some((b) => b.background_id === DEFAULT_SELECTION.background_id)).toBe(true);
    expect(ASSETS.some((a) => a.asset_id === DEFAULT_SELECTION.asset_id)).toBe(true);
  });

  it("does not reference missing public scene images", () => {
    const publicRoot = fileURLToPath(new URL("../public", import.meta.url));
    for (const background of BACKGROUNDS) {
      if (!background.image) continue;
      expect(
        existsSync(join(publicRoot, background.image.replace(/^\//, ""))),
        `${background.background_id} references missing image ${background.image}`,
      ).toBe(true);
    }
  });
});
