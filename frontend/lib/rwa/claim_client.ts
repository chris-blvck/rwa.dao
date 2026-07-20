// Client-side claim flow — turns a signed reward voucher into an on-chain claim() transaction.
//
// 1) ask the server for a signed voucher (/api/rwa/rewards/voucher) — the oracle only signs verified,
//    capped amounts, so the client can't inflate its reward;
// 2) encode claim(voucher, signature) and send it from the user's wallet.
// Inert until the oracle + distributor are configured (demo returns live_disabled).

import { type Address, type Hex, encodeFunctionData } from "viem";
import { DISTRIBUTOR_ABI } from "./distributor_abi";

export type SerializedVoucher = { to: string; amount: string; reason: string; nonce: string; deadline: string };

export function voucherToArgs(v: SerializedVoucher) {
  return {
    to: v.to as Address,
    amount: BigInt(v.amount),
    reason: v.reason as Hex,
    nonce: v.nonce as Hex,
    deadline: BigInt(v.deadline),
  } as const;
}

/** Encode the claim() calldata — pure, so it's unit-testable without a wallet. */
export function encodeClaim(voucher: SerializedVoucher, signature: Hex): Hex {
  return encodeFunctionData({ abi: DISTRIBUTOR_ABI, functionName: "claim", args: [voucherToArgs(voucher), signature] });
}

export type ClaimResult =
  | { ok: true; txHash: string }
  | { ok: false; reason: "live_disabled" | "no_wallet" | "nothing_owed" | "error"; message: string };

type Eip1193 = { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };

/**
 * Run the full claim: fetch a voucher, then send the claim tx from `address` via the injected wallet.
 * fetchImpl is injectable for tests.
 */
export async function submitClaim(params: {
  address: string;
  reason?: string;
  amountWei: string;
  ethereum?: Eip1193 | null;
  fetchImpl?: typeof fetch;
}): Promise<ClaimResult> {
  const f = params.fetchImpl ?? fetch;
  let data: Record<string, unknown> = {};
  try {
    const res = await f("/api/rwa/rewards/voucher", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: params.address, reason: params.reason ?? "post_reward", amountWei: params.amountWei }),
    });
    data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  } catch (err) {
    return { ok: false, reason: "error", message: String(err instanceof Error ? err.message : err) };
  }

  if (data.status === "unavailable" || data.error === "live_disabled") {
    return { ok: false, reason: "live_disabled", message: "On-chain rewards go live once the distributor is deployed & the oracle is configured." };
  }
  if (data.error === "nothing_owed" || data.status !== "signed") {
    return { ok: false, reason: "nothing_owed", message: "No verified reward to claim yet." };
  }

  const eth = params.ethereum;
  if (!eth?.request) {
    return { ok: false, reason: "no_wallet", message: "Connect a real wallet to claim on-chain." };
  }

  try {
    const contract = data.contract as Address;
    const voucher = data.voucher as SerializedVoucher;
    const signature = data.signature as Hex;
    const calldata = encodeClaim(voucher, signature);
    const txHash = (await eth.request({
      method: "eth_sendTransaction",
      params: [{ from: params.address, to: contract, data: calldata }],
    })) as string;
    return { ok: true, txHash };
  } catch (err) {
    return { ok: false, reason: "error", message: String(err instanceof Error ? err.message : err) };
  }
}
