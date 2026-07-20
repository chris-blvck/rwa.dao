// Local persistence for the demo: creations library, last selection, demo credits.
// Pure client-side (localStorage) — no backend needed. SSR-safe (guards `window`).
import type { CatalogSelection } from "./catalog";

export type Creation = {
  id: string;
  createdAt: number;
  watchId: string;
  watchTitle: string;
  watchImage: string;
  creatorId: string;
  creatorName: string;
  styleId: string;
  styleTitle: string;
  sceneTitle: string;
  // Live generation (set when a real Higgsfield job produced this video). Empty in demo mode.
  videoUrl?: string;
  requestId?: string;
  // Social submission (set when the creator posts the video). Metrics tracking = later phase.
  postPlatform?: string;
  postUrl?: string;
  postSubmittedAt?: number;
};

const K_CREATIONS = "rwa_creations";
const K_LAST = "rwa_last_selection";
const K_CREDITS = "rwa_demo_credits";
const K_SETTINGS = "rwa_output_settings";
const K_ECONOMY = "rwa_economy";
const K_WALLET = "rwa_wallet";
export const DEFAULT_CREDITS = 500; // demo XDC balance (premium token prices run to ~hundreds of XDC)

export type Resolution = "720p" | "1080p" | "4K";
export type Format = "9:16" | "1:1" | "16:9";
export type Engine = "premium" | "local";
export type OutputSettings = { resolution: Resolution; format: Format; engine: Engine; duration: number; model: string };
// model "auto" = smart routing picks the best model for the style + output (pricing.resolveModel).
export const DEFAULT_SETTINGS: OutputSettings = { resolution: "1080p", format: "9:16", engine: "premium", duration: 15, model: "auto" };

// Allowed video length (seconds) for the duration slider.
export const MIN_DURATION = 4;
export const MAX_DURATION = 15;

// Demo credit cost per resolution (grounded on the real Higgsfield ratio: 1080p ≈ 2× 720p,
// 4K markedly higher). For the demo only — the real token price is a human prerequisite.
export const RESOLUTION_COST: Record<Resolution, number> = { "720p": 1, "1080p": 2, "4K": 4 };

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota / privacy mode */
  }
}

export function listCreations(): Creation[] {
  return read<Creation[]>(K_CREATIONS, []);
}

export function addCreation(c: Creation): Creation[] {
  const next = [c, ...listCreations()].slice(0, 50);
  write(K_CREATIONS, next);
  return next;
}

export function removeCreation(id: string): Creation[] {
  const next = listCreations().filter((c) => c.id !== id);
  write(K_CREATIONS, next);
  return next;
}

export function updateCreation(id: string, patch: Partial<Creation>): Creation[] {
  const next = listCreations().map((c) => (c.id === id ? { ...c, ...patch } : c));
  write(K_CREATIONS, next);
  return next;
}

export function loadLastSelection(): Partial<CatalogSelection> | null {
  return read<Partial<CatalogSelection> | null>(K_LAST, null);
}

export function saveLastSelection(sel: CatalogSelection): void {
  write(K_LAST, sel);
}

export function getSettings(): OutputSettings {
  const s = read<Partial<OutputSettings> | null>(K_SETTINGS, null);
  return {
    resolution: s?.resolution && RESOLUTION_COST[s.resolution] ? s.resolution : DEFAULT_SETTINGS.resolution,
    format: s?.format === "1:1" || s?.format === "16:9" || s?.format === "9:16" ? s.format : DEFAULT_SETTINGS.format,
    engine: s?.engine === "local" || s?.engine === "premium" ? s.engine : DEFAULT_SETTINGS.engine,
    duration:
      typeof s?.duration === "number" && s.duration >= MIN_DURATION && s.duration <= MAX_DURATION
        ? Math.round(s.duration)
        : DEFAULT_SETTINGS.duration,
    // Unknown ids fall back to the default model at the use-site (modelById).
    model: typeof s?.model === "string" && s.model ? s.model : DEFAULT_SETTINGS.model,
  };
}

export function saveSettings(s: OutputSettings): void {
  write(K_SETTINGS, s);
}

export function getCredits(): number {
  return read<number>(K_CREDITS, DEFAULT_CREDITS);
}

export function setCredits(n: number): void {
  write(K_CREDITS, n);
}

// Demo economy state (mint + points + auto-pilot earnings) — persisted so the account feels
// continuous across refreshes and pages. Real balances move on-chain / to the points ledger later.
export type EconomyState = { points: number; postedIds: string[] };
export const DEFAULT_ECONOMY: EconomyState = { points: 0, postedIds: [] };

export function getEconomy(): EconomyState {
  // `rwaxEarned` is legacy (pre-unification): reward earnings are now a single off-chain `points`
  // pool that converts to RWAX at withdrawal. Fold any stored legacy value into points on read.
  const e = read<(Partial<EconomyState> & { rwaxEarned?: number }) | null>(K_ECONOMY, null);
  const legacyRwax = typeof e?.rwaxEarned === "number" ? e.rwaxEarned : 0;
  return {
    points: (typeof e?.points === "number" ? e.points : DEFAULT_ECONOMY.points) + legacyRwax,
    postedIds: Array.isArray(e?.postedIds) ? e!.postedIds!.filter((x): x is string => typeof x === "string") : [],
  };
}

export function saveEconomy(e: EconomyState): void {
  write(K_ECONOMY, e);
}

// Mock wallet session — persisted so "connected" survives a refresh (real auth is a later phase).
export function getSavedWallet<T = unknown>(): T | null {
  return read<T | null>(K_WALLET, null);
}

export function saveWallet(w: unknown): void {
  write(K_WALLET, w);
}

// Managed Agent config (platform-hosted agent) — persisted per browser.
import { type AgentConfig, DEFAULT_AGENT_CONFIG, normalizeAgentConfig } from "./agent";
const K_AGENT = "rwa_agent_config";

export function getAgentConfig(): AgentConfig {
  return normalizeAgentConfig(read<Partial<AgentConfig> | null>(K_AGENT, null) ?? DEFAULT_AGENT_CONFIG);
}

export function saveAgentConfig(c: AgentConfig): void {
  write(K_AGENT, c);
}

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `c_${Math.floor(Math.random() * 1e9).toString(36)}`;
}
