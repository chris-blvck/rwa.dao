// Integration with Peter's RwaWatchNft (fractional watch mint) on XDC Apothem.
//   • read the live mint state (price in XDC, supply, threshold…)
//   • mint fractions with a creator's referralId (native XDC)
//   • attribute conversions: sum Minted events carrying a creator's referralId → feeds rewards
// Reads use a public RPC; the mint tx is sent from the user's wallet.

import { type Address, type Hex, createPublicClient, encodeFunctionData, http } from "viem";
import { RWA_WATCH_NFT_ABI, RWA_WATCH_NFT_ADDRESS, RWA_WATCH_NFT_RPC } from "./abi/rwaWatchNft";

export function publicClient(rpc: string = process.env.XDC_RPC_URL || RWA_WATCH_NFT_RPC) {
  return createPublicClient({ transport: http(rpc) });
}

export type MintState = {
  priceXdcWei: string; // pay this * quantity as msg.value
  priceUsdt: string; // USD per fraction (18dp)
  priceIncrementUsdt: string;
  totalSupply: string;
  maxMintPerTx: string;
  mintingEnabled: boolean;
  redemptionThreshold: string;
};

export async function readMintState(client = publicClient()): Promise<MintState> {
  const address = RWA_WATCH_NFT_ADDRESS;
  const abi = RWA_WATCH_NFT_ABI;
  const [priceXdc, priceUsdt, inc, supply, maxTx, enabled, threshold] = await Promise.all([
    client.readContract({ address, abi, functionName: "getMintPriceInXDC" }),
    client.readContract({ address, abi, functionName: "priceInUsdt" }),
    client.readContract({ address, abi, functionName: "priceIncrementUsdt" }),
    client.readContract({ address, abi, functionName: "totalSupply" }),
    client.readContract({ address, abi, functionName: "maxMintPerTx" }),
    client.readContract({ address, abi, functionName: "mintingEnabled" }),
    client.readContract({ address, abi, functionName: "redemptionThreshold" }),
  ]);
  return {
    priceXdcWei: (priceXdc as bigint).toString(),
    priceUsdt: (priceUsdt as bigint).toString(),
    priceIncrementUsdt: (inc as bigint).toString(),
    totalSupply: (supply as bigint).toString(),
    maxMintPerTx: (maxTx as bigint).toString(),
    mintingEnabled: enabled as boolean,
    redemptionThreshold: (threshold as bigint).toString(),
  };
}

/** Encode mint(quantity, referralId) calldata — pure, unit-testable. */
export function encodeMint(quantity: bigint, referralId: string): Hex {
  return encodeFunctionData({ abi: RWA_WATCH_NFT_ABI, functionName: "mint", args: [quantity, referralId] });
}

/** msg.value = price per fraction × quantity (read getMintPriceInXDC right before minting). */
export function mintValue(pricePerFractionWei: bigint, quantity: bigint): bigint {
  return pricePerFractionWei * quantity;
}

export type ReferralConversions = {
  referralId: string;
  mints: number;
  fractions: string;
  totalUsdtWei: string;
  scannedFromBlock?: string;
  scannedToBlock?: string;
  partial?: boolean; // true if the window was capped or some chunks failed (not the full history)
};

// RwaWatchNft deploy block on Apothem (empirically located — the scan never starts before it).
export const RWA_NFT_DEPLOY_BLOCK = 80_009_691n;

/**
 * Split an inclusive [from, to] block range into ascending windows of at most `window` blocks.
 * Pure + unit-tested: public RPCs (Ankr Apothem) reject eth_getLogs spans over ~1000 blocks, so
 * event scans must be chunked.
 */
export function scanWindows(from: bigint, to: bigint, window: bigint): { from: bigint; to: bigint }[] {
  if (window < 1n || to < from) return [];
  const out: { from: bigint; to: bigint }[] = [];
  let start = from;
  while (start <= to) {
    const end = start + window - 1n < to ? start + window - 1n : to;
    out.push({ from: start, to: end });
    start = end + 1n;
  }
  return out;
}

