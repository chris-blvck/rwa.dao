import { NextResponse, type NextRequest } from "next/server";
import { normalizeAgentConfig, runAgentTick } from "@/lib/rwa/agent";

// Managed Agent tick — runs the hosted agent server-side (this is the "we host it, no VPS" proof).
// Given a user's agent config, it returns the drafts the agent produced for this run. In production
// a scheduler calls this per active agent on their cadence; the drafts land in the user's queue,
// then publish human-in-the-loop (one tap) or via their connected accounts (official APIs).

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { config?: unknown; seed?: unknown };
  const config = normalizeAgentConfig(body.config as Record<string, unknown> | null);
  const seed = Number.isFinite(Number(body.seed)) ? Math.floor(Number(body.seed)) : 0;
  const drafts = runAgentTick(config, seed);
  return NextResponse.json({
    hosted: true, // runs on RWA-DAO infra — the user never touches a VPS
    config,
    count: drafts.length,
    drafts,
    publish: config.autoPublish ? "connected_accounts_official_api" : "human_one_tap",
  });
}
