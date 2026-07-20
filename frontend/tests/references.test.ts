import { describe, expect, it } from "vitest";
import { referenceFor, WATCH_REFERENCES } from "@/lib/rwa/references";
import { ASSETS } from "@/lib/rwa/catalog";

const encrypto = ASSETS[0];
const bare = { ...encrypto, asset_id: "no_plates_test_001" }; // no registered plates

describe("reference system", () => {
  it("returns a product hero and flags nothing for a plain shot", () => {
    const r = referenceFor(encrypto, {});
    expect(r.image).toBeTruthy();
    expect(r.kind).toBe("product");
    expect(r.needs_plate).toBeNull();
  });

  it("prefers the requested angle plate (macro) when it exists", () => {
    const r = referenceFor(encrypto, { angle: "macro" });
    expect(r.image).toContain("macro");
    expect(r.kind).toBe("product");
    expect(r.needs_plate).toBeNull();
  });

  it("uses a team colourway plate when one exists (World Cup activated for real)", () => {
    const r = referenceFor(encrypto, { team_id: "brazil" });
    expect(r.kind).toBe("team");
    expect(r.image).toContain("brazil");
    expect(r.needs_plate).toBeNull();
  });

  it("uses the in-scene plate for a matching backdrop", () => {
    const r = referenceFor(encrypto, { scene_id: "penthouse" });
    expect(r.kind).toBe("scene");
    expect(r.image).toContain("penthouse");
  });

  it("uses the wrist plate for worn shots", () => {
    const r = referenceFor(encrypto, { worn: true });
    expect(r.kind).toBe("wrist");
    expect(r.image).toContain("wrist");
  });

  it("flags a missing team plate and falls back to the hero (not silently wrong)", () => {
    const r = referenceFor(bare, { team_id: "japan" });
    expect(r.needs_plate).toBe("team");
    expect(r.image).toBeTruthy();
  });

  it("flags a missing wrist plate when none is registered", () => {
    const r = referenceFor(bare, { worn: true });
    expect(r.needs_plate).toBe("wrist");
  });

  it("keeps the registry seeded with front renders for both watches", () => {
    const fronts = WATCH_REFERENCES.filter((r) => r.angle === "front");
    expect(fronts.length).toBeGreaterThanOrEqual(2);
  });
});