/**
 * Attribute conversions to a creator: sum the Minted events whose referralId matches.
 *
 * referralId isn't indexed, so we scan Minted logs and filter. The public RPC caps getLogs at
 * ~1000 blocks and the contract is ~3.5M blocks old, so a full scan is infeasible per request:
 * we scan the most recent `maxChunks × window` blocks (bounded, concurrent, best-effort — a failed
 * window is skipped, never fatal) which captures demo/recent mints. For full history in production,
 * set RWA_NFT_FROM_BLOCK to the deploy block on an archive RPC, or index Minted events off-chain.
 */
export async function conversionsForReferral(
  referralId: string,
  opts?: { client?: ReturnType<typeof publicClient>; fromBlock?: bigint; window?: bigint; maxChunks?: number },
): Promise<ReferralConversions> {
  const client = opts?.client ?? publicClient();
  const window = opts?.window ?? BigInt(process.env.RWA_NFT_LOG_WINDOW || "1000");
  const maxChunks = opts?.maxChunks ?? Number(process.env.RWA_NFT_MAX_CHUNKS || "60");
  const latest = await client.getBlockNumber();

  const deployFloor = process.env.RWA_NFT_FROM_BLOCK ? BigInt(process.env.RWA_NFT_FROM_BLOCK) : RWA_NFT_DEPLOY_BLOCK;
  const capStart = latest - window * BigInt(Math.max(1, maxChunks)) + 1n;
  let fromBlock = opts?.fromBlock ?? (capStart > deployFloor ? capStart : deployFloor);
  if (fromBlock < 0n) fromBlock = 0n;
  const cappedToWindow = fromBlock > deployFloor; // didn't reach the deploy block → not full history

  const ranges = scanWindows(fromBlock, latest, window);
  let mints = 0;
  let fractions = 0n;
  let totalUsdtWei = 0n;
  let chunksFailed = 0;
  const CONCURRENCY = 8;
  for (let i = 0; i < ranges.length; i += CONCURRENCY) {
    const batch = ranges.slice(i, i + CONCURRENCY);
    const settled = await Promise.all(
      batch.map(async (r) => {
        try {
          return await client.getContractEvents({ address: RWA_WATCH_NFT_ADDRESS, abi: RWA_WATCH_NFT_ABI, eventName: "Minted", fromBlock: r.from, toBlock: r.to });
        } catch {
          chunksFailed++;
          return [];
        }
      }),
    );
    for (const logs of settled) {
      for (const l of logs) {
        const args = l.args as { referralId?: string; quantity?: bigint; totalUsdt?: bigint };
        if (args.referralId === referralId && referralId !== "") {
          mints++;
          fractions += args.quantity ?? 0n;
          totalUsdtWei += args.totalUsdt ?? 0n;
        }
      }
    }
  }
  return {
    referralId,
    mints,
    fractions: fractions.toString(),
    totalUsdtWei: totalUsdtWei.toString(),
    scannedFromBlock: fromBlock.toString(),
    scannedToBlock: latest.toString(),
    partial: cappedToWindow || chunksFailed > 0,
  };
}

export function buildMintLink(referralId: string, origin = "https://rwadao.netlify.app"): string {
  return `${origin.replace(/\/+$/, "")}/?ref=${encodeURIComponent(referralId)}`;
}

/** How many fractions an address owns + the redemption threshold (progress to a physical watch). */
export async function fractionBalance(
  address: Address,
  client = publicClient(),
): Promise<{ fractions: string; threshold: string }> {
  const [bal, thr] = await Promise.all([
    client.readContract({ address: RWA_WATCH_NFT_ADDRESS, abi: RWA_WATCH_NFT_ABI, functionName: "balanceOf", args: [address] }),
    client.readContract({ address: RWA_WATCH_NFT_ADDRESS, abi: RWA_WATCH_NFT_ABI, functionName: "redemptionThreshold" }),
  ]);
  return { fractions: (bal as bigint).toString(), threshold: (thr as bigint).toString() };
}

// Content-referral points from real on-chain mint volume (off-chain accrual; converts to RWAX at
// withdrawal via Peter's flow). 10% of USD mint volume → points (1¢ = 1pt), matching the L1 rate.
export function pointsFromConversions(totalUsdtWei: string, ratePct = 0.1): number {
  const usd = Number(totalUsdtWei || "0") / 1e18;
  return Math.round(usd * ratePct * 100); // × POINTS_PER_USD (100)
}
