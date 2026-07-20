import { describe, expect, it } from "vitest";
import { dailySeed, runScheduledAgents, startOfUtcDay, type AgentRow, type SchedulerDb } from "@/lib/rwa/agent_scheduler";
import { parseQueuedDraft } from "@/lib/rwa/agent_queue";
import type { ContentIdea } from "@/lib/rwa/autopilot";

const NOW = new Date("2026-07-02T14:30:00Z");

function fakeDb(agents: AgentRow[], existingCounts: Record<string, number> = {}) {
  const inserted: { owner: string; idea: ContentIdea }[] = [];
  const db: SchedulerDb = {
    listEnabledAgents: async () => agents,
    countDraftsSince: async (owner) => existingCounts[owner] ?? 0,
    insertDrafts: async (rows) => {
      inserted.push(...rows);
      return rows.length;
    },
  };
  return { db, inserted };
}

describe("agent scheduler", () => {
  it("enqueues each enabled agent's daily cadence when the queue is empty", async () => {
    const { db, inserted } = fakeDb([
      { owner: "user-a", enabled: true, config: { cadencePerDay: 3, platforms: ["X"] } },
      { owner: "user-b", enabled: true, config: { cadencePerDay: 5, platforms: ["TikTok"] } },
    ]);
    const r = await runScheduledAgents(db, NOW);
    expect(r).toEqual({ agents: 2, enqueued: 8, skipped: 0, reinforced: 0 });
    expect(inserted.filter((x) => x.owner === "user-a")).toHaveLength(3);
    expect(inserted.filter((x) => x.owner === "user-b")).toHaveLength(5);
    // Drafts are real ContentIdeas the panel can render.
    for (const { idea } of inserted) {
      expect(idea.id).toBeTruthy();
      expect(idea.caption).toBeTruthy();
      expect(idea.rewardPts).toBeGreaterThan(0);
    }
  });

  it("tops up only the missing drafts for the day (no duplicates on re-run)", async () => {
    const { db, inserted } = fakeDb([{ owner: "user-a", enabled: true, config: { cadencePerDay: 3 } }], { "user-a": 2 });
    const r = await runScheduledAgents(db, NOW);
    expect(r.enqueued).toBe(1);
    // The top-up continues the day's rotation (seed offset by the already-queued count) so the
    // extra draft differs from what a fresh run would have produced first.
    const fresh = fakeDb([{ owner: "user-a", enabled: true, config: { cadencePerDay: 3 } }]);
    await runScheduledAgents(fresh.db, NOW);
    expect(inserted[0]!.idea.id).not.toBe(fresh.inserted[0]!.idea.id);
  });

  it("skips agents already at quota and disabled rows", async () => {
    const { db, inserted } = fakeDb(
      [
        { owner: "full", enabled: true, config: { cadencePerDay: 2 } },
        { owner: "off", enabled: false, config: { cadencePerDay: 2 } },
      ],
      { full: 2 },
    );
    const r = await runScheduledAgents(db, NOW);
    expect(r).toEqual({ agents: 2, enqueued: 0, skipped: 2, reinforced: 0 });
    expect(inserted).toHaveLength(0);
  });

  it("daily seed is stable within a day, rotates daily, and differs across users", () => {
    expect(dailySeed("user-a", NOW)).toBe(dailySeed("user-a", new Date("2026-07-02T23:59:00Z")));
    expect(dailySeed("user-a", NOW)).not.toBe(dailySeed("user-a", new Date("2026-07-03T00:01:00Z")));
    expect(dailySeed("user-a", NOW)).not.toBe(dailySeed("user-b", NOW));
  });

  it("startOfUtcDay anchors the quota window to UTC midnight", () => {
    expect(startOfUtcDay(NOW)).toBe("2026-07-02T00:00:00.000Z");
  });
});

