import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const m = vi.hoisted(() => ({ browser: vi.fn(), session: vi.fn(), signIn: vi.fn(), signOut: vi.fn(), user: vi.fn(), rpc: vi.fn(), llm: vi.fn(), fetch: vi.fn() }));
vi.mock("@/lib/rwa/supabase", () => ({ getSupabaseBrowser: m.browser }));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ auth: { getUser: m.user }, rpc: m.rpc }) }));
vi.mock("@/lib/rwa/llm", () => ({ captionProvider: () => "qwen", llmCaption: m.llm }));
import { postProviderRequest, signInProviderAccount, signOutProviderAccount } from "@/lib/rwa/provider_session";
import { POST as caption } from "@/app/api/rwa/agent/caption/route";

const token = "offline-user-access-token-not-a-live-credential";
const signedSession = (access_token = token) => ({ access_token, expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: "00000000-0000-0000-0000-000000000001", email: "creator@example.test", is_anonymous: false } });
const sessionResult = (session: unknown) => ({ data: { session }, error: null });

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("SUPABASE_URL", "https://offline.example.test");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "offline-public-key");
  m.browser.mockReturnValue({ auth: { getSession: m.session, signInWithPassword: m.signIn, signOut: m.signOut } });
  m.session.mockResolvedValue(sessionResult(signedSession()));
  m.signIn.mockResolvedValue(sessionResult(signedSession()));
  m.signOut.mockResolvedValue({ error: null });
  m.user.mockImplementation(async (bearer: string) => bearer === token ? { data: { user: signedSession().user }, error: null } : { data: { user: null }, error: { message: "invalid token" } });
  m.rpc.mockResolvedValue({ data: true, error: null });
  m.llm.mockResolvedValue("offline verified caption");
  m.fetch.mockImplementation(async (path: string, init: RequestInit) => caption(new NextRequest(`https://offline.example.test${path}`, { ...init, signal: init.signal ?? undefined })));
  vi.stubGlobal("fetch", m.fetch);
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("creator account to paid handler", () => {
  it("signs into an existing account then sends its token through verified quota before generation", async () => {
    await signInProviderAccount(" creator@example.test ", "offline-password");
    expect(m.signIn).toHaveBeenCalledWith({ email: "creator@example.test", password: "offline-password" });
    const response = await postProviderRequest("/api/rwa/agent/caption", { watchTitle: "Watch" });
    expect(response.status).toBe(200);
    expect((await response.json()).caption).toBe("offline verified caption");
    expect(m.user).toHaveBeenCalledWith(token);
    expect(m.rpc).toHaveBeenCalledWith("rwa_reserve_provider_call", { p_action: "caption", p_units: 1 });
    expect(m.llm).toHaveBeenCalledOnce();
    expect(m.rpc.mock.invocationCallOrder[0]).toBeLessThan(m.llm.mock.invocationCallOrder[0]);
  });
  it("a locally fabricated identity cannot make a forged bearer spend", async () => {
    m.session.mockResolvedValue(sessionResult(signedSession("forged-user-access-token")));
    expect((await postProviderRequest("/api/rwa/agent/caption", {})).status).toBe(401);
    expect(m.rpc).not.toHaveBeenCalled(); expect(m.llm).not.toHaveBeenCalled();
  });
  it("never treats an anonymous library session as a creator login", async () => {
    const anonymous = signedSession(); anonymous.user.is_anonymous = true;
    m.session.mockResolvedValue(sessionResult(anonymous));
    expect((await postProviderRequest("/api/rwa/agent/caption", {})).status).toBe(401);
    expect(m.fetch.mock.calls[0][1].headers.Authorization).toBeUndefined();
    expect(m.user).not.toHaveBeenCalled(); expect(m.llm).not.toHaveBeenCalled();
  });
  it("does not forward expired sessions or retain a token after sign-out", async () => {
    const expired = signedSession(); expired.expires_at = Math.floor(Date.now() / 1000) - 1;
    m.session.mockResolvedValueOnce(sessionResult(expired));
    expect((await postProviderRequest("/api/rwa/agent/caption", {})).status).toBe(401);
    await signOutProviderAccount();
    expect(m.signOut).toHaveBeenCalledWith({ scope: "local" });
    m.session.mockResolvedValue(sessionResult(null));
    expect((await postProviderRequest("/api/rwa/agent/caption", {})).status).toBe(401);
    expect(m.user).not.toHaveBeenCalled();
  });
  it("reads the current session anew after account/token rotation", async () => {
    await postProviderRequest("/api/rwa/agent/caption", {});
    m.session.mockResolvedValue(sessionResult(signedSession("rotated-user-access-token")));
    await postProviderRequest("/api/rwa/agent/caption", {});
    expect(m.fetch.mock.calls[0][1].headers.Authorization).toBe(`Bearer ${token}`);
    expect(m.fetch.mock.calls[1][1].headers.Authorization).toBe("Bearer rotated-user-access-token");
  });
  it("only forwards access tokens to the three exact local provider routes", async () => {
    m.fetch.mockResolvedValue(new Response("{}", { status: 200 }));
    for (const path of ["/api/rwa/compose", "/api/rwa/generate", "/api/rwa/agent/caption"] as const) {
      await postProviderRequest(path, {});
      expect(m.fetch).toHaveBeenLastCalledWith(path, expect.objectContaining({ headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } }));
    }
    await expect(postProviderRequest("https://attacker.example/collect" as never, {})).rejects.toThrow("Unsupported provider route");
    expect(m.fetch).toHaveBeenCalledTimes(3);
  });
  it("falls back to an unauthenticated demo request if browser session retrieval fails", async () => {
    m.session.mockRejectedValue(new Error("offline session store"));
    expect((await postProviderRequest("/api/rwa/agent/caption", {})).status).toBe(401);
    expect(m.user).not.toHaveBeenCalled(); expect(m.rpc).not.toHaveBeenCalled();
  });
  it("preserves no-cost demo calls without configuration and never attempts account creation", async () => {
    m.browser.mockReturnValue(null);
    m.fetch.mockResolvedValue(new Response('{"status":"prepared"}', { status: 200 }));
    expect((await postProviderRequest("/api/rwa/generate", {})).status).toBe(200);
    expect(m.fetch.mock.calls[0][1].headers.Authorization).toBeUndefined();
    await expect(signInProviderAccount("creator@example.test", "password")).rejects.toThrow("unavailable");
    expect(m.signIn).not.toHaveBeenCalled();
  });
  it("rejects bad credentials and still enforces provisioned quota after successful login", async () => {
    m.signIn.mockResolvedValueOnce({ data: { session: null }, error: { message: "invalid credentials" } });
    await expect(signInProviderAccount("creator@example.test", "wrong")).rejects.toThrow("Sign-in failed");
    m.rpc.mockResolvedValue({ data: null, error: { message: "quota_exceeded" } });
    expect((await postProviderRequest("/api/rwa/agent/caption", {})).status).toBe(429);
    expect(m.llm).not.toHaveBeenCalled();
  });
});
