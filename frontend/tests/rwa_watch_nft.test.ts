import { describe, expect, it } from "vitest";
import { buildMintLink, encodeMint, mintValue, pointsFromConversions } from "@/lib/rwa/rwa_watch_nft";

describe("rwa watch nft integration", () => {
  it("encodes mint(quantity, referralId) calldata deterministically", () => {
    const data = encodeMint(2n, "ABC123");
    expect(data.startsWith("0x")).toBe(true);
    expect(data).toBe(encodeMint(2n, "ABC123"));
  });

  it("distinguishes calldata by referralId (attribution is in the call)", () => {
    expect(encodeMint(2n, "ABC123")).not.toBe(encodeMint(2n, "XYZ789"));
  });

  it("computes msg.value = price per fraction × quantity", () => {
    expect(mintValue(1000n, 3n)).toBe(3000n);
    expect(mintValue(372538584353379457n, 2n)).toBe(745077168706758914n);
  });

  it("builds a creator referral mint link", () => {
    expect(buildMintLink("ABC123", "https://x.io/")).toBe("https://x.io/?ref=ABC123");
  });

  it("converts on-chain mint volume to off-chain points (10% × $1 = 10pt)", () => {
    expect(pointsFromConversions("0")).toBe(0);
    expect(pointsFromConversions((100n * 10n ** 18n).toString())).toBe(1000); // $100 → 10% → 1000pt
  });
});

import { scanWindows, RWA_NFT_DEPLOY_BLOCK } from "@/lib/rwa/rwa_watch_nft";

describe("scanWindows (chunked event scan)", () => {
  it("splits an inclusive range into ascending windows of at most `window`", () => {
    expect(scanWindows(0n, 2500n, 1000n)).toEqual([
      { from: 0n, to: 999n },
      { from: 1000n, to: 1999n },
      { from: 2000n, to: 2500n },
    ]);
  });
  it("returns a single window when the range fits", () => {
    expect(scanWindows(100n, 500n, 1000n)).toEqual([{ from: 100n, to: 500n }]);
  });
  it("guards against empty/invalid ranges", () => {
    expect(scanWindows(500n, 100n, 1000n)).toEqual([]);
    expect(scanWindows(0n, 100n, 0n)).toEqual([]);
  });
  it("never produces a window wider than the RPC limit", () => {
    const ranges = scanWindows(RWA_NFT_DEPLOY_BLOCK, RWA_NFT_DEPLOY_BLOCK + 5005n, 1000n);
    for (const r of ranges) expect(r.to - r.from + 1n <= 1000n).toBe(true);
    expect(ranges.length).toBe(6);
  });
});
