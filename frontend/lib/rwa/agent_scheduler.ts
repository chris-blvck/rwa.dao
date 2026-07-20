// Scheduler core for the hosted Managed Agents — the autonomous loop.
//
// A cron (Netlify Scheduled Function → POST /api/rwa/agent/run) calls runScheduledAgents on a
// cadence. It iterates the enabled agents (Supabase rwa_agents), tops each user's queue up to
// their cadencePerDay for the current UTC day, and enqueues the drafts (rwa_agent_drafts). The
// user then posts human-in-the-loop from the dashboard queue — the agent works alone, publishing
// stays one-tap (ToS-safe).
//
// Pure logic: the DB is injected (SchedulerDb) so this is unit-testable without Supabase.

import { normalizeAgentConfig, runAgentTick } from "./agent";
import { generateBatch, type ContentIdea } from "./autopilot";
import { type CreatorMemory, emptyMemory, memoryHint, rankByMemory, reinforceFromPosts } from "./agent_memory";

export type AgentRow = { owner: string; enabled: boolean; config: unknown };

/**
 * Optional MemoryAgent capability (Qwen Cloud track): when provided, each run first REINFORCES the
 * creator's memory from the real on-chain USD their posted content drove, then RANKS a larger
 * candidate pool by that memory so the next batch leans into what works. Omitted → plain rotation
 * (existing behaviour, existing tests).
 */
export type MemoryProvider = {
  load(owner: string): Promise<CreatorMemory | null>;
  save(owner: string, memory: CreatorMemory): Promise<void>;
  /** On-chain USD the creator drove since the given ISO time (their referral conversions). */
  recentUsd(owner: string, sinceIso: string): Promise<number>;
  /** Ideas the creator actually posted since the given ISO time (revealed preference). */
  postedSince(owner: string, sinceIso: string): Promise<ContentIdea[]>;
};

export type SchedulerDb = {
  /** Enabled agents (owner + stored config). */
  listEnabledAgents(): Promise<AgentRow[]>;
  /** Drafts already created for this owner since the given ISO timestamp (any status). */
  countDraftsSince(owner: string, sinceIso: string): Promise<number>;
  /** Insert queued drafts; returns the number actually inserted. */
  insertDrafts(rows: { owner: string; idea: ContentIdea }[]): Promise<number>;
};

/**
 * Optional LLM copywriter (Qwen Cloud track): when provided, each drafted idea's caption is
 * (re)written by the LLM — the agent's *reasoning* runs on Qwen — informed by what the creator's
 * audience actually responds to (`memoryHint`, from the MemoryAgent). Returns null per idea to keep
 * the deterministic template caption (the safe fallback: no key/provider → this is never wired).
 */
export type CaptionWriter = (idea: ContentIdea, ctx: { memoryHint?: string }) => Promise<string | null>;

/** Start of the current UTC day — the "daily quota" window. */
export function startOfUtcDay(now: Date): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return d.toISOString();
}

/** Small stable string hash (djb2) — per-owner offset so users don't all get the same batch. */
function ownerHash(owner: string): number {
  let h = 5381;
  for (let i = 0; i < owner.length; i++) h = ((h << 5) + h + owner.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * Per-user, per-day content seed: rotates daily, differs across users, and is stable within a
 * day so repeated scheduler runs continue the same day's rotation instead of restarting it.
 */
export function dailySeed(owner: string, now: Date): number {
  const day = Math.floor(now.getTime() / 86_400_000);
  return day * 1000 + (ownerHash(owner) % 997);
}

export type SchedulerRunResult = {
  agents: number; // enabled agents seen
  enqueued: number; // drafts inserted this run
  skipped: number; // agents already at their daily quota
};

/** 30-day reinforcement window for memory (recent performance, not ancient history). */
const MEMORY_WINDOW_MS = 30 * 86_400_000;

export type SchedulerRunResultWithMemory = SchedulerRunResult & { reinforced: number };

/** One scheduler run: top every enabled agent's queue up to its daily cadence. */
export async function runScheduledAgents(
  db: SchedulerDb,
  now: Date,
  opts?: { memory?: MemoryProvider; writeCaption?: CaptionWriter },
): Promise<SchedulerRunResultWithMemory> {
  const agents = await db.listEnabledAgents();
  const since = startOfUtcDay(now);
  const nowIso = now.toISOString();
  const memWindowSince = new Date(now.getTime() - MEMORY_WINDOW_MS).toISOString();
  let enqueued = 0;
  let skipped = 0;
  let reinforced = 0;
  for (const row of agents) {
    const cfg = normalizeAgentConfig({ ...(row.config as Record<string, unknown> | null), enabled: row.enabled });
    if (!cfg.enabled) {
      skipped++;
      continue;
    }
    const already = await db.countDraftsSince(row.owner, since);
    const want = cfg.cadencePerDay - already;
    if (want <= 0) {
      skipped++;
      continue;
    }
    const seed = dailySeed(row.owner, now) + already;

    let ideas: ContentIdea[];
    let memHint: string | undefined;
    if (opts?.memory) {
      // MemoryAgent: reinforce from real outcomes, then rank a wider candidate pool by memory.
      const mem = (await opts.memory.load(row.owner)) ?? emptyMemory(row.owner);
      // Credit each outcome ONCE: window from the last reinforcement (bounded to the 30-day max),
      // not the full rolling window every tick — otherwise the @hourly cron re-credits the same
      // posts/USD ~24x/day, inflating experience and saturating the weights (exploration dies).
      const windowStart = mem.lastReinforcedIso && mem.lastReinforcedIso > memWindowSince ? mem.lastReinforcedIso : memWindowSince;
      const [usd, posted] = await Promise.all([
        opts.memory.recentUsd(row.owner, windowStart),
        opts.memory.postedSince(row.owner, windowStart),
      ]);
      const learned = reinforceFromPosts(mem, posted, usd);
      const nextMem: CreatorMemory = { ...learned, lastReinforcedIso: nowIso };
      // Persist + count only when a real revenue signal actually moved the memory (reinforceFromPosts
      // returns the same object otherwise). Advancing lastReinforcedIso every run would skip windows.
      if (learned !== mem) {
        await opts.memory.save(row.owner, nextMem);
        reinforced++;
      }
      memHint = memoryHint(nextMem); // what this creator's audience actually responds to
      // Generate a pool of 3× the need (different platforms in play), rank, take the best.
      const pool = generateBatch(Math.max(want * 3, want + 4), seed, cfg.platforms);
      ideas = rankByMemory(nextMem, pool, seed).slice(0, want);
    } else {
      // Continue the day's rotation from where it left off (`+ already`) so a top-up run after a
      // partial one produces the next ideas, not duplicates of the first ones.
      ideas = runAgentTick({ ...cfg, cadencePerDay: want }, seed);
    }

    // The agent's reasoning runs on the LLM (Qwen Cloud path) when a writer is wired: rewrite each
    // caption, informed by the memory hint. Any failure keeps the deterministic template caption, so
    // a flaky/absent provider never blocks the batch.
    if (opts?.writeCaption) {
      const writer = opts.writeCaption;
      ideas = await Promise.all(
        ideas.map(async (idea) => {
          try {
            const text = await writer(idea, { memoryHint: memHint });
            return text ? { ...idea, caption: text } : idea;
          } catch {
            return idea;
          }
        }),
      );
    }

    enqueued += await db.insertDrafts(ideas.map((idea) => ({ owner: row.owner, idea })));
  }
  return { agents: agents.length, enqueued, skipped, reinforced };
}
