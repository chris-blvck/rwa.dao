import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// A signing key is insufficient: verified entitlement accounting is not implemented.
// There is deliberately no environment switch or shared-secret bypass for this closure.
export async function POST() {
  return NextResponse.json({
    status: "unavailable",
    error: "reward_accounting_unavailable",
    message: "Rewards are unavailable until verified server-side accounting is implemented.",
  }, { status: 503, headers: { "Cache-Control": "no-store" } });
}
