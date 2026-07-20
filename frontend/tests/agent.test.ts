import { describe, expect, it } from "vitest";
import {
  AGENT_MAX_CADENCE,
  DEFAULT_AGENT_CONFIG,
  agentStatus,
  normalizeAgentConfig,
  runAgentTick,
} from "@/lib/rwa/agent";

describe("managed agent config", () => {
  it("has a safe default (paused, hosted, one-tap)", () => {
    expect(DEFAULT_AGENT_CONFIG.enabled).toBe(false);
    expect(DEFAULT_AGENT_CONFIG.autoPublish).toBe(false);
    expect(DEFAULT_AGENT_CONFIG.cadencePerDay).toBeGreaterThan(0);
  });

  it("normalizes bad data (clamps cadence, filters platforms)", () => {
    const c = normalizeAgentConfig({ cadencePerDay: 999, platforms: ["X", "bogus" as never], enabled: true });
    expect(c.cadencePerDay).toBe(AGENT_MAX_CADENCE);
    expect(c.platforms).toEqual(["X"]);
    expect(c.enabled).toBe(true);
  });

  it("falls back to defaults on empty/garbage", () => {
    expect(normalizeAgentConfig(null)).toEqual(DEFAULT_AGENT_CONFIG);
    expect(normalizeAgentConfig({ platforms: [] }).platforms).toEqual(DEFAULT_AGENT_CONFIG.platforms);
  });
});

describe("agent tick", () => {
  it("produces exactly cadencePerDay drafts", () => {
    expect(runAgentTick({ ...DEFAULT_AGENT_CONFIG, cadencePerDay: 5 }, 0)).toHaveLength(5);
    expect(runAgentTick({ ...DEFAULT_AGENT_CONFIG, cadencePerDay: 1 }, 3)).toHaveLength(1);
  });

  it("rotates with the seed", () => {
    const a = runAgentTick({ ...DEFAULT_AGENT_CONFIG, cadencePerDay: 3 }, 0)[0].id;
    const b = runAgentTick({ ...DEFAULT_AGENT_CONFIG, cadencePerDay: 3 }, 3)[0].id;
    expect(a).not.toBe(b);
  });
});

describe("agent status line", () => {
  it("reads Paused when off, else summarizes cadence/platforms", () => {
    expect(agentStatus({ ...DEFAULT_AGENT_CONFIG, enabled: false })).toBe("Paused");
    const s = agentStatus({ enabled: true, autoPublish: false, cadencePerDay: 4, platforms: ["X", "TikTok"] });
    expect(s).toContain("4/day");
    expect(s).toContain("X");
    expect(s).toContain("Draft & queue");
  });
});
