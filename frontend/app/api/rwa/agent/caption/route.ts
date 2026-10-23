import { NextResponse, type NextRequest } from "next/server";
import { captionProvider, type CaptionInput, llmCaption } from "@/lib/rwa/llm";
import { guardProviderSpend, readProviderBody } from "@/lib/rwa/provider_guard";

// The Managed Agent's caption writer. Returns an LLM caption via the active provider — Qwen
// (DashScope) or Anthropic, per captionProvider() — else source:"disabled" so the client keeps the
// template caption (captions.ts). No key = no cost. The response reports which provider ran.

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const parsed = await readProviderBody<Partial<CaptionInput>>(req);
  if ("response" in parsed) return parsed.response;
  const body = parsed.body;
  for (const value of [body.watchTitle, body.styleTitle, body.personaName, body.platform, body.team]) {
    if (value != null && (typeof value !== "string" || value.length > 300)) return NextResponse.json({ error: "invalid_caption_field" }, { status: 400 });
  }
  const input: CaptionInput = {
    watchTitle: String(body.watchTitle || "the watch"),
    styleTitle: String(body.styleTitle || "showcase"),
    personaName: String(body.personaName || "the creator"),
    platform: String(body.platform || "TikTok"),
    team: body.team ?? null,
  };
  const provider = captionProvider();
  if (!provider) return NextResponse.json({ source: "disabled", provider: null, caption: null });
  const denied = await guardProviderSpend(req, "caption");
  if (denied) return denied;
  const caption = await llmCaption(input);
  return NextResponse.json({ source: caption ? (provider ?? "llm") : "disabled", provider, caption });
}
