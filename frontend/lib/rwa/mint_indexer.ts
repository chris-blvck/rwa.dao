// Incremental Minted-event indexer — fills public.rwa_minted_events so conversion attribution serves the
// FULL history instantly (the live chunked scan only covers recent blocks; see rwa_watch_nft.ts).
//
// Runs inside the cron (POST /api/rwa/agent/run, service role). Each run advances a contiguous
// cursor (rwa_sync_state) by up to window×maxChunks blocks — a failed RPC chunk stops the run at
// the last contiguous block so no event can ever be skipped. Pure logic with injected DB + chain
// (unit-tested); adapters live in supabase_admin.ts / viemChainReader below.

import { RWA_NFT_DEPLOY_BLOCK, publicClient, scanWindows } from "./rwa_watch_nft";
import { RWA_WATCH_NFT_ABI, RWA_WATCH_NFT_ADDRESS } from "./abi/rwaWatchNft";

export const MINT_SYNC_KEY = "rwa_minted_events:apothem";

export type MintRow = {
  txHash: string;
  logIndex: number;
  blockNumber: string; // bigint as string (JSON/DB-safe)
  minter: string;
  quantity: string;
  totalPaid: string;
  totalUsdt: string;
  referralId: string;
};

export type IndexerDb = {
  getCursor(key: string): Promise<bigint | null>;
  setCursor(key: string, block: bigint): Promise<void>;
  upsertMints(rows: MintRow[]): Promise<number>;
};

export type ChainReader = {
  getBlockNumber(): Promise<bigint>;
  /** Minted events in [fromBlock, toBlock] — throws on RPC failure (range too wide, outage…). */
  getMintedEvents(fromBlock: bigint, toBlock: bigint): Promise<MintRow[]>;
};

export type IndexResult = {
  fromBlock: string;
  toBlock: string; // last contiguously indexed block this run
  inserted: number;
  caughtUp: boolean; // reached the chain head
};

/** Advance the index by up to window×maxChunks blocks. Contiguous-only: never skips a failed chunk. */
export async function indexNewMints(
  db: IndexerDb,
  chain: ChainReader,
  opts?: { window?: bigint; maxChunks?: number; concurrency?: number },
): Promise<IndexResult> {
  const window = opts?.window ?? BigInt(process.env.RWA_NFT_LOG_WINDOW || "1000");
  const maxChunks = Math.max(1, opts?.maxChunks ?? Number(process.env.RWA_NFT_INDEX_CHUNKS || "40"));
  const concurrency = Math.max(1, opts?.concurrency ?? 5);

  const latest = await chain.getBlockNumber();
  const cursor = (await db.getCursor(MINT_SYNC_KEY)) ?? RWA_NFT_DEPLOY_BLOCK - 1n;
  const from = cursor + 1n;
  if (from > latest) {
    return { fromBlock: from.toString(), toBlock: cursor.toString(), inserted: 0, caughtUp: true };
  }
  const capEnd = from + window * BigInt(maxChunks) - 1n;
  const to = capEnd < latest ? capEnd : latest;
  const ranges = scanWindows(from, to, window);

  let inserted = 0;
  let lastGood = cursor;
  outer: for (let i = 0; i < ranges.length; i += concurrency) {
    const batch = ranges.slice(i, i + concurrency);
    const settled = await Promise.all(
      batch.map(async (r) => {
        try {
          return { ok: true as const, rows: await chain.getMintedEvents(r.from, r.to), to: r.to };
        } catch {
          return { ok: false as const, rows: [] as MintRow[], to: r.to };
        }
      }),
    );
    // Advance only through the contiguous prefix of successes — a gap would lose events forever.
    for (const s of settled) {
      if (!s.ok) break outer;
      if (s.rows.length) inserted += await db.upsertMints(s.rows);
      lastGood = s.to;
    }
  }
  if (lastGood > cursor) await db.setCursor(MINT_SYNC_KEY, lastGood);
  return {
    fromBlock: from.toString(),
    toBlock: lastGood.toString(),
    inserted,
    caughtUp: lastGood === latest,
  };
}

/** viem-backed ChainReader over the real contract. */
export function viemChainReader(client = publicClient()): ChainReader {
  return {
    getBlockNumber: () => client.getBlockNumber(),
    async getMintedEvents(fromBlock: bigint, toBlock: bigint): Promise<MintRow[]> {
      const logs = await client.getContractEvents({
        address: RWA_WATCH_NFT_ADDRESS,
        abi: RWA_WATCH_NFT_ABI,
        eventName: "Minted",
        fromBlock,
        toBlock,
      });
      return logs.map((l) => {
        const a = l.args as { user?: string; quantity?: bigint; totalPaid?: bigint; totalUsdt?: bigint; referralId?: string };
        return {
          txHash: l.transactionHash ?? "",
          logIndex: l.logIndex ?? 0,
          blockNumber: (l.blockNumber ?? 0n).toString(),
          minter: a.user ?? "",
          quantity: (a.quantity ?? 0n).toString(),
          totalPaid: (a.totalPaid ?? 0n).toString(),
          totalUsdt: (a.totalUsdt ?? 0n).toString(),
          referralId: a.referralId ?? "",
        };
      });
    },
  };
}
