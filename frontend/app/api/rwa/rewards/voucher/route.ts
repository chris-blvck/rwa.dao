import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { type Address, type Hex, isAddress } from "viem";
import {
  reasonHash,
  type RewardReason,
  serializeVoucher,
  signRewardVoucher,
  type Voucher,
} from "@/lib/rwa/rewards";

// Issue a signed reward voucher the user can claim() on RwaxRewardDistributor.
//
// OFF by default: with no oracle key / distributor configured it returns live_disabled (the demo
// never mints value). When configured, this is where the ANTI-FARM lives — the server must compute
// the *verified, deduped, capped* amount owed (on-chain conversions + our click redirect) before
// signing. The stub below enforces the env cap and a per-request ceiling; wire the real accounting
// (Supabase rwa_commissions / rwa_points_ledger) here.

export const dynamic = "force-dynamic";

const REASONS: RewardReason[] = ["post_reward", "referral_l1", "referral_l2", "click_points", "mint_bonus"];

export async function POST(req: NextRequest) {
  const key = process.env.REWARD_SIGNER_KEY as Hex | undefined;
  const distributor = process.env.RWAX_DISTRIBUTOR as Address | undefined;
  const chainId = Number(process.env.RWA_CHAIN_ID || "50");
  if (!key || !distributor || !isAddress(distributor)) {
    return NextResponse.json(
      { status: "unavailable", error: "live_disabled", message: "Reward oracle not configured (REWARD_SIGNER_KEY / RWAX_DISTRIBUTOR)." },
      { status: 200 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as { address?: string; reason?: string; amountWei?: string };
  const to = body.address;
  if (!to || !isAddress(to)) {
    return NextResponse.json({ error: "bad_address", message: "Provide a valid recipient address." }, { status: 400 });
  }
  const reason: RewardReason = REASONS.includes(body.reason as RewardReason) ? (body.reason as RewardReason) : "post_reward";

  // ── ANTI-FARM: the real amount MUST come from verified server-side accounting, not the client.
  // Placeholder: read the requested amount but hard-cap it. Replace with the ledger lookup.
  const requested = safeBigInt(body.amountWei) ?? 0n;
  const perRequestCap = safeBigInt(process.env.REWARD_MAX_CLAIM_WEI) ?? 100_000n * 10n ** 18n;
  const amount = requested > perRequestCap ? perRequestCap : requested;
  if (amount <= 0n) {
    return NextResponse.json({ error: "nothing_owed", message: "No verified reward to claim." }, { status: 200 });
  }

  const voucher: Voucher = {
    to: to as Address,
    amount,
    reason: reasonHash(reason),
    nonce: `0x${randomBytes(32).toString("hex")}`,
    deadline: BigInt(nowSeconds() + 3600), // 1h to claim
  };

  try {
    const signature = await signRewardVoucher({ voucher, privateKey: key, chainId, verifyingContract: distributor });
    return NextResponse.json({
      status: "signed",
      contract: distributor,
      chainId,
      voucher: serializeVoucher(voucher),
      reason,
      signature,
    });
  } catch (err) {
    return NextResponse.json(
      { status: "error", error: String(err instanceof Error ? err.message : err) },
      { status: 500 },
    );
  }
}

function safeBigInt(v: unknown): bigint | null {
  if (typeof v !== "string" || !/^\d+$/.test(v)) return null;
  try {
    return BigInt(v);
  } catch {
    return null;
  }
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}
