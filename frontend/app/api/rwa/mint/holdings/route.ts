import { NextResponse, type NextRequest } from "next/server";
import { type Address, isAddress } from "viem";
import { fractionBalance } from "@/lib/rwa/rwa_watch_nft";

// How many RWAXDC fractions an address holds + the redeem threshold — progress to a physical watch.

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address")?.trim();
  if (!address || !isAddress(address)) {
    return NextResponse.json({ error: "bad_address", message: "Pass a valid ?address=." }, { status: 400 });
  }
  try {
    return NextResponse.json(await fractionBalance(address as Address));
  } catch (err) {
    return NextResponse.json({ error: "read_failed", message: String(err instanceof Error ? err.message : err) }, { status: 502 });
  }
}