describe("agent queue row parsing", () => {
  const idea = {
    id: "idea-1-0", watchId: "w", presetId: "p", personaId: "m", backgroundId: "b", teamId: "t",
    watchTitle: "Encrypto", watchImage: "/x.png", presetTitle: "Unboxing", personaName: "Adrian",
    sceneTitle: "Showroom", platform: "X", caption: "hello", rewardPts: 250,
  };

  it("accepts a well-formed row", () => {
    const d = parseQueuedDraft({ id: "row-1", created_at: "2026-07-02T10:00:00Z", idea });
    expect(d?.rowId).toBe("row-1");
    expect(d?.idea.caption).toBe("hello");
    expect(d?.createdAt).toBeGreaterThan(0);
  });

  it("drops malformed rows instead of throwing", () => {
    expect(parseQueuedDraft(null)).toBeNull();
    expect(parseQueuedDraft({ id: "row-2", idea: null })).toBeNull();
    expect(parseQueuedDraft({ id: "row-3", idea: { ...idea, caption: 42 } })).toBeNull();
    expect(parseQueuedDraft({ idea })).toBeNull(); // no row id
  });
});

import type { MemoryProvider } from "@/lib/rwa/agent_scheduler";
import { emptyMemory, reinforce } from "@/lib/rwa/agent_memory";

describe("scheduler with MemoryAgent", () => {
  function memProvider(over: Partial<MemoryProvider> = {}): { mem: MemoryProvider; saved: any[] } {
    const saved: any[] = [];
    const mem: MemoryProvider = {
      load: async () => null,
      save: async (_o, m) => { saved.push(m); },
      recentUsd: async () => 0,
      postedSince: async () => [],
      ...over,
    };
    return { mem, saved };
  }

  it("reinforces from posted content + on-chain USD, then ranks the batch by memory", async () => {
    const { db, inserted } = fakeDb([{ owner: "u1", enabled: true, config: { cadencePerDay: 3, platforms: ["X", "TikTok"] } }]);
    const posted = [{ id: "p", watchId: "watch_qr_concept_001", presetId: "luxury_reveal", personaId: "m", backgroundId: "b", teamId: "france", watchTitle: "W", watchImage: "/x", presetTitle: "P", personaName: "N", sceneTitle: "S", platform: "TikTok" as const, caption: "c", rewardPts: 100 }];
    const { mem, saved } = memProvider({ recentUsd: async () => 750, postedSince: async () => posted });
    const r = await runScheduledAgents(db, NOW, { memory: mem });
    expect(r.enqueued).toBe(3);
    expect(r.reinforced).toBe(1);        // it learned from the posted content
    expect(saved.length).toBe(1);
    expect(saved[0].posts).toBe(1);
    expect(inserted).toHaveLength(3);
  });

  it("without a memory provider it behaves exactly as before", async () => {
    const { db, inserted } = fakeDb([{ owner: "u1", enabled: true, config: { cadencePerDay: 2 } }]);
    const r = await runScheduledAgents(db, NOW);
    expect(r.enqueued).toBe(2);
    expect(r.reinforced).toBe(0);
    expect(inserted).toHaveLength(2);
  });

  it("credits each outcome once: windows reinforcement from the last-reinforced high-water-mark, and advances it", async () => {
    const { db } = fakeDb([{ owner: "u1", enabled: true, config: { cadencePerDay: 2 } }]);
    const hwm = "2026-07-02T12:00:00Z"; // newer than NOW-30d, so it should be used as the window start
    const posted = [{ id: "p", watchId: "w", presetId: "luxury_reveal", personaId: "m", backgroundId: "b", teamId: "brazil", watchTitle: "W", watchImage: "/x", presetTitle: "P", personaName: "N", sceneTitle: "S", platform: "TikTok" as const, caption: "c", rewardPts: 100 }];
    const usdSince: string[] = [];
    const postedSince: string[] = [];
    const { mem, saved } = memProvider({
      load: async () => ({ owner: "u1", weights: {}, posts: 3, lastReinforcedIso: hwm }),
      recentUsd: async (_o, since) => { usdSince.push(since); return 500; },
      postedSince: async (_o, since) => { postedSince.push(since); return posted; },
    });
    await runScheduledAgents(db, NOW, { memory: mem });
    expect(usdSince[0]).toBe(hwm);          // windowed from the high-water-mark, not the full 30 days
    expect(postedSince[0]).toBe(hwm);
    expect(saved).toHaveLength(1);
    expect(saved[0].lastReinforcedIso).toBe(NOW.toISOString()); // advanced so the next tick starts here
  });

  it("does not reinforce (or advance the mark) when the window drove no revenue", async () => {
    const { db } = fakeDb([{ owner: "u1", enabled: true, config: { cadencePerDay: 2 } }]);
    const posted = [{ id: "p", watchId: "w", presetId: "unboxing", personaId: "m", backgroundId: "b", teamId: "france", watchTitle: "W", watchImage: "/x", presetTitle: "P", personaName: "N", sceneTitle: "S", platform: "X" as const, caption: "c", rewardPts: 100 }];
    const { mem, saved } = memProvider({ recentUsd: async () => 0, postedSince: async () => posted });
    const r = await runScheduledAgents(db, NOW, { memory: mem });
    expect(r.reinforced).toBe(0); // $0 window → nothing learned, nothing saved
    expect(saved).toHaveLength(0);
  });
});

