import { NextResponse, type NextRequest } from "next/server";
import { MINT_SYNC_KEY } from "@/lib/rwa/mint_indexer";
import { conversionsForReferral, type ReferralConversions } from "@/lib/rwa/rwa_watch_nft";
import { getSupabaseAdmin } from "@/lib/rwa/supabase_admin";

// Attribution: how many mints (and how much USD) a creator's referralId drove on Peter's contract.
// Reads Minted events → the on-chain, can't-be-faked "conversions" that anchor content rewards.
// Source order: the incremental index (rwa_minted_events — full history, instant) when the indexer has
// synced; else the bounded live chunked scan (recent blocks). Best-effort: never 502s the dashboard.

export const dynamic = "force-dynamic";

/** Aggregate a creator's conversions from the index. null = index unavailable/cold → fall back. */
async function conversionsFromIndex(ref: string): Promise<ReferralConversions | null> {
  const sb = getSupabaseAdmin();
  if (!sb) return null;
  try {
    const { data: cur, error: curErr } = await sb.from("rwa_sync_state").select("last_block").eq("key", MINT_SYNC_KEY).maybeSingle();
    if (curErr || !cur) return null; // indexer never ran → cold
    const { data, error } = await sb.from("rwa_minted_events").select("quantity, total_usdt").eq("referral_id", ref).limit(10000);
    if (error) return null;
    let fractions = 0n;
    let totalUsdtWei = 0n;
    for (const r of data ?? []) {
      fractions += BigInt(String(r.quantity));
      totalUsdtWei += BigInt(String(r.total_usdt));
    }
    return {
      referralId: ref,
      mints: (data ?? []).length,
      fractions: fractions.toString(),
      totalUsdtWei: totalUsdtWei.toString(),
      scannedFromBlock: "0",
      scannedToBlock: String(cur.last_block),
      partial: false, // the index is contiguous from the deploy block
    };
  } catch {
    return null;
  }
}

// Small in-memory cache (per server instance) so repeated dashboard mounts don't re-scan the chain.
const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { at: number; data: ReferralConversions }>();

export async function GET(req: NextRequest) {
  const ref = req.nextUrl.searchParams.get("ref")?.trim();
  if (!ref) {
    return NextResponse.json({ error: "missing_ref", message: "Pass ?ref=<referralId>." }, { status: 400 });
  }
  const now = Date.now();
  const hit = cache.get(ref);
  if (hit && now - hit.at < CACHE_TTL_MS) {
    return NextResponse.json({ ...hit.data, cached: true });
  }
  try {
    const indexed = await conversionsFromIndex(ref);
    const conversions = indexed ?? (await conversionsForReferral(ref));
    cache.set(ref, { at: now, data: conversions });
    return NextResponse.json({ ...conversions, source: indexed ? "index" : "live_scan" });
  } catch (err) {
    // Genuinely unexpected (not a per-chunk range error, which the scanner already swallows).
    return NextResponse.json(
      { referralId: ref, mints: 0, fractions: "0", totalUsdtWei: "0", partial: true, error: "read_failed", message: String(err instanceof Error ? err.message : err) },
      { status: 200 },
    );
  }
}
