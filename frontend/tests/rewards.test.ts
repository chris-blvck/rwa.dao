import { describe, expect, it } from "vitest";
import type { Address, Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { reasonHash, recoverVoucherSigner, serializeVoucher, signRewardVoucher, type Voucher } from "@/lib/rwa/rewards";

// Well-known Hardhat test key (public knowledge; never a real key).
const PK: Hex = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const account = privateKeyToAccount(PK);
const chainId = 51; // XDC Apothem
const contract: Address = "0x1111111111111111111111111111111111111111";

const voucher: Voucher = {
  to: "0x2222222222222222222222222222222222222222",
  amount: 500n * 10n ** 18n,
  reason: reasonHash("post_reward"),
  nonce: `0x${"ab".repeat(32)}`,
  deadline: 9_999_999_999n,
};

describe("reward oracle vouchers", () => {
  it("signs a voucher that recovers to the oracle address (matches the contract's signer check)", async () => {
    const signature = await signRewardVoucher({ voucher, privateKey: PK, chainId, verifyingContract: contract });
    const signer = await recoverVoucherSigner({ voucher, signature, chainId, verifyingContract: contract });
    expect(signer.toLowerCase()).toBe(account.address.toLowerCase());
  });

  it("is domain-bound: a different chainId no longer recovers the oracle", async () => {
    const signature = await signRewardVoucher({ voucher, privateKey: PK, chainId, verifyingContract: contract });
    const signer = await recoverVoucherSigner({ voucher, signature, chainId: 50, verifyingContract: contract });
    expect(signer.toLowerCase()).not.toBe(account.address.toLowerCase());
  });

  it("reasonHash is deterministic and distinct per label", () => {
    expect(reasonHash("post_reward")).toBe(reasonHash("post_reward"));
    expect(reasonHash("referral_l1")).not.toBe(reasonHash("post_reward"));
  });

  it("serializes bigints to strings for JSON responses", () => {
    const s = serializeVoucher(voucher);
    expect(s.amount).toBe("500000000000000000000");
    expect(s.deadline).toBe("9999999999");
    expect(s.to).toBe(voucher.to);
  });
});
