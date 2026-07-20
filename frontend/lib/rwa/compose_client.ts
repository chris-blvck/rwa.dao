// Client-side polling for a live compose-image job (stage 1). Mirrors generate_client.pollGeneration
// but resolves an image_url. Deps injectable for unit tests.

export type ComposeResult = { image_url: string | null; failed: boolean; state: string };

export type ComposePollOptions = {
  intervalMs?: number;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
};

export async function pollCompose(pollUrl: string, opts: ComposePollOptions = {}): Promise<ComposeResult> {
  const intervalMs = opts.intervalMs ?? 2500;
  const timeoutMs = opts.timeoutMs ?? 90 * 1000; // still generation is faster than video
  const f = opts.fetchImpl ?? fetch;
  const sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  const now = opts.now ?? (() => Date.now());
  const start = now();

  for (;;) {
    let json: Record<string, unknown> = {};
    try {
      const res = await f(pollUrl, { cache: "no-store" });
      json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    } catch {
      /* transient — keep polling until timeout */
    }
    const state = String(json.state ?? json.status ?? "");
    const imageUrl = typeof json.image_url === "string" ? json.image_url : null;
    if (imageUrl) return { image_url: imageUrl, failed: false, state };
    if (state === "failed" || state === "nsfw" || json.done === true) {
      return { image_url: null, failed: true, state: state || "failed" };
    }
    if (now() - start > timeoutMs) return { image_url: null, failed: true, state: "timeout" };
    await sleep(intervalMs);
  }
}
