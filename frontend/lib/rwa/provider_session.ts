import type { Session } from "@supabase/supabase-js";
import { getSupabaseBrowser } from "./supabase";

export type ProviderAccount = { id: string; email: string };

/** Display state only. The server independently verifies the bearer and reserves the quota. */
export function providerAccount(session: Session | null): ProviderAccount | null {
  const user = session?.user;
  return user && !user.is_anonymous && user.email ? { id: user.id, email: user.email } : null;
}

export async function signInProviderAccount(email: string, password: string): Promise<void> {
  const sb = getSupabaseBrowser();
  if (!sb) throw new Error("Account sign-in is unavailable.");
  const { data, error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
  if (error || !providerAccount(data.session)) throw new Error("Sign-in failed. Check your email and password.");
}

export async function signOutProviderAccount(): Promise<void> {
  const sb = getSupabaseBrowser();
  if (!sb) return;
  const { error } = await sb.auth.signOut({ scope: "local" });
  if (error) throw new Error("Could not sign out. Please try again.");
}

export type ProviderPath = "/api/rwa/compose" | "/api/rwa/generate" | "/api/rwa/agent/caption";
const ALLOWED_PATHS: readonly string[] = ["/api/rwa/compose", "/api/rwa/generate", "/api/rwa/agent/caption"];

/** Only same-origin provider routes receive the current user's token; no wallet or shared-key fallback. */
export async function postProviderRequest(path: ProviderPath, body: unknown): Promise<Response> {
  if (!ALLOWED_PATHS.includes(path)) throw new Error("Unsupported provider route");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const sb = getSupabaseBrowser();
  if (sb) try {
    const { data, error } = await sb.auth.getSession();
    const session = !error ? data.session : null;
    if (providerAccount(session) && session?.access_token && session.expires_at && session.expires_at > Date.now() / 1000) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }
  } catch { /* Unavailable local session cannot authorize a paid call. */ }
  // No session still permits no-cost demo responses; configured paid routes return 401.
  return fetch(path, { method: "POST", headers, credentials: "same-origin", cache: "no-store", body: JSON.stringify(body) });
}

export function providerFailureMessage(status: number): string {
  if (status === 401) return "Sign in to your creator account to use live generation.";
  if (status === 429) return "Your generation allowance is exhausted. Contact the operator.";
  if (status === 503) return "Live generation is unavailable. Please try again later.";
  return "Generation failed. Please try again.";
}
