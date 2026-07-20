import { describe, expect, it, vi } from "vitest";
import type { Hex } from "viem";
import { encodeClaim, submitClaim, voucherToArgs, type SerializedVoucher } from "@/lib/rwa/claim_client";

const voucher: SerializedVoucher = {
  to: "0x2222222222222222222222222222222222222222",
  amount: "500000000000000000000",
  reason: `0x${"ab".repeat(32)}`,
  nonce: `0x${"cd".repeat(32)}`,
  deadline: "9999999999",
};
const sig: Hex = `0x${"11".repeat(65)}`;

function fetchJson(body: unknown): typeof fetch {
  return (async () => ({ json: async () => body }) as Response) as unknown as typeof fetch;
}

describe("claim client", () => {
  it("parses a serialized voucher into typed args", () => {
    const a = voucherToArgs(voucher);
    expect(a.amount).toBe(500000000000000000000n);
    expect(a.deadline).toBe(9999999999n);
    expect(a.to).toBe(voucher.to);
  });

  it("encodes claim() calldata deterministically", () => {
    const data = encodeClaim(voucher, sig);
    expect(data.startsWith("0x")).toBe(true);
    expect(data).toBe(encodeClaim(voucher, sig));
    expect(data.length).toBeGreaterThan(200); // selector + tuple + bytes
  });

  it("reports live_disabled when the oracle is off", async () => {
    const r = await submitClaim({ address: voucher.to, amountWei: "1", fetchImpl: fetchJson({ status: "unavailable", error: "live_disabled" }) });
    expect(r).toEqual({ ok: false, reason: "live_disabled", message: expect.any(String) });
  });

  it("needs a wallet even when a voucher is signed", async () => {
    const r = await submitClaim({ address: voucher.to, amountWei: "1", ethereum: null, fetchImpl: fetchJson({ status: "signed", contract: voucher.to, voucher, signature: sig }) });
    expect(r).toMatchObject({ ok: false, reason: "no_wallet" });
  });

  it("sends the tx and returns the hash when a wallet is present", async () => {
    const request = vi.fn(async () => "0xdeadbeef");
    const r = await submitClaim({
      address: voucher.to,
      amountWei: "1",
      ethereum: { request } as unknown as Parameters<typeof submitClaim>[0]["ethereum"],
      fetchImpl: fetchJson({ status: "signed", contract: "0x1111111111111111111111111111111111111111", voucher, signature: sig }),
    });
    expect(r).toEqual({ ok: true, txHash: "0xdeadbeef" });
    expect(request).toHaveBeenCalledWith({ method: "eth_sendTransaction", params: [expect.objectContaining({ to: "0x1111111111111111111111111111111111111111" })] });
  });
});
