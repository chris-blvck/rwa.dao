// Provider preflight — a config diagnostic for the Qwen / Alibaba path. The moment the DashScope
// key lands, this answers "is the reasoning + generation path actually configured correctly?"
// WITHOUT running a (costly) generation: it reports key presence, the active providers, and the
// resolved DashScope video model ids + endpoint so they can be confirmed against the console.
//
// Pure + env-injected → unit-tested. The route layers an optional tiny live LLM probe on top.

import { captionProvider } from "./llm";
import { readQwenKey } from "./qwen";
import { dashscopeVideoBase, dashscopeVideoModel, qwenVideoActive } from "./qwen_video";

export type PreflightReport = {
  llm: {
    provider: "qwen" | "anthropic" | null;
    qwenKey: boolean;
    anthropicKey: boolean;
    reachable: boolean | null; // null = not probed (config-only)
    sample: string | null;
  };
  video: {
    active: boolean; // RWA_VIDEO_PROVIDER=qwen + a key
    liveAllowed: boolean; // RWA_ALLOW_LIVE_GENERATION=1
    base: string;
    models: { wan_i2v: string; wan_t2v: string; happyhorse_i2v: string; happyhorse_t2v: string };
  };
  ready: boolean; // the agent's reasoning path is configured (a caption provider is active)
  notes: string[];
};

/** Assemble the preflight report from env. `probe` carries an optional live-LLM check result. */
export function buildPreflightReport(
  env: Record<string, string | undefined> = process.env,
  probe?: { reachable: boolean | null; sample: string | null },
): PreflightReport {
  const provider = captionProvider(env);
  const qwenKey = !!readQwenKey(env);
  const anthropicKey = !!env.ANTHROPIC_API_KEY;
  const videoActive = qwenVideoActive(env);
  const liveAllowed = env.RWA_ALLOW_LIVE_GENERATION === "1";

  const notes: string[] = [];
  if (!qwenKey && !anthropicKey) notes.push("No LLM key set — agent captions fall back to the deterministic template (zero cost).");
  if (qwenKey && provider !== "qwen") notes.push("A DashScope key is present but another provider is active — set RWA_LLM_PROVIDER=qwen to force Qwen.");
  if (videoActive && !liveAllowed) notes.push("Qwen video provider is set but RWA_ALLOW_LIVE_GENERATION!=1 — generation stays prepared-only (no credits burned).");
  if (videoActive) notes.push("Confirm the video model ids below against the DashScope console before the first live generation (override via QWEN_* env).");
  if (probe && probe.reachable === false) notes.push("Live probe failed — the key/base/auth didn't return a completion. Check DASHSCOPE_API_KEY and DASHSCOPE_BASE_URL.");

  return {
    llm: { provider, qwenKey, anthropicKey, reachable: probe?.reachable ?? null, sample: probe?.sample ?? null },
    video: {
      active: videoActive,
      liveAllowed,
      base: dashscopeVideoBase(env),
      models: {
        wan_i2v: dashscopeVideoModel("wan", true, env),
        wan_t2v: dashscopeVideoModel("wan", false, env),
        happyhorse_i2v: dashscopeVideoModel("happyhorse", true, env),
        happyhorse_t2v: dashscopeVideoModel("happyhorse", false, env),
      },
    },
    ready: !!provider,
    notes,
  };
}
