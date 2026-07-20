import { describe, expect, it } from "vitest";
import { generateBatch } from "@/lib/rwa/autopilot";

describe("autopilot", () => {
  it("generates the requested number of complete ideas", () => {
    const batch = generateBatch(3, 0);
    expect(batch).toHaveLength(3);
    for (const idea of batch) {
      expect(idea.watchTitle).toBeTruthy();
      expect(idea.presetTitle).toBeTruthy();
      expect(idea.caption.length).toBeGreaterThan(0);
      expect(["TikTok", "Instagram", "X"]).toContain(idea.platform);
      expect(idea.rewardPts).toBeGreaterThanOrEqual(200);
      expect(idea.rewardPts).toBeLessThan(500);
      expect(idea.teamId).not.toBe("none"); // auto-pilot always uses a team colourway
    }
  });

  it("is deterministic for the same offset and rotates with a new offset", () => {
    expect(generateBatch(3, 0)[0].id).toBe(generateBatch(3, 0)[0].id);
    expect(generateBatch(3, 0)[0].caption).toBe(generateBatch(3, 0)[0].caption);
    // a different offset should generally change the line-up
    const a = generateBatch(3, 0).map((i) => `${i.presetId}-${i.watchId}`).join();
    const b = generateBatch(3, 3).map((i) => `${i.presetId}-${i.watchId}`).join();
    expect(a).not.toBe(b);
  });
});
