import { NextResponse, type NextRequest } from "next/server";
import { authHeader, baseUrl, normalizeImageStatus, readHiggsfieldCreds } from "@/lib/rwa/higgsfield";
import { readQwenKey } from "@/lib/rwa/qwen";
import { fetchImageTask } from "@/lib/rwa/qwen_image";

// Poll a live compose-image job created by /api/rwa/compose — Higgsfield by default, or DashScope
// (Alibaba-native Wanx) when ?provider=qwen. Returns a normalized { state, image_url } the studio
// polls until the composed frame is ready. Off by default.

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json({ error: "missing_id", message: "Pass ?id=<request_id>." }, { status: 400 });
  }
  // Synchronous providers encode the URL directly; nothing to poll.
  if (id.startsWith("sync:")) {
    return NextResponse.json({ request_id: id, state: "completed", image_url: id.slice(5), done: true });
  }

  // Alibaba-native (DashScope Wanx) polling.
  if (req.nextUrl.searchParams.get("provider") === "qwen") {
    if (!readQwenKey()) {
      return NextResponse.json({ status: "unavailable", error: "live_disabled", message: "No DashScope key configured." }, { status: 200 });
    }
    try {
      const s = await fetchImageTask(id);
      return NextResponse.json({ request_id: id, provider: "qwen", state: s.state, image_url: s.image_url, done: s.state === "succeeded" || s.state === "failed" });
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
    const res = await fetch(`${baseUrl()}/requests/${encodeURIComponent(id)}/status`, {
      headers: { Authorization: authHeader(creds) },
      cache: "no-store",
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((json && (json.message || json.error)) || `HTTP ${res.status}`);
    const s = normalizeImageStatus(json);
    return NextResponse.json({
      request_id: id,
      state: s.state,
      image_url: s.image_url,
      done: s.state === "completed" || s.state === "failed" || s.state === "nsfw",
    });
  } catch (err) {
    return NextResponse.json(
      { request_id: id, status: "error", error: String(err instanceof Error ? err.message : err) },
      { status: 502 },
    );
  }
}