describe("scheduler with an LLM caption writer (Qwen path)", () => {
  it("rewrites each draft's caption via the writer, keeping the template when it returns null", async () => {
    const { db, inserted } = fakeDb([{ owner: "u1", enabled: true, config: { cadencePerDay: 4 } }]);
    let n = 0;
    // Rewrite the first two, decline the rest (simulating a flaky provider) — declines keep template.
    const writeCaption = async (idea: ContentIdea) => (n++ < 2 ? `LLM: ${idea.watchTitle}` : null);
    const r = await runScheduledAgents(db, NOW, { writeCaption });
    expect(r.enqueued).toBe(4);
    const llmWritten = inserted.filter((x) => x.idea.caption.startsWith("LLM: "));
    expect(llmWritten).toHaveLength(2);
    // The declined ones fell back to a real (non-empty) template caption.
    expect(inserted.every((x) => x.idea.caption.length > 0)).toBe(true);
  });

  it("a writer that throws never blocks the batch (template caption stands)", async () => {
    const { db, inserted } = fakeDb([{ owner: "u1", enabled: true, config: { cadencePerDay: 2 } }]);
    const writeCaption = async () => {
      throw new Error("provider down");
    };
    const r = await runScheduledAgents(db, NOW, { writeCaption });
    expect(r.enqueued).toBe(2);
    expect(inserted).toHaveLength(2);
    expect(inserted.every((x) => x.idea.caption.length > 0)).toBe(true);
  });

  it("passes the memory hint to the writer when memory is provided", async () => {
    const { db } = fakeDb([{ owner: "u1", enabled: true, config: { cadencePerDay: 2 } }]);
    const posted: ContentIdea[] = [
      { id: "p", watchId: "watch_qr_concept_001", presetId: "luxury_reveal", personaId: "m", backgroundId: "b", teamId: "brazil", watchTitle: "W", watchImage: "/x", presetTitle: "P", personaName: "N", sceneTitle: "S", platform: "TikTok", caption: "c", rewardPts: 100 },
    ];
    const mem: MemoryProvider = { load: async () => null, save: async () => {}, recentUsd: async () => 900, postedSince: async () => posted };
    const seen: Array<string | undefined> = [];
    const writeCaption = async (_idea: ContentIdea, ctx: { memoryHint?: string }) => {
      seen.push(ctx.memoryHint);
      return "ok";
    };
    await runScheduledAgents(db, NOW, { memory: mem, writeCaption });
    // Reinforced from posts → the hint is a non-empty phrase naming what was learned.
    expect(seen.length).toBeGreaterThan(0);
    expect(seen.every((h) => typeof h === "string" && h!.length > 0)).toBe(true);
  });
});
