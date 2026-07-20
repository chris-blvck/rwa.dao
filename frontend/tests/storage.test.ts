import { beforeEach, describe, expect, it } from "vitest";
import * as S from "@/lib/rwa/storage";

function mockLocalStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => (m.has(k) ? (m.get(k) as string) : null),
    setItem: (k: string, v: string) => void m.set(k, String(v)),
    removeItem: (k: string) => void m.delete(k),
    clear: () => m.clear(),
  };
}

beforeEach(() => {
  (globalThis as any).window = { localStorage: mockLocalStorage() };
});

const sample: S.Creation = {
  id: "a",
  createdAt: 1,
  watchId: "w",
  watchTitle: "Watch",
  watchImage: "/x.png",
  creatorId: "cr",
  creatorName: "Creator",
  styleId: "s",
  styleTitle: "Style",
  sceneTitle: "Scene",
};

describe("local storage (demo persistence)", () => {
  it("credits default then persists", () => {
    expect(S.getCredits()).toBe(S.DEFAULT_CREDITS);
    S.setCredits(2);
    expect(S.getCredits()).toBe(2);
  });

  it("adds, lists and removes creations (newest first)", () => {
    expect(S.listCreations()).toEqual([]);
    S.addCreation(sample);
    S.addCreation({ ...sample, id: "b" });
    const all = S.listCreations();
    expect(all.map((c) => c.id)).toEqual(["b", "a"]);
    S.removeCreation("a");
    expect(S.listCreations().map((c) => c.id)).toEqual(["b"]);
  });

  it("round-trips the last selection", () => {
    S.saveLastSelection({
      preset_id: "p",
      persona_id: "pe",
      background_id: "bg",
      asset_id: "as",
      hook_id: "none",
      music_id: "none",
      team_id: "none",
    });
    expect(S.loadLastSelection()?.preset_id).toBe("p");
  });

  it("generates ids", () => {
    expect(typeof S.newId()).toBe("string");
  });
});
