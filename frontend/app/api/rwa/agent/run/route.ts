import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_AGENT_CONFIG, runAgentTick } from "@/lib/rwa/agent";
import { runScheduledAgents, type CaptionWriter } from "@/lib/rwa/agent_scheduler";
import { teamById } from "@/lib/rwa/teams";
import { captionProvider, llmCaption } from "@/lib/rwa/llm";
import { indexNewMints, viemChainReader } from "@/lib/rwa/mint_indexer";
import { getSupabaseAdmin, indexerDb, memoryProvider, schedulerDb } from "@/lib/rwa/supabase_admin";

// Scheduler entrypoint — the cron hits this to run the Managed Agents (see
// frontend/netlify/functions/agent-cron.mts). Auth-guarded by CRON_SECRET (Bearer or ?secret=).
//
// Real mode (SUPABASE_SERVICE_ROLE_KEY set): iterates the enabled agents (rwa_agents), tops each
// user's queue up to their daily cadence, and enqueues the drafts (rwa_agent_drafts) — the
// dashboard queue reads them. Demo mode (no service key): stateless demo tick, nothing persisted.

export const dynamic = "force-dynamic";

async function handle(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  // Bearer header only — never a ?secret= query param (it would leak into access/CDN logs).
  const provided = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "unauthorized", message: "Set CRON_SECRET and pass it as Authorization: Bearer." }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  if (admin) {
    // Two independent jobs per cron tick: agent drafts + the Minted-event index. One failing
    // must not block the other, so each is caught separately and reported side by side.
    let agents: unknown;
    let agentsError: string | null = null;
    try {
      // MemoryAgent on: reinforce each creator's memory from real on-chain outcomes, then rank the
      // next batch by what works. Toggle off with RWA_MEMORY_AGENT=0 for the plain rotation.
      const memory = process.env.RWA_MEMORY_AGENT === "0" ? undefined : memoryProvider(admin);
      // Reasoning on Qwen (Alibaba Cloud path): when a DashScope/Anthropic key is present, the agent
      // writes each caption via the LLM, informed by the creator's memory hint. No key → the writer
      // is omitted and the deterministic template caption stands (safe, zero-cost default).
      const writeCaption: CaptionWriter | undefined = captionProvider()
        ? (idea, ctx) =>
            llmCaption({
              watchTitle: idea.watchTitle,
              styleTitle: idea.presetTitle,
              personaName: idea.personaName,
              platform: idea.platform,
              team: teamById(idea.teamId)?.name ?? null,
              memoryHint: ctx.memoryHint,
            })
        : undefined;
      const runOpts = { ...(memory ? { memory } : {}), ...(writeCaption ? { writeCaption } : {}) };
      agents = await runScheduledAgents(schedulerDb(admin), new Date(), Object.keys(runOpts).length ? runOpts : undefined);
    } catch (e) {
      agentsError = e instanceof Error ? e.message : "unknown";
    }
    let indexer: unknown;
    let indexerError: string | null = null;
    try {
      indexer = await indexNewMints(indexerDb(admin), viemChainReader());
    } catch (e) {
      indexerError = e instanceof Error ? e.message : "unknown";
    }
    const ok = !agentsError || !indexerError; // partial success still counts as a run
    return NextResponse.json(
      { ran: ok, hosted: true, mode: "scheduler", agents: agents ?? null, agentsError, indexer: indexer ?? null, indexerError },
      { status: ok ? 200 : 500 },
    );
  }

  // No service key → demo tick (compute only, nothing persisted).
  const seed = Number(req.nextUrl.searchParams.get("seed") || "0") || 0;
  const drafts = runAgentTick(DEFAULT_AGENT_CONFIG, seed);
  return NextResponse.json({
    ran: true,
    hosted: true,
    mode: "demo",
    note: "no SUPABASE_SERVICE_ROLE_KEY — computed a demo tick; set the key to enqueue real per-user drafts",
    count: drafts.length,
  });
}

export async function POST(req: NextRequest) {
  return handle(req);
}
export async function GET(req: NextRequest) {
  return handle(req);
}
