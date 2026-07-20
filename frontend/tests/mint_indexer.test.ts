import { describe, expect, it } from "vitest";
import { indexNewMints, MINT_SYNC_KEY, type ChainReader, type IndexerDb, type MintRow } from "@/lib/rwa/mint_indexer";
import { RWA_NFT_DEPLOY_BLOCK } from "@/lib/rwa/rwa_watch_nft";

function mint(block: bigint, i = 0): MintRow {
  return {
    txHash: `0xtx${block}`, logIndex: i, blockNumber: block.toString(),
    minter: "0xabc", quantity: "2", totalPaid: "1000", totalUsdt: "21000000000000000", referralId: "CODE1",
  };
}

function fakeDb(initialCursor: bigint | null = null) {
  let cursor = initialCursor;
  const upserted: MintRow[] = [];
  const db: IndexerDb = {
    getCursor: async () => cursor,
    setCursor: async (_k, b) => { cursor = b; },
    upsertMints: async (rows) => { upserted.push(...rows); return rows.length; },
  };
  return { db, upserted, cursor: () => cursor };
}

function fakeChain(latest: bigint, opts?: { eventsAt?: bigint[]; failFrom?: bigint }): ChainReader {
  return {
    getBlockNumber: async () => latest,
    getMintedEvents: async (from, to) => {
      if (opts?.failFrom !== undefined && to >= opts.failFrom) throw new Error("rpc range error");
      return (opts?.eventsAt ?? []).filter((b) => b >= from && b <= to).map((b) => mint(b));
    },
  };
}

describe("minted-event indexer", () => {
  it("starts at the deploy block on first run and advances the cursor", async () => {
    const { db, upserted, cursor } = fakeDb(null);
    const latest = RWA_NFT_DEPLOY_BLOCK + 2500n;
    const r = await indexNewMints(db, fakeChain(latest, { eventsAt: [RWA_NFT_DEPLOY_BLOCK + 10n] }), { window: 1000n, maxChunks: 10 });
    expect(r.fromBlock).toBe(RWA_NFT_DEPLOY_BLOCK.toString());
    expect(r.toBlock).toBe(latest.toString());
    expect(r.caughtUp).toBe(true);
    expect(upserted).toHaveLength(1);
    expect(cursor()).toBe(latest);
  });

  it("resumes from the stored cursor (incremental, no rescan)", async () => {
    const start = RWA_NFT_DEPLOY_BLOCK + 5000n;
    const { db } = fakeDb(start);
    const r = await indexNewMints(db, fakeChain(start + 800n), { window: 1000n, maxChunks: 10 });
    expect(r.fromBlock).toBe((start + 1n).toString());
    expect(r.caughtUp).toBe(true);
  });

  it("caps the work per run and reports not caught up", async () => {
    const { db, cursor } = fakeDb(null);
    const latest = RWA_NFT_DEPLOY_BLOCK + 100_000n;
    const r = await indexNewMints(db, fakeChain(latest), { window: 1000n, maxChunks: 5 });
    expect(BigInt(r.toBlock)).toBe(RWA_NFT_DEPLOY_BLOCK + 5000n - 1n);
    expect(r.caughtUp).toBe(false);
    expect(cursor()).toBe(RWA_NFT_DEPLOY_BLOCK + 5000n - 1n);
  });

  it("stops at the last contiguous block when a chunk fails (never skips events)", async () => {
    const { db, cursor } = fakeDb(null);
    const latest = RWA_NFT_DEPLOY_BLOCK + 10_000n;
    const failFrom = RWA_NFT_DEPLOY_BLOCK + 3000n; // chunks covering ≥ this block throw
    const r = await indexNewMints(db, fakeChain(latest, { failFrom }), { window: 1000n, maxChunks: 10, concurrency: 4 });
    expect(BigInt(r.toBlock)).toBeLessThan(failFrom);
    expect(r.caughtUp).toBe(false);
    expect(cursor()).toBe(BigInt(r.toBlock));
  });

  it("no-ops cleanly when already at the chain head", async () => {
    const head = RWA_NFT_DEPLOY_BLOCK + 42n;
    const { db } = fakeDb(head);
    const r = await indexNewMints(db, fakeChain(head));
    expect(r.inserted).toBe(0);
    expect(r.caughtUp).toBe(true);
  });

  it("uses a stable sync key", () => {
    expect(MINT_SYNC_KEY).toBe("rwa_minted_events:apothem");
  });
});
