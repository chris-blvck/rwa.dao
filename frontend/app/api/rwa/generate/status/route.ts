import { NextResponse, type NextRequest } from "next/server";
import { fetchJobStatus, readHiggsfieldCreds } from "@/lib/rwa/higgsfield";
import { readQwenKey } from "@/lib/rwa/qwen";
import { fetchVideoTask } from "@/lib/rwa/qwen_video";

// Poll a live generation job created by /api/rwa/generate — Higgsfield by default, or DashScope
// (Alibaba-native, Wan/HappyHorse) when ?provider=qwen. Returns a normalized { state, video_url }.
// Off by default: with no key configured it reports live_disabled instead of calling out.

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json({ error: "missing_id", message: "Pass ?id=<request_id>." }, { status: 400 });
  }

  // Alibaba-native (DashScope) polling.
  if (req.nextUrl.searchParams.get("provider") === "qwen") {
    if (!readQwenKey()) {
      return NextResponse.json({ status: "unavailable", error: "live_disabled", message: "No DashScope key configured." }, { status: 200 });
    }
    try {
      const s = await fetchVideoTask(id);
      return NextResponse.json({ request_id: id, provider: "qwen", state: s.state, video_url: s.video_url, done: s.state === "succeeded" || s.state === "failed" });
    } catch (err) {
      return NextResponse.json({ request_id: id, status: "error", error: String(err instanceof Error ? err.message : err) }, { status: 502 });
    }
  }

  const creds = readHiggsfieldCreds();
  if (!creds) {
    return NextResponse.json(
      { status: "unavailable", error: "live_disabled", message: "No Higgsfield key configured; live polling is off." },
      { status: 200 },
    );
  }

  try {
    const s = await fetchJobStatus(creds, id);
    return NextResponse.json({
      request_id: id,
      state: s.state, // queued | in_progress | completed | failed | nsfw | unknown
      video_url: s.video_url,
      done: s.state === "completed" || s.state === "failed" || s.state === "nsfw",
    });
  } catch (err) {
    return NextResponse.json(
      { request_id: id, status: "error", error: String(err instanceof Error ? err.message : err) },
      { status: 502 },
    );
  }
}
