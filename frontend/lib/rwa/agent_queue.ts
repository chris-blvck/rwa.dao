// Agent draft queue — browser side. The scheduler (server, service role) enqueues drafts into
// rwa_agent_drafts; the user reads their own queue here (owner-scoped RLS via the anon session)
// and marks drafts posted/dismissed. Degrades to [] when Supabase isn't configured or the user
// isn't signed in — the dashboard then falls back to the client-generated demo batch.

import { getSupabaseBrowser } from "./supabase";
import type { ContentIdea } from "./autopilot";

export type QueuedDraft = { rowId: string; createdAt: number; idea: ContentIdea };
export type AgentQueueLoad = { mode: "cloud" | "local"; drafts: QueuedDraft[] };

/** Validate a rwa_agent_drafts row into a QueuedDraft — malformed rows are dropped, not thrown. */
export function parseQueuedDraft(row: unknown): QueuedDraft | null {
  if (!row || typeof row !== "object") return null;
  const r = row as { id?: unknown; created_at?: unknown; idea?: unknown };
  if (typeof r.id !== "string" || !r.id) return null;
  const idea = r.idea as Partial<ContentIdea> | null;
  if (!idea || typeof idea !== "object") return null;
  // The panel needs these to render + credit the post; anything missing → drop the row.
  if (typeof idea.id !== "string" || typeof idea.caption !== "string" || typeof idea.platform !== "string") return null;
  if (typeof idea.watchTitle !== "string" || typeof idea.rewardPts !== "number") return null;
  const createdAt = typeof r.created_at === "string" ? Date.parse(r.created_at) : NaN;
  return { rowId: r.id, createdAt: Number.isFinite(createdAt) ? createdAt : 0, idea: idea as ContentIdea };
}

/**
 * Load the user's queued drafts (newest first) + the mode. mode="cloud" when the hosted agent is
 * active for this user (Supabase configured + signed in) — even if the queue is currently empty, so
 * the caller shows "all caught up" instead of falling back to the demo batch. mode="local" when
 * there's no cloud session (demo).
 */
export async function loadAgentQueue(limit = 9): Promise<AgentQueueLoad> {
  const sb = getSupabaseBrowser();
  if (!sb) return { mode: "local", drafts: [] };
  try {
    const { data: session } = await sb.auth.getSession();
    if (!session.session?.user?.id) return { mode: "local", drafts: [] };
    const { data, error } = await sb
      .from("rwa_agent_drafts")
      .select("id, created_at, idea")
      .eq("status", "queued")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return { mode: "local", drafts: [] }; // treat a read error as demo mode (safe fallback)
    const drafts = (data ?? []).map(parseQueuedDraft).filter((d): d is QueuedDraft => d !== null);
    return { mode: "cloud", drafts };
  } catch {
    return { mode: "local", drafts: [] };
  }
}

/**
 * Mark a queued draft posted/dismissed (it leaves the queue on the next load). Returns whether the
 * server row actually changed — the caller can keep a local "posted" state either way, but a false
 * signals the draft may reappear (checked so a silent RLS/0-row update isn't mistaken for success).
 */
export async function markAgentDraft(rowId: string, status: "posted" | "dismissed"): Promise<boolean> {
  const sb = getSupabaseBrowser();
  if (!sb) return false;
  try {
    const { data, error } = await sb.from("rwa_agent_drafts").update({ status }).eq("id", rowId).select("id");
    return !error && Array.isArray(data) && data.length > 0;
  } catch {
    return false; // offline — the local posted state already reflects it this session
  }
}
