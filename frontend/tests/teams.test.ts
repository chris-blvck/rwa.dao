import { describe, expect, it } from "vitest";
import { TEAMS, teamById, teamPaletteText } from "@/lib/rwa/teams";

describe("teams", () => {
  it("has 'none' first and unique ids", () => {
    expect(TEAMS[0].id).toBe("none");
    const ids = TEAMS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every team has a flag and three hex colours", () => {
    for (const t of TEAMS) {
      expect(t.flag.length).toBeGreaterThan(0);
      expect(t.colors).toHaveLength(3);
      for (const c of t.colors) expect(c).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("teamById falls back to none for unknown ids", () => {
    expect(teamById("nope").id).toBe("none");
    expect(teamById("brazil").name).toBe("Brazil");
  });

  it("palette text lists the three colours", () => {
    expect(teamPaletteText(teamById("france"))).toContain("#0055A4");
  });
});
