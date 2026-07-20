// MemoryAgent core — per-creator memory that accumulates experience and makes increasingly accurate
// content decisions across sessions. The novel part vs a toy "remembers your name" agent: the memory
// is reinforced by a REAL revenue signal — the on-chain mints each piece of content drove (Minted
// events). This is the Qwen Cloud hackathon differentiator (MemoryAgent track).
//
// A lightweight contextual bandit: each content feature (platform / style / team / watch) carries a
// learned weight. Outcomes (USD minted) nudge the weights of the features that produced them; the
// agent then biases its next batch toward what works, while still exploring. Pure + unit-tested; the
// store (Supabase rwa_agent_memory) and the reasoning provider (Qwen) are injected at the edges.

import type { ContentIdea } from "./autopilot";

export type MemoryWeights = Record<string, number>; // feature key ("platform:X") → weight

export type CreatorMemory = {
  owner: string;
  weights: MemoryWeights;
  posts: number; // total reinforced outcomes (experience accumulated)
  updatedAt?: number;
  /**
   * ISO time of the last reinforcement — the high-water-mark the scheduler windows the NEXT
   * reinforcement from, so the @hourly cron credits each outcome once instead of re-crediting the
   * whole rolling window every tick (which inflated `posts` ~24x/day and saturated the weights).
   */
  lastReinforcedIso?: string;
};

export const DEFAULT_WEIGHT = 1;
const DECAY = 0.98; // old experience fades slowly so the agent tracks what works NOW
const LEARN = 0.15; // how strongly a good outcome pulls a feature's weight up
const EXPLORE = 0.12; // floor of randomness so the agent never fully stops exploring

/** The feature keys a content idea contributes to (what the memory scores). */
export function ideaFeatures(idea: Pick<ContentIdea, "platform" | "presetId" | "teamId" | "watchId">): string[] {
  return [`platform:${idea.platform}`, `style:${idea.presetId}`, `team:${idea.teamId}`, `watch:${idea.watchId}`];
}

export function emptyMemory(owner: string): CreatorMemory {
  return { owner, weights: {}, posts: 0 };
}

function weightOf(m: MemoryWeights, key: string): number {
  return typeof m[key] === "number" ? m[key] : DEFAULT_WEIGHT;
}

/** A memory score for an idea = the average learned weight of its features (higher = works better). */
export function scoreIdea(memory: CreatorMemory, idea: Pick<ContentIdea, "platform" | "presetId" | "teamId" | "watchId">): number {
  const feats = ideaFeatures(idea);
  const sum = feats.reduce((s, k) => s + weightOf(memory.weights, k), 0);
  return sum / feats.length;
}

/**
 * Reinforce memory from an outcome: the features of a piece of content that drove `rewardUsd` in
 * on-chain mints get their weights pulled up (proportional to reward, capped), with a gentle global
 * decay so stale preferences fade. Returns a new memory (pure).
 */
export function reinforce(
  memory: CreatorMemory,
  idea: Pick<ContentIdea, "platform" | "presetId" | "teamId" | "watchId">,
  rewardUsd: number,
): CreatorMemory {
  const gain = LEARN * Math.min(4, Math.log10(1 + Math.max(0, rewardUsd))); // diminishing returns
  const next: MemoryWeights = {};
  // Decay everything we already know a touch.
  for (const [k, v] of Object.entries(memory.weights)) next[k] = v * DECAY;
  // Pull up the features that produced this outcome.
  for (const k of ideaFeatures(idea)) next[k] = weightOf(next, k) * DECAY + gain + (DEFAULT_WEIGHT - DEFAULT_WEIGHT * DECAY);
  return { ...memory, weights: next, posts: memory.posts + 1, updatedAt: memory.updatedAt };
}

/**
 * Rank candidate ideas by learned preference with exploration, returning each idea WITH the exact
 * score it was ranked by (learned score + deterministic exploration jitter). Deterministic given
 * `seed` (no Math.random — the workflow/runtime forbids it and it keeps runs reproducible).
 * Best-first; the UI shows these scores so the displayed numbers always match the ordering.
 */
export function rankedByMemory(memory: CreatorMemory, candidates: ContentIdea[], seed = 0): Array<{ idea: ContentIdea; score: number }> {
  return candidates
    .map((idea, i) => {
      // Deterministic pseudo-jitter for exploration, from the seed + a stable idea hash.
      const h = ideaFeatures(idea).join("|");
      let x = seed + i * 2654435761;
      for (let c = 0; c < h.length; c++) x = (x ^ h.charCodeAt(c)) * 16777619;
      const jitter = ((x >>> 0) % 1000) / 1000; // 0..1
      const score = scoreIdea(memory, idea) + EXPLORE * jitter;
      return { idea, score };
    })
    .sort((a, b) => b.score - a.score);
}

/** Rank candidate ideas best-first (ideas only — see rankedByMemory for the scored variant). */
export function rankByMemory(memory: CreatorMemory, candidates: ContentIdea[], seed = 0): ContentIdea[] {
  return rankedByMemory(memory, candidates, seed).map((x) => x.idea);
}

/**
 * Reinforce memory from a window of outcomes: the creator's on-chain USD (rewardUsd) is credited to
 * the content they actually posted in that window (revealed preference × real revenue). Split evenly
 * across posts, then reinforce each. Empty posts → unchanged. Pure.
 */
export function reinforceFromPosts(
  memory: CreatorMemory,
  postedIdeas: Array<Pick<ContentIdea, "platform" | "presetId" | "teamId" | "watchId">>,
  rewardUsd: number,
): CreatorMemory {
  if (!postedIdeas.length) return memory;
  // Only learn from a real revenue signal — posting that drove $0 this window teaches nothing, and
  // counting it as "experience" (posts++) just inflates the counter. The reward IS the signal.
  if (rewardUsd <= 0) return memory;
  const share = rewardUsd / postedIdeas.length;
  return postedIdeas.reduce((m, idea) => reinforce(m, idea, share), memory);
}

/** A short natural-language summary of what the agent has learned — for the UI + the Qwen prompt. */
export function memorySummary(memory: CreatorMemory): string {
  if (!memory.posts) return "No performance history yet — the agent is exploring.";
  const top = Object.entries(memory.weights)
    .filter(([, v]) => v > DEFAULT_WEIGHT)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => k.replace(/^\w+:/, ""));
  return top.length
    ? `Learned from ${memory.posts} posts: leaning into ${top.join(", ")}.`
    : `Learned from ${memory.posts} posts.`;
}

/**
 * The learned preferences as a short phrase suitable for an LLM prompt hint (e.g.
 * "TikTok, luxury_reveal, brazil"), or undefined when the agent has no experience yet — so a cold
 * memory doesn't feed the LLM a meaningless hint.
 */
export function memoryHint(memory: CreatorMemory): string | undefined {
  if (!memory.posts) return undefined;
  const top = Object.entries(memory.weights)
    .filter(([, v]) => v > DEFAULT_WEIGHT)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => k.replace(/^\w+:/, ""));
  return top.length ? top.join(", ") : undefined;
}
