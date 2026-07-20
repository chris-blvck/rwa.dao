import { NextResponse, type NextRequest } from "next/server";
import { buildPreflightReport } from "@/lib/rwa/preflight";
import { captionProvider } from "@/lib/rwa/llm";
import { qwenChat } from "@/lib/rwa/qwen";

// Provider preflight — confirm the Qwen / Alibaba path is configured correctly the moment the key
// lands, without running a (costly) generation. Auth-guarded by CRON_SECRET, like /agent/run.
//
// Default: CONFIG-ONLY — makes NO external calls, just reports key presence + resolved model ids.
// ?probe=1: additionally fires ONE tiny Qwen chat (max 5 tokens) to confirm the key/base/auth work.
// The probe is opt-in so the default check never incurs any provider cost.

export const dynamic = "force-dynamic";

async function handle(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "unauthorized", message: "Set CRON_SECRET and pass it as Authorization: Bearer." }, { status: 401 });
  }

  let reachable: boolean | null = null;
  let sample: string | null = null;
  if (req.nextUrl.searchParams.get("probe") === "1" && captionProvider() === "qwen") {
    // Cheapest possible live check: one ~5-token completion. Confirms key + base + auth end-to-end.
    const out = await qwenChat([{ role: "user", content: "Reply with the single word: OK" }], { maxTokens: 5 });
    reachable = out != null;
    sample = out;
  }

  const report = buildPreflightReport(process.env, { reachable, sample });
  return NextResponse.json({ ok: report.ready, ...report }, { status: 200 });
}

export async function GET(req: NextRequest) {
  return handle(req);
}
export async function POST(req: NextRequest) {
  return handle(req);
}
