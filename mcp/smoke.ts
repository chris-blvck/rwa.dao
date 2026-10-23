// Stdio smoke test: spawn the server as a subprocess, speak MCP over stdio via the SDK client,
// list the tools, and exercise the two pure tools (no network). Proves the protocol + wiring.

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

function assert(cond: unknown, msg: string): void {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
}

// Use the installed loader directly: a smoke test must never fetch a missing executable.
const transport = new StdioClientTransport({ command: process.execPath, args: ["--import", "tsx", "server.ts"] });
const client = new Client({ name: "smoke", version: "1.0.0" });
await client.connect(transport);

const { tools } = await client.listTools();
const names = tools.map((t) => t.name).sort();
console.error("tools:", names.join(", "));
const expected = ["draft_caption_prompt", "memory_summary", "rank_content_batch", "read_conversions", "reinforce_memory"];
assert(names.length === expected.length, `expected ${expected.length} tools, got ${names.length}`);
for (const n of expected) assert(names.includes(n), `missing tool ${n}`);

// rank_content_batch (pure, deterministic)
const r1 = await client.callTool({ name: "rank_content_batch", arguments: { count: 2, weights: { "platform:TikTok": 1.6 }, posts: 3, seed: 7 } });
const p1 = JSON.parse((r1.content as Array<{ text: string }>)[0].text);
assert(p1.count === 2, "rank_content_batch should return 2 ideas");
assert(typeof p1.ideas[0].platform === "string", "ranked idea has a platform");

// reinforce_memory (pure)
const r2 = await client.callTool({
  name: "reinforce_memory",
  arguments: { postedIdeas: [{ platform: "TikTok", presetId: "luxury_reveal", teamId: "brazil", watchId: "w" }], rewardUsd: 500, posts: 0 },
});
const p2 = JSON.parse((r2.content as Array<{ text: string }>)[0].text);
assert(p2.posts === 1, "reinforce_memory should bump posts to 1");
assert(typeof p2.summary === "string" && p2.summary.includes("Learned"), "summary reflects learning");

// Exercise all remaining offline tools; deliberately never call read_conversions (live RPC).
const r3 = await client.callTool({ name: "memory_summary", arguments: { weights: p2.weights, posts: p2.posts } });
const p3 = JSON.parse((r3.content as Array<{ text: string }>)[0].text);
assert(typeof p3.summary === "string", "memory_summary should return text");
const r4 = await client.callTool({
  name: "draft_caption_prompt",
  arguments: { watchTitle: "Test watch", styleTitle: "Editorial", personaName: "Creator", platform: "TikTok" },
});
const p4 = JSON.parse((r4.content as Array<{ text: string }>)[0].text);
assert(typeof p4.prompt === "string" && p4.prompt.includes("Test watch"), "caption prompt should preserve the watch title");

let invalidRejected = false;
try {
  const invalid = await client.callTool({ name: "rank_content_batch", arguments: { count: 21 } });
  invalidRejected = invalid.isError === true;
} catch {
  invalidRejected = true;
}
assert(invalidRejected, "SDK must reject count beyond the registered schema limit");
// Prove the session remains usable after rejecting malformed arguments.
assert((await client.listTools()).tools.length === expected.length, "protocol should survive invalid arguments");

console.error("SMOKE OK — 5 tools listed, 4 offline tools + invalid schema rejection verified over stdio; no RPC called");
await client.close();
process.exit(0);
