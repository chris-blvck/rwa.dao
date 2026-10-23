import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const m = vi.hoisted(() => ({ rpc: vi.fn(), getUser: vi.fn(), video: vi.fn(), image: vi.fn(), avatar: vi.fn(), mode: "product" }));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ auth: { getUser: m.getUser }, rpc: m.rpc }) }));
vi.mock("@/lib/rwa/render", () => ({ buildRenderPlan: () => ({ mode: m.mode, start_image: "https://example.com/start.png", avatar_id: "offline-avatar", prompt: "offline", voice: false }) }));
vi.mock("@/lib/rwa/catalog", async importOriginal => {
  const actual = await importOriginal<typeof import("@/lib/rwa/catalog")>();
  return { ...actual, ASSETS: actual.ASSETS.map(a => ({ ...a, ms_product_id: "offline-product" })) };
});
vi.mock("@/lib/rwa/higgsfield", async importOriginal => ({
  ...(await importOriginal<object>()), readHiggsfieldCreds: () => ({ keyId: "offline", keySecret: "offline" }),
  msEndpoint: () => "offline-endpoint", createImage2Video: m.video, createImageJob: m.image, createMarketingStudioVideo: m.avatar,
}));
vi.mock("@/lib/rwa/qwen_video", async importOriginal => ({
  ...(await importOriginal<object>()), qwenVideoActive: () => process.env.RWA_VIDEO_PROVIDER === "qwen", createVideoTask: m.video,
}));
vi.mock("@/lib/rwa/qwen_image", async importOriginal => ({
  ...(await importOriginal<object>()), qwenImageActive: () => process.env.RWA_VIDEO_PROVIDER === "qwen", createImageTask: m.image,
}));
import { POST as generate } from "@/app/api/rwa/generate/route";
import { POST as compose } from "@/app/api/rwa/compose/route";

function request(authenticated = false, body: unknown = {}) {
  return new NextRequest("https://example.com/api", { method: "POST", headers: authenticated ? { Authorization: "Bearer synthetic-offline-access-token" } : {}, body: JSON.stringify(body) });
}
beforeEach(() => {
  vi.clearAllMocks(); m.mode = "product";
  vi.stubEnv("RWA_ALLOW_LIVE_GENERATION", "1"); vi.stubEnv("RWA_ALLOW_LIVE_COMPOSE", "1");
  vi.stubEnv("RWA_VIDEO_PROVIDER", "higgsfield"); vi.stubEnv("HIGGSFIELD_API_KEY", "synthetic-offline-key");
  vi.stubEnv("SUPABASE_URL", "https://offline.example.com"); vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "offline-publishable");
  m.getUser.mockResolvedValue({ data: { user: { id: "offline-user" } }, error: null });
  m.rpc.mockResolvedValue({ data: true, error: null });
  m.video.mockResolvedValue({ request_id: "offline-job" }); m.image.mockResolvedValue({ request_id: "offline-image" });
  m.avatar.mockResolvedValue({ request_id: "offline-avatar-job" });
});
afterEach(() => vi.unstubAllEnvs());

for (const provider of ["higgsfield", "qwen"]) {
  it(`${provider}: image and video branches reject anonymous callers before spending`, async () => {
    vi.stubEnv("RWA_VIDEO_PROVIDER", provider);
    expect((await generate(request())).status).toBe(401);
    expect((await compose(request())).status).toBe(401);
    expect(m.video).not.toHaveBeenCalled(); expect(m.image).not.toHaveBeenCalled();
  });
}
it("rejects a provisioned identity when quota reservation is denied", async () => {
  m.rpc.mockResolvedValue({ data: null, error: { message: "quota_exceeded" } });
  expect((await generate(request(true))).status).toBe(429); expect(m.video).not.toHaveBeenCalled();
});
it("reserves all three takes before creating any legitimate multi-take jobs", async () => {
  expect((await generate(request(true, { takes: 3 }))).status).toBe(200);
  expect(m.rpc).toHaveBeenCalledWith("rwa_reserve_provider_call", { p_action: "generate", p_units: 3 });
  expect(m.video).toHaveBeenCalledTimes(3);
});
it("also guards the avatar provider path", async () => {
  m.mode = "avatar";
  expect((await generate(request())).status).toBe(401); expect(m.avatar).not.toHaveBeenCalled();
});
it("allows a legitimate composition only after reserving its quota", async () => {
  expect((await compose(request(true))).status).toBe(200);
  expect(m.rpc).toHaveBeenCalledWith("rwa_reserve_provider_call", { p_action: "compose", p_units: 1 });
  expect(m.image).toHaveBeenCalledOnce();
});
