// Qwen / Alibaba Cloud Model Studio (DashScope) adapter — the LLM brain for the Managed Agent.
//
// Uses DashScope's OpenAI-COMPATIBLE endpoint (documented, stable):
//   POST {base}/chat/completions   Authorization: Bearer <DASHSCOPE_API_KEY>
//   body { model, messages:[{role,content}], max_tokens }  → { choices:[{message:{content}}] }
// Base defaults to the international host; override with DASHSCOPE_BASE_URL (e.g. the Beijing host).
//
// Env-gated: returns null when no key is set, so nothing calls out unless configured. Wired as an
// alternative caption/ideation provider (RWA_LLM_PROVIDER=qwen) and the foundation for the
// Alibaba-native path (Qwen Cloud hackathon: run the agent's reasoning on Alibaba's own APIs).

export const DASHSCOPE_BASE_DEFAULT = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";

/** Read the DashScope/Qwen API key. */
export function readQwenKey(env: Record<string, string | undefined> = process.env): string | null {
  return env.DASHSCOPE_API_KEY?.trim() || env.QWEN_API_KEY?.trim() || null;
}

export function qwenBase(env: Record<string, string | undefined> = process.env): string {
  return (env.DASHSCOPE_BASE_URL || DASHSCOPE_BASE_DEFAULT).replace(/\/+$/, "");
}

/** Default chat model — override with QWEN_MODEL (e.g. qwen-plus, qwen3-max). */
export function qwenModel(env: Record<string, string | undefined> = process.env): string {
  return env.QWEN_MODEL || "qwen-max";
}

export type QwenMessage = { role: "system" | "user" | "assistant"; content: string };

/** One chat completion via DashScope (OpenAI-compatible). Returns the text, or null on any error. */
export async function qwenChat(
  messages: QwenMessage[],
  opts?: { apiKey?: string; model?: string; maxTokens?: number; fetchImpl?: typeof fetch; env?: Record<string, string | undefined> },
): Promise<string | null> {
  const env = opts?.env ?? process.env;
  const apiKey = opts?.apiKey ?? readQwenKey(env);
  if (!apiKey) return null;
  const f = opts?.fetchImpl ?? fetch;
  try {
    const res = await f(`${qwenBase(env)}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: opts?.model ?? qwenModel(env),
        messages,
        max_tokens: opts?.maxTokens ?? 260,
      }),
      cache: "no-store",
    });
    const json = (await res.json().catch(() => ({}))) as { choices?: Array<{ message?: { content?: string } }> };
    const text = json?.choices?.[0]?.message?.content;
    return typeof text === "string" && text.trim() ? text.trim() : null;
  } catch {
    return null;
  }
}
