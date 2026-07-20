// Reward oracle — the off-chain half of the on-chain payout.
//
// The reward economy is farm-resistant BECAUSE the on-chain contract only pays what THIS signer is
// willing to sign. The server verifies real, deduped, capped outcomes (on-chain conversions via the
// referral link + our own click redirect; views stay leaderboard-only) and signs an EIP-712 voucher
// matching contracts/RwaxRewardDistributor.sol. The recipient then calls claim() to pull the RWAX.
//
// The domain/types here MUST match the contract exactly (name "RWA-DAO Rewards", version "1").

import {
  type Address,
  type Hex,
  keccak256,
  recoverTypedDataAddress,
  toHex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

export const REWARD_DOMAIN_NAME = "RWA-DAO Rewards";
export const REWARD_DOMAIN_VERSION = "1";

// EIP-712 type — mirrors the Claim struct in the Solidity contract.
export const CLAIM_TYPES = {
  Claim: [
    { name: "to", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "reason", type: "bytes32" },
    { name: "nonce", type: "bytes32" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

export type RewardReason = "post_reward" | "referral_l1" | "referral_l2" | "click_points" | "mint_bonus";

export type Voucher = {
  to: Address;
  amount: bigint; // RWAX wei
  reason: Hex; // bytes32 = reasonHash(reason)
  nonce: Hex; // bytes32, unique
  deadline: bigint; // unix seconds
};

/** keccak256 of a short reason label → the bytes32 the contract compares against. */
export function reasonHash(reason: RewardReason | string): Hex {
  return keccak256(toHex(reason));
}

export function rewardDomain(chainId: number, verifyingContract: Address) {
  return { name: REWARD_DOMAIN_NAME, version: REWARD_DOMAIN_VERSION, chainId, verifyingContract } as const;
}

/** Sign a voucher with the oracle key (SERVER-SIDE ONLY — never expose the private key). */
export async function signRewardVoucher(params: {
  voucher: Voucher;
  privateKey: Hex;
  chainId: number;
  verifyingContract: Address;
}): Promise<Hex> {
  const account = privateKeyToAccount(params.privateKey);
  return account.signTypedData({
    domain: rewardDomain(params.chainId, params.verifyingContract),
    types: CLAIM_TYPES,
    primaryType: "Claim",
    message: params.voucher,
  });
}

/** Recover the signer of a voucher (used to verify / in tests). */
export async function recoverVoucherSigner(params: {
  voucher: Voucher;
  signature: Hex;
  chainId: number;
  verifyingContract: Address;
}): Promise<Address> {
  return recoverTypedDataAddress({
    domain: rewardDomain(params.chainId, params.verifyingContract),
    types: CLAIM_TYPES,
    primaryType: "Claim",
    message: params.voucher,
    signature: params.signature,
  });
}

// JSON-safe voucher (bigint → decimal string) for API responses.
export function serializeVoucher(v: Voucher): Record<string, string> {
  return { to: v.to, amount: v.amount.toString(), reason: v.reason, nonce: v.nonce, deadline: v.deadline.toString() };
}
