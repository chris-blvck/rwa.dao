# RWA-DAO MemoryAgent — MCP server

Exposes the RWA-DAO MemoryAgent's tools over the **Model Context Protocol** so any MCP client
(Claude Desktop, etc.) can drive the agent directly. Every tool is a thin wrapper over the **same
unit-tested logic the app uses** (`../frontend/lib/rwa/*`) — no reimplementation, no mocks.

## Tools

| Tool | What it does | Backed by |
|---|---|---|
| `rank_content_batch` | Generate candidate ideas and rank them by learned memory (bandit + exploration) | `autopilot.generateBatch` + `agent_memory.rankByMemory` |
| `reinforce_memory` | Credit the on-chain USD a set of posts drove back into the memory weights | `agent_memory.reinforceFromPosts` |
| `memory_summary` | Human summary + prompt hint of what the agent has learned | `agent_memory.memorySummary` / `memoryHint` |
| `draft_caption_prompt` | Build the memory-informed caption prompt the agent sends to Qwen | `llm.buildCaptionPrompt` |
| `read_conversions` | Read a creator's **real on-chain mints** (the reward signal) for a referral code | `rwa_watch_nft.conversionsForReferral` (live XDC RPC) |

## Run

```bash
cd mcp
npm install
npm start        # stdio MCP server (tsx server.ts)
npm run smoke    # spins up the server + an MCP client, lists tools, exercises rank + reinforce
```

`read_conversions` makes a live XDC Apothem RPC call; the other four are pure and offline.

## Connect to Claude Desktop

Add to `claude_desktop_config.json` (Settings → Developer → Edit Config):

```json
{
  "mcpServers": {
    "rwa-dao": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/rwa-dao/mcp/server.ts"]
    }
  }
}
```

Restart Claude Desktop; the five tools appear under the 🔌 menu. Ask it to *"rank a content batch for
a creator whose audience mints on TikTok luxury reveals"* and it will call `rank_content_batch` with
the learned weights.
