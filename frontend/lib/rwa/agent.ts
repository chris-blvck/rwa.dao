// Managed Agent — a platform-HOSTED AI agent (agent-as-a-service).
//
// The community doesn't run a VPS or install anything: a user just toggles their agent on and picks
// a few preferences in the app. RWA-DAO runs the agent loop server-side, drafting on-brand content
// on their schedule. Publishing stays human-in-the-loop (one tap) or via a connected account
// (official APIs) — never unsupervised auto-posting, so no account gets banned.
//
// Framework-agnostic: under the hood the hosted runtime can drive OpenClaw / Hermes / an MCP tool,
// but the user never touches infrastructure. This module is the agent's config + its "tick" (the
// work it produces each run), reusing the existing content engine.

import { generateBatch, type ContentIdea } from "./autopilot";

export type AgentPlatform = "X" | "TikTok" | "Instagram";

export type AgentConfig = {
  enabled: boolean; // is the hosted agent active?
  cadencePerDay: number; // drafts per day (1–10)
  autoPublish: boolean; // publish to connected accounts (Phase 2) vs one-tap manual
  platforms: AgentPlatform[]; // where it targets
};

export const AGENT_PLATFORMS: AgentPlatform[] = ["X", "TikTok", "Instagram"];
export const AGENT_MIN_CADENCE = 1;
export const AGENT_MAX_CADENCE = 10;

export const DEFAULT_AGENT_CONFIG: AgentConfig = {
  enabled: false,
  cadencePerDay: 3,
  autoPublish: false,
  platforms: ["X", "TikTok"],
};

const clampCadence = (n: unknown): number => {
  const v = typeof n === "number" && Number.isFinite(n) ? Math.round(n) : DEFAULT_AGENT_CONFIG.cadencePerDay;
  return Math.min(AGENT_MAX_CADENCE, Math.max(AGENT_MIN_CADENCE, v));
};

/** Validate/repair a stored config so bad data never breaks the agent. */
export function normalizeAgentConfig(c: Partial<AgentConfig> | null | undefined): AgentConfig {
  const platforms = Array.isArray(c?.platforms)
    ? c!.platforms!.filter((p): p is AgentPlatform => (AGENT_PLATFORMS as string[]).includes(p))
    : DEFAULT_AGENT_CONFIG.platforms;
  return {
    enabled: Boolean(c?.enabled),
    cadencePerDay: clampCadence(c?.cadencePerDay),
    autoPublish: Boolean(c?.autoPublish),
    platforms: platforms.length ? platforms : DEFAULT_AGENT_CONFIG.platforms,
  };
}

/**
 * One agent "tick" — the hosted agent's output for a run: a batch of on-brand content drafts.
 * `seed` rotates the picks (day/offset). Reuses the content engine so the agent's work is real.
 */
export function runAgentTick(config: AgentConfig, seed: number): ContentIdea[] {
  return generateBatch(clampCadence(config.cadencePerDay), seed, config.platforms);
}

/** Short human status line for the UI. */
export function agentStatus(config: AgentConfig): string {
  if (!config.enabled) return "Paused";
  const where = config.platforms.join(" · ") || "no platform";
  return `${config.autoPublish ? "Auto-publish" : "Draft & queue"} · ${config.cadencePerDay}/day · ${where}`;
}
