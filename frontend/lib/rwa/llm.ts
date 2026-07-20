// LLM caption generation for the Managed Agent (server-side).
//
// Provider-aware: RWA_LLM_PROVIDER=qwen (or a DashScope key when no Anthropic key) writes captions
// via Qwen on Alibaba Cloud Model Studio — the agent's brain for the Qwen Cloud path; otherwise
// ANTHROPIC_API_KEY uses Claude. With neither, the caller falls back to the template (captions.ts).
// Raw fetch, no SDK. Cheap models by default; override via AGENT_LLM_MODEL / QWEN_MODEL.

import { qwenChat, readQwenKey } from "./qwen";

export type CaptionInput = {
  watchTitle: string;
  styleTitle: string;
  personaName: string;
  platform: string;
  team?: string | null;
  /**
   * A short summary of what the creator's audience has historically responded to (from the
   * MemoryAgent). When present, the LLM is told to lean into it — this is the "reasoning on Qwen,
   * informed by real on-chain outcomes" loop (Qwen Cloud track).
   */
  memoryHint?: string;
};

const DEFAULT_MODEL = "claude-haiku-4-5-20251001"; // cheap, fine for captions

export function buildCaptionPrompt(input: CaptionInput): string {
  const teamLine = input.team && input.team !== "none" ? ` It's the ${input.team} World Cup special edition.` : "";
  const tags = input.platform.toLowerCase() === "x" ? "no hashtags" : "2–3 relevant hashtags";
  const memLine = input.memoryHint?.trim() ? ` This creator's audience responds best to ${input.memoryHint.trim()} — lean into that.` : "";
  return (
    `Write a short, punchy ${input.platform} caption promoting the "${input.watchTitle}" luxury ` +
    `RWA-DAO watch, in a ${input.styleTitle} style, as creator ${input.personaName}.${teamLine}${memLine} ` +
    `One or two sentences, ${tags}. Not financial advice. Output ONLY the caption text.`
  );
}

/** Which caption provider is active given the env (explicit override, else key presence). */
export function captionProvider(env: Record<string, string | undefined> = process.env): "qwen" | "anthropic" | null {
  const pref = (env.RWA_LLM_PROVIDER || "").toLowerCase();
  if (pref === "qwen") return readQwenKey(env) ? "qwen" : null;
  if (pref === "anthropic") return env.ANTHROPIC_API_KEY ? "anthropic" : null;
  if (env.ANTHROPIC_API_KEY) return "anthropic";
  if (readQwenKey(env)) return "qwen"; // Alibaba-native path
  return null;
}

/** Generate a caption via the active provider. Returns null when unavailable (caller falls back). */
export async function llmCaption(
  input: CaptionInput,
  opts?: { apiKey?: string; model?: string; fetchImpl?: typeof fetch },
): Promise<string | null> {
  // Qwen (Alibaba Cloud Model Studio) — the agent's brain for the Qwen Cloud path.
  if (captionProvider() === "qwen") {
    return qwenChat(
      [
        { role: "system", content: "You write short, punchy luxury-watch social captions. Never give financial advice. Output ONLY the caption." },
        { role: "user", content: buildCaptionPrompt(input) },
      ],
      { model: opts?.model, fetchImpl: opts?.fetchImpl, maxTokens: 220 },
    );
  }

  const apiKey = opts?.apiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  const f = opts?.fetchImpl ?? fetch;
  try {
    const res = await f("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: opts?.model ?? process.env.AGENT_LLM_MODEL ?? DEFAULT_MODEL,
        max_tokens: 220,
        messages: [{ role: "user", content: buildCaptionPrompt(input) }],
      }),
      cache: "no-store",
    });
    const json = (await res.json().catch(() => ({}))) as { content?: Array<{ text?: string }> };
    const text = json?.content?.[0]?.text;
    return typeof text === "string" && text.trim() ? text.trim() : null;
  } catch {
    return null;
  }
}
