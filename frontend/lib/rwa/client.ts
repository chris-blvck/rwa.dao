import type { Palier1Result, RwaEndpoint } from "./types";

// Tier 1 portal browser client — adapted from
//   outputs/rwa_intelligence/chris_handoff/palier1_mock_client.(js|d.ts)
// Difference: we call the SAME-ORIGIN proxy /api/rwa/<endpoint> (not the backend directly),
// to keep the "key/secret server-side" pattern and work in previews.

import { describeError } from "./errors";

async function call<T = unknown>(
  endpoint: RwaEndpoint,
  init: { method?: "GET" | "POST"; query?: Record<string, string>; body?: Record<string, unknown> } = {},
): Promise<Palier1Result<T>> {
  const { method = "GET", query, body } = init;
  const qs = query && Object.keys(query).length ? `?${new URLSearchParams(query).toString()}` : "";
  let res: Response;
  try {
    res = await fetch(`/api/rwa/${endpoint}${qs}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
    });
  } catch (err) {
    return { ok: false, status: 0, error: "network_error", message: String(err), payload: {} as T };
  }

  const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  const error = typeof payload.error === "string" ? payload.error : "";

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error,
      message: describeError(error, (payload.message as string) || "The mock request failed."),
      payload: payload as T,
    };
  }
  if (payload.mode !== "mock_only") {
    return { ok: false, status: res.status, error: "unexpected_mode", message: "Expected a mock_only response.", payload: payload as T };
  }
  return { ok: true, status: res.status, payload: payload as T };
}

export const rwaClient = {
  health: <T = unknown>() => call<T>("health"),

  wallet: <T = unknown>(address = "0x0000000000000000000000000000000000000000") =>
    call<T>("wallet", { method: "POST", body: { address, request_signature: false } }),

  preflight: <T = unknown>(opts: { allow_provider_live?: boolean; allow_payment_live?: boolean } = {}) =>
    call<T>("preflight", { method: "POST", body: { ...opts } }),

  humanPrerequisites: <T = unknown>() => call<T>("human-prerequisites"),

  selection: <T = unknown>(sessionId?: string) =>
    call<T>("selection", { query: sessionId ? { session_id: sessionId } : undefined }),

  generation: <T = unknown>(sessionId?: string, opts: { live_call?: boolean; mode?: string } = {}) =>
    call<T>("generation", { method: "POST", body: { ...(sessionId ? { session_id: sessionId } : {}), ...opts } }),

  payment: <T = unknown>(sessionId?: string, opts: { allow_transfer?: boolean; transfer_hash?: string } = {}) =>
    call<T>("payment", { method: "POST", body: { ...(sessionId ? { session_id: sessionId } : {}), ...opts } }),

  sessionReset: <T = unknown>(sessionId?: string) =>
    call<T>("session-reset", { method: "POST", body: { session_id: sessionId || "" } }),
};
