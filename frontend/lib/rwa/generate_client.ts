// Client-side polling for a live Higgsfield generation job.
//
// /api/rwa/generate returns { status:"generating", poll_url } when live generation is on. The
// studio then calls pollGeneration(poll_url) which polls /api/rwa/generate/status until the video
// is ready (video_url), the job fails, or a timeout is hit. Deps are injectable so it's unit-tested
// without a real clock or network.

export type PollResult = { video_url: string | null; failed: boolean; state: string };

export type PollOptions = {
  intervalMs?: number;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
};

export async function pollGeneration(pollUrl: string, opts: PollOptions = {}): Promise<PollResult> {
  const intervalMs = opts.intervalMs ?? 4000;
  const timeoutMs = opts.timeoutMs ?? 6 * 60 * 1000; // Seedance/DOP runs take a few minutes
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
    const videoUrl = typeof json.video_url === "string" ? json.video_url : null;
    if (videoUrl) return { video_url: videoUrl, failed: false, state };
    if (state === "failed" || state === "nsfw" || json.done === true) {
      return { video_url: null, failed: true, state: state || "failed" };
    }
    if (now() - start > timeoutMs) return { video_url: null, failed: true, state: "timeout" };
    await sleep(intervalMs);
  }
}
