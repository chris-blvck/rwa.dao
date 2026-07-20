// Managed Agent config persistence — cloud (Supabase rwa_agents) when the anon session is up, else
// localStorage. Reuses the anonymous session established by lib/rwa/library.ts (initLibrary), so the
// agent config follows the user (owner-scoped RLS). Everything degrades to localStorage transparently.

import { getSupabaseBrowser } from "./supabase";
import { type AgentConfig, normalizeAgentConfig } from "./agent";
import { getAgentConfig as localGet, saveAgentConfig as localSave } from "./storage";

async function currentUid(): Promise<string | null> {
  const sb = getSupabaseBrowser();
  if (!sb) return null;
  try {
    const { data } = await sb.auth.getSession();
    return data.session?.user?.id ?? null;
  } catch {
    return null;
  }
}

/** Load the agent config (cloud first, then local), mirroring cloud → local for offline. */
export async function loadAgentConfig(): Promise<AgentConfig> {
  const sb = getSupabaseBrowser();
  const uid = await currentUid();
  if (sb && uid) {
    try {
      const { data, error } = await sb.from("rwa_agents").select("enabled, config").eq("owner", uid).maybeSingle();
      if (!error && data) {
        const cfg = normalizeAgentConfig({ ...(data.config as Partial<AgentConfig> | null), enabled: Boolean(data.enabled) });
        localSave(cfg);
        return cfg;
      }
    } catch {
      /* fall through to local */
    }
  }
  return localGet();
}

/** Persist the agent config to localStorage always, and to the cloud when signed in. */
export async function saveAgentConfig(cfg: AgentConfig): Promise<void> {
  localSave(cfg);
  const sb = getSupabaseBrowser();
  const uid = await currentUid();
  if (sb && uid) {
    try {
      await sb.from("rwa_agents").upsert({ owner: uid, enabled: cfg.enabled, config: cfg }, { onConflict: "owner" });
    } catch {
      /* offline / not configured — local copy already saved */
    }
  }
}
