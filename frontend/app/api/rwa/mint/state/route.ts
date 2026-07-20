import { NextResponse } from "next/server";
import { RWA_WATCH_NFT_ADDRESS, RWA_WATCH_NFT_CHAIN_ID, RWA_WATCH_NFT_EXPLORER } from "@/lib/rwa/abi/rwaWatchNft";
import { readMintState } from "@/lib/rwa/rwa_watch_nft";

// Live state of Peter's RwaWatchNft mint (Apothem) — price in XDC, supply, threshold, etc.
// Reads the deployed contract via a public RPC, so our app shows the real on-chain numbers.

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const state = await readMintState();
    return NextResponse.json({
      contract: RWA_WATCH_NFT_ADDRESS,
      chainId: RWA_WATCH_NFT_CHAIN_ID,
      explorer: RWA_WATCH_NFT_EXPLORER,
      ...state,
    });
  } catch (err) {
    return NextResponse.json({ error: "read_failed", message: String(err instanceof Error ? err.message : err) }, { status: 502 });
  }
}
