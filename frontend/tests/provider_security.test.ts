import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), rpc: vi.fn(), llm: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ auth: { getUser: mocks.getUser }, rpc: mocks.rpc }) }));
vi.mock("@/lib/rwa/llm", () => ({ captionProvider: () => "qwen", llmCaption: mocks.llm }));
import { guardProviderSpend, readProviderBody } from "@/lib/rwa/provider_guard";
import { POST as caption } from "@/app/api/rwa/agent/caption/route";
import { POST as reward } from "@/app/api/rwa/rewards/voucher/route";

const token = "synthetic-jwt-for-offline-tests";
function request(body: unknown, authenticated = false) {
  return new NextRequest("https://example.com/api", { method: "POST", headers: { "Content-Type": "application/json", ...(authenticated ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("SUPABASE_URL", "https://offline.example.com");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "offline-publishable-key");
  mocks.getUser.mockResolvedValue({ data: { user: { id: "00000000-0000-0000-0000-000000000001" } }, error: null });
  mocks.rpc.mockResolvedValue({ data: true, error: null });
  mocks.llm.mockResolvedValue("offline caption");
});
afterEach(() => vi.unstubAllEnvs());

describe("paid provider authorization", () => {
  it("rejects anonymous requests before any identity or provider operation", async () => {
    expect((await caption(request({}))).status).toBe(401);
    expect(mocks.getUser).not.toHaveBeenCalled(); expect(mocks.rpc).not.toHaveBeenCalled(); expect(mocks.llm).not.toHaveBeenCalled();
  });
  it("rejects a forged/expired token before reserving credits", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: { message: "invalid" } });
    expect((await caption(request({}, true))).status).toBe(401);
    expect(mocks.rpc).not.toHaveBeenCalled(); expect(mocks.llm).not.toHaveBeenCalled();
  });
  it("rejects a Supabase anonymous identity even if it presents a real user token", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "anonymous", is_anonymous: true } }, error: null });
    expect((await caption(request({}, true))).status).toBe(401);
    expect(mocks.rpc).not.toHaveBeenCalled(); expect(mocks.llm).not.toHaveBeenCalled();
  });
  it("requires durable quota before every paid request", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "quota_exceeded" } });
    expect((await caption(request({}, true))).status).toBe(429); expect(mocks.llm).not.toHaveBeenCalled();
  });
  it("fails closed on unavailable quota storage", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "function missing" } });
    expect((await caption(request({}, true))).status).toBe(503); expect(mocks.llm).not.toHaveBeenCalled();
  });
  it("allows a verified, provisioned caller and charges units chosen by the handler", async () => {
    const response = await caption(request({ watchTitle: "A watch" }, true));
    expect(response.status).toBe(200); expect(mocks.getUser).toHaveBeenCalledWith(token);
    expect(mocks.rpc).toHaveBeenCalledWith("rwa_reserve_provider_call", { p_action: "caption", p_units: 1 });
    expect(mocks.llm).toHaveBeenCalledOnce();
  });
  it("validates job units and bounds streaming bodies", async () => {
    expect((await guardProviderSpend(request({}, true), "generate", 4))?.status).toBe(400);
    const parsed = await readProviderBody(request({ value: "x".repeat(20_001) }));
    expect("response" in parsed && parsed.response.status).toBe(413);
  });
  it("bounds caption fields before provider invocation", async () => {
    expect((await caption(request({ watchTitle: "x".repeat(301) }, true))).status).toBe(400);
    expect(mocks.llm).not.toHaveBeenCalled();
  });
});

it("keeps rewards disabled even with signing keys and a shared guard configured", async () => {
  vi.stubEnv("REWARD_SIGNER_KEY", "synthetic-offline-key"); vi.stubEnv("RWAX_DISTRIBUTOR", "0x1111111111111111111111111111111111111111");
  vi.stubEnv("API_GUARD_SECRET", "synthetic-offline-guard");
  const response = await reward();
  expect(response.status).toBe(503); expect((await response.json()).error).toBe("reward_accounting_unavailable");
});
