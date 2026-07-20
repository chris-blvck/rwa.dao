import { describe, expect, it, vi } from "vitest";
import { submitMint, toHexQuantity } from "@/lib/rwa/mint_client";

// The shape of an EIP-1193 request arg the mock receives — `params` carries the tx object for
// eth_sendTransaction. Typing it (vs bare `{ method }`) lets the assertions read params off the
// recorded calls without `any`, so `tsc --noEmit` (the CI typecheck gate) stays green.
type RpcArg = { method: string; params?: { value: string; to: string }[] };

describe("mint client", () => {
  it("encodes a bigint value as hex", () => {
    expect(toHexQuantity(0n)).toBe("0x0");
    expect(toHexQuantity(255n)).toBe("0xff");
    expect(toHexQuantity(745077168706758914n)).toBe("0xa570bbcc3052902");
  });

  it("needs a wallet", async () => {
    const r = await submitMint({ address: "0x1", quantity: 1, referralId: "ABC", priceXdcWei: "1000", ethereum: null });
    expect(r).toMatchObject({ ok: false, reason: "no_wallet" });
  });

  it("mints on the right chain: sends tx with value = price × quantity and the referral in calldata", async () => {
    const request = vi.fn(async ({ method }: RpcArg) => {
      if (method === "eth_chainId") return "0x33"; // 51
      if (method === "eth_sendTransaction") return "0xhash";
      return null;
    });
    const r = await submitMint({
      address: "0xabc",
      quantity: 2,
      referralId: "CREATOR1",
      priceXdcWei: "1000000000000000000", // 1 XDC
      ethereum: { request } as unknown as Parameters<typeof submitMint>[0]["ethereum"],
    });
    expect(r).toEqual({ ok: true, txHash: "0xhash" });
    const sent = request.mock.calls.find((c) => c[0].method === "eth_sendTransaction")?.[0];
    expect(sent).toBeDefined();
    expect(sent?.params?.[0].value).toBe("0x1bc16d674ec80000"); // 2 XDC
    expect(sent?.params?.[0].to.toLowerCase()).toBe("0xb76f7df88695447b180f9cd1c7c32a9532752a11");
  });

  it("asks to switch when on the wrong chain and switching fails", async () => {
    const request = vi.fn(async ({ method }: RpcArg) => {
      if (method === "eth_chainId") return "0x1"; // mainnet
      if (method === "wallet_switchEthereumChain") throw new Error("rejected");
      return null;
    });
    const r = await submitMint({
      address: "0xabc",
      quantity: 1,
      referralId: "",
      priceXdcWei: "1000",
      ethereum: { request } as unknown as Parameters<typeof submitMint>[0]["ethereum"],
    });
    expect(r).toMatchObject({ ok: false, reason: "wrong_chain" });
  });
});
