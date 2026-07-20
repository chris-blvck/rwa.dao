// Supabase ADMIN client — server-side only (service role). Used by the agent scheduler to
// iterate rwa_agents and enqueue rwa_agent_drafts (inserts are service-role-only by RLS design).
//
// Config-gated like the browser client: returns null unless SUPABASE_SERVICE_ROLE_KEY is set,
// so the demo deploy (no secrets) keeps working — the run route then falls back to a stateless
// demo tick. NEVER import this from client code (the service key bypasses RLS).

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ContentIdea } from "./autopilot";
import type { AgentRow, SchedulerDb } from "./agent_scheduler";
import type { IndexerDb, MintRow } from "./mint_indexer";

let cached: SupabaseClient | null | undefined;

export function getSupabaseAdmin(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  cached = url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
  return cached;
}

/** SchedulerDb adapter over the admin client (see agent_scheduler.ts for the pure logic). */
export function schedulerDb(sb: SupabaseClient): SchedulerDb {
  return {
    async listEnabledAgents(): Promise<AgentRow[]> {
      const { data, error } = await sb.from("rwa_agents").select("owner, enabled, config").eq("enabled", true);
      if (error) throw new Error(`rwa_agents select failed: ${error.message}`);
      return (data ?? []) as AgentRow[];
    },
    async countDraftsSince(owner: string, sinceIso: string): Promise<number> {
      const { count, error } = await sb
        .from("rwa_agent_drafts")
        .select("id", { count: "exact", head: true })
        .eq("owner", owner)
        .gte("created_at", sinceIso);
      if (error) throw new Error(`rwa_agent_drafts count failed: ${error.message}`);
      return count ?? 0;
    },
    async insertDrafts(rows: { owner: string; idea: ContentIdea }[]): Promise<number> {
      if (!rows.length) return 0;
      const { error } = await sb.from("rwa_agent_drafts").insert(rows.map((r) => ({ owner: r.owner, idea: r.idea, status: "queued" })));
      if (error) throw new Error(`rwa_agent_drafts insert failed: ${error.message}`);
      return rows.length;
    },
  };
}

/** IndexerDb adapter over the admin client (see mint_indexer.ts for the pure logic). */
export function indexerDb(sb: SupabaseClient): IndexerDb {
  return {
    async getCursor(key: string): Promise<bigint | null> {
      const { data, error } = await sb.from("rwa_sync_state").select("last_block").eq("key", key).maybeSingle();
      if (error) throw new Error(`rwa_sync_state read failed: ${error.message}`);
      return data?.last_block != null ? BigInt(data.last_block) : null;
    },
    async setCursor(key: string, block: bigint): Promise<void> {
      const { error } = await sb
        .from("rwa_sync_state")
        .upsert({ key, last_block: block.toString(), updated_at: new Date().toISOString() }, { onConflict: "key" });
      if (error) throw new Error(`rwa_sync_state write failed: ${error.message}`);
    },
    async upsertMints(rows: MintRow[]): Promise<number> {
      if (!rows.length) return 0;
      const { error } = await sb.from("rwa_minted_events").upsert(
        rows.map((r) => ({
          tx_hash: r.txHash,
          log_index: r.logIndex,
          block_number: r.blockNumber,
          minter: r.minter,
          quantity: r.quantity,
          total_paid: r.totalPaid,
          total_usdt: r.totalUsdt,
          referral_id: r.referralId,
        })),
        { onConflict: "tx_hash,log_index" },
      );
      if (error) throw new Error(`rwa_minted_events upsert failed: ${error.message}`);
      return rows.length;
    },
  };
}

/** MemoryProvider adapter over the admin client (see agent_memory.ts / agent_scheduler.ts). */
export function memoryProvider(sb: SupabaseClient): import("./agent_scheduler").MemoryProvider {
  return {
    async load(owner) {
      const { data, error } = await sb.from("rwa_agent_memory").select("weights, posts, updated_at").eq("owner", owner).maybeSingle();
      if (error || !data) return null;
      // updated_at doubles as the last-reinforced high-water-mark the scheduler windows from.
      return {
        owner,
        weights: (data.weights as Record<string, number>) ?? {},
        posts: Number(data.posts) || 0,
        lastReinforcedIso: typeof data.updated_at === "string" ? data.updated_at : undefined,
      };
    },
    async save(owner, memory) {
      const { error } = await sb.from("rwa_agent_memory").upsert(
        { owner, weights: memory.weights, posts: memory.posts, updated_at: new Date().toISOString() },
        { onConflict: "owner" },
      );
      // A missing rwa_agent_memory table (migration 0007 not applied) would otherwise fail silently
      // and the agent would never appear to learn — surface it.
      if (error) console.warn(`rwa_agent_memory upsert failed for ${owner}: ${error.message}`);
    },
    async recentUsd(owner, sinceIso) {
      const { data: amb } = await sb.from("rwa_ambassadors").select("ref_code").eq("owner", owner).maybeSingle();
      const code = amb?.ref_code;
      if (!code) return 0;
      const { data } = await sb.from("rwa_minted_events").select("total_usdt").eq("referral_id", code).gte("created_at", sinceIso).limit(5000);
      let wei = 0n;
      for (const r of data ?? []) { try { wei += BigInt(String(r.total_usdt)); } catch { /* skip */ } }
      return Number(wei) / 1e18;
    },
    async postedSince(owner, sinceIso) {
      const { data } = await sb.from("rwa_agent_drafts").select("idea").eq("owner", owner).eq("status", "posted").gte("created_at", sinceIso).limit(500);
      const out: import("./autopilot").ContentIdea[] = [];
      for (const r of data ?? []) {
        const idea = r.idea as Partial<import("./autopilot").ContentIdea> | null;
        if (idea && typeof idea.platform === "string" && typeof idea.presetId === "string") out.push(idea as import("./autopilot").ContentIdea);
      }
      return out;
    },
  };
}
