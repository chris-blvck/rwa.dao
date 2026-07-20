// RWA-DAO MemoryAgent — MCP server.
//
// Exposes the agent's real tools over the Model Context Protocol so any MCP client (Claude Desktop,
// etc.) can drive the MemoryAgent: rank a content batch by learned memory, reinforce memory from an
// on-chain outcome, summarise what it has learned, draft a caption prompt, and read a creator's real
// on-chain conversions. Every handler is a thin wrapper over the SAME unit-tested logic the app uses
// (frontend/lib/rwa/*) — no reimplementation, no mocks.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { generateBatch } from "../frontend/lib/rwa/autopilot";
import { memoryHint, memorySummary, rankByMemory, reinforceFromPosts, type CreatorMemory } from "../frontend/lib/rwa/agent_memory";
import { buildCaptionPrompt } from "../frontend/lib/rwa/llm";
import { conversionsForReferral, pointsFromConversions, buildMintLink } from "../frontend/lib/rwa/rwa_watch_nft";

const json = (data: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] });

const ideaShape = {
  platform: z.string(),
  presetId: z.string(),
  teamId: z.string(),
  watchId: z.string(),
};

const server = new McpServer({ name: "rwa-dao-memoryagent", version: "1.0.0" });

// 1) Rank a fresh content batch by the creator's learned memory (contextual bandit + exploration).
server.registerTool(
  "rank_content_batch",
  {
    title: "Rank content batch by memory",
    description:
      "Generate candidate content ideas and rank them by a creator's learned memory weights (best-first, with deterministic exploration). Returns the top `count`.",
    inputSchema: {
      count: z.number().int().min(1).max(20).default(3),
      weights: z.record(z.string(), z.number()).optional().describe('learned feature weights, e.g. {"platform:TikTok": 1.4}'),
      posts: z.number().int().min(0).default(0),
      seed: z.number().int().default(0),
    },
  },
  async ({ count, weights, posts, seed }) => {
    const mem: CreatorMemory = { owner: "mcp", weights: weights ?? {}, posts: posts ?? 0 };
    const pool = generateBatch(Math.max(count * 3, count + 4), seed);
    const ranked = rankByMemory(mem, pool, seed).slice(0, count);
    return json({ count: ranked.length, ideas: ranked });
  },
);

// 2) Reinforce memory from a real outcome (the on-chain USD a set of posted ideas drove).
server.registerTool(
  "reinforce_memory",
  {
    title: "Reinforce memory from an outcome",
    description:
      "Credit the on-chain USD a set of posted ideas drove back into the memory weights (the MemoryAgent's learning step). Returns the updated memory + a human summary.",
    inputSchema: {
      weights: z.record(z.string(), z.number()).optional(),
      posts: z.number().int().min(0).default(0),
      postedIdeas: z.array(z.object(ideaShape)).min(1),
      rewardUsd: z.number().min(0),
    },
  },
  async ({ weights, posts, postedIdeas, rewardUsd }) => {
    const mem: CreatorMemory = { owner: "mcp", weights: weights ?? {}, posts: posts ?? 0 };
    // The tool accepts platform as a free string; reinforceFromPosts only uses these fields as
    // feature keys, so adopt its own parameter type rather than over-constraining the MCP schema.
    const posted = postedIdeas as Parameters<typeof reinforceFromPosts>[1];
    const next = reinforceFromPosts(mem, posted, rewardUsd);
    return json({ weights: next.weights, posts: next.posts, summary: memorySummary(next), hint: memoryHint(next) ?? null });
  },
);

// 3) Summarise what the agent has learned (for a UI or an LLM prompt hint).
server.registerTool(
  "memory_summary",
  {
    title: "Summarise learned memory",
    description: "Return a human-readable summary + a short prompt hint of a creator's learned preferences.",
    inputSchema: { weights: z.record(z.string(), z.number()).optional(), posts: z.number().int().min(0).default(0) },
  },
  async ({ weights, posts }) => {
    const mem: CreatorMemory = { owner: "mcp", weights: weights ?? {}, posts: posts ?? 0 };
    return json({ summary: memorySummary(mem), hint: memoryHint(mem) ?? null });
  },
);

// 4) Draft the caption prompt the agent sends to Qwen (memory-informed).
server.registerTool(
  "draft_caption_prompt",
  {
    title: "Draft a caption prompt",
    description: "Build the memory-informed, on-brand, non-financial caption prompt the agent sends to the LLM (Qwen).",
    inputSchema: {
      watchTitle: z.string(),
      styleTitle: z.string(),
      personaName: z.string(),
      platform: z.string(),
      team: z.string().optional(),
      memoryHint: z.string().optional(),
    },
  },
  async ({ watchTitle, styleTitle, personaName, platform, team, memoryHint: hint }) => {
    return json({ prompt: buildCaptionPrompt({ watchTitle, styleTitle, personaName, platform, team: team ?? null, memoryHint: hint }) });
  },
);

// 5) Read a creator's REAL on-chain conversions (the un-fakeable reward signal) for a referral code.
server.registerTool(
  "read_conversions",
  {
    title: "Read on-chain conversions",
    description:
      "Read the real mints a creator's referral code drove on the RwaWatchNft contract (XDC Apothem) — the un-fakeable revenue signal the memory learns from. Live RPC call.",
    inputSchema: { referralCode: z.string().min(1) },
  },
  async ({ referralCode }) => {
    const conv = await conversionsForReferral(referralCode);
    return json({
      referralCode,
      mints: conv.mints,
      fractions: conv.fractions,
      totalUsdtWei: conv.totalUsdtWei,
      pointsEarned: pointsFromConversions(conv.totalUsdtWei),
      mintLink: buildMintLink(referralCode),
    });
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
// stderr so it doesn't corrupt the stdio JSON-RPC stream on stdout.
console.error("rwa-dao-memoryagent MCP server ready (stdio) — 5 tools registered.");
