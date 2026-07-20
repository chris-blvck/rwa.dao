import { NextResponse } from "next/server";
import { XDC_USD_FALLBACK } from "@/lib/rwa/pricing";

// Live XDC/USD rate for token pricing. Fetched from CoinGecko (keyless) and cached ~60s so the
// studio always shows a near-real-time token price; falls back to a constant if the source fails.
export const revalidate = 60;

const COINGECKO =
  "https://api.coingecko.com/api/v3/simple/price?ids=xdce-crowd-sale&vs_currencies=usd&include_last_updated_at=true";

export async function GET() {
  try {
    const r = await fetch(COINGECKO, { next: { revalidate: 60 } });
    if (r.ok) {
      const j = (await r.json()) as { "xdce-crowd-sale"?: { usd?: number; last_updated_at?: number } };
      const usd = j["xdce-crowd-sale"]?.usd;
      if (typeof usd === "number" && usd > 0) {
        return NextResponse.json({ usd, source: "coingecko", at: j["xdce-crowd-sale"]?.last_updated_at ?? null });
      }
    }
  } catch {
    /* fall through to fallback */
  }
  return NextResponse.json({ usd: XDC_USD_FALLBACK, source: "fallback", at: null });
}
