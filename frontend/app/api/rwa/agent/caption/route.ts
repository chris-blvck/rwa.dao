import { NextResponse, type NextRequest } from "next/server";
import { captionProvider, type CaptionInput, llmCaption } from "@/lib/rwa/llm";

// The Managed Agent's caption writer. Returns an LLM caption via the active provider — Qwen
// (DashScope) or Anthropic, per captionProvider() — else source:"disabled" so the client keeps the
// template caption (captions.ts). No key = no cost. The response reports which provider ran.

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Partial<CaptionInput>;
  const input: CaptionInput = {
    watchTitle: String(body.watchTitle || "the watch"),
    styleTitle: String(body.styleTitle || "showcase"),
    personaName: String(body.personaName || "the creator"),
    platform: String(body.platform || "TikTok"),
    team: body.team ?? null,
  };
  const caption = await llmCaption(input);
  const provider = captionProvider();
  return NextResponse.json({ source: caption ? (provider ?? "llm") : "disabled", provider, caption });
}
