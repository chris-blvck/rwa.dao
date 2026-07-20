import { describe, expect, it, vi } from "vitest";
import { pollGeneration } from "@/lib/rwa/generate_client";

const noSleep = () => Promise.resolve();

function fetchReturning(sequence: unknown[]): typeof fetch {
  let i = 0;
  return (async () => {
    const body = sequence[Math.min(i, sequence.length - 1)];
    i++;
    return { json: async () => body } as Response;
  }) as unknown as typeof fetch;
}

describe("pollGeneration", () => {
  it("resolves with the video url once the job completes", async () => {
    const f = fetchReturning([
      { state: "queued" },
      { state: "in_progress" },
      { state: "completed", video_url: "https://v/out.mp4", done: true },
    ]);
    const r = await pollGeneration("/api/rwa/generate/status?id=x", { fetchImpl: f, sleep: noSleep });
    expect(r).toEqual({ video_url: "https://v/out.mp4", failed: false, state: "completed" });
  });

  it("reports failure when the job fails", async () => {
    const f = fetchReturning([{ state: "in_progress" }, { state: "failed", done: true }]);
    const r = await pollGeneration("/x", { fetchImpl: f, sleep: noSleep });
    expect(r.failed).toBe(true);
    expect(r.video_url).toBeNull();
  });

  it("times out and fails cleanly if the job never finishes", async () => {
    const f = fetchReturning([{ state: "in_progress" }]);
    let t = 0;
    const now = () => (t += 10_000); // advance 10s per read → crosses timeout quickly
    const r = await pollGeneration("/x", { fetchImpl: f, sleep: noSleep, now, timeoutMs: 15_000 });
    expect(r.failed).toBe(true);
    expect(r.state).toBe("timeout");
  });

  it("keeps polling through a transient network error", async () => {
    let i = 0;
    const f = (async () => {
      i++;
      if (i === 1) throw new Error("network");
      return { json: async () => ({ state: "completed", video_url: "https://v/ok.mp4" }) } as Response;
    }) as unknown as typeof fetch;
    const r = await pollGeneration("/x", { fetchImpl: f, sleep: noSleep });
    expect(r.video_url).toBe("https://v/ok.mp4");
    expect(i).toBeGreaterThanOrEqual(2);
  });

  it("passes cache:no-store to fetch", async () => {
    const spy = vi.fn(async () => ({ json: async () => ({ state: "completed", video_url: "u" }) }) as Response);
    await pollGeneration("/x", { fetchImpl: spy as unknown as typeof fetch, sleep: noSleep });
    expect(spy).toHaveBeenCalledWith("/x", { cache: "no-store" });
  });
});
