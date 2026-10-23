import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export type SpendAction = "caption" | "compose" | "generate";

/** A public provider key/feature flag is never authorization to spend the owner's credits. */
export async function guardProviderSpend(req: Request, action: SpendAction, units = 1): Promise<NextResponse | null> {
  const token = /^Bearer ([^\s]{20,8192})$/.exec(req.headers.get("authorization") ?? "")?.[1];
  if (!token) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.json({ error: "spend_authorization_unavailable" }, { status: 503 });
  if (!Number.isSafeInteger(units) || units < 1 || units > 3) return NextResponse.json({ error: "invalid_spend_units" }, { status: 400 });
  try {
    // Use the user's validated JWT, never service_role or user-editable metadata, for the RPC.
    const sb = createClient(url, key, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: identity, error: authError } = await sb.auth.getUser(token);
    if (authError || !identity.user) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
    const { data, error } = await sb.rpc("rwa_reserve_provider_call", { p_action: action, p_units: units });
    if (error) {
      const denied = error.message?.includes("quota_exceeded");
      return NextResponse.json({ error: denied ? "quota_exceeded" : "spend_authorization_unavailable" }, { status: denied ? 429 : 503 });
    }
    if (data !== true) return NextResponse.json({ error: "spend_authorization_unavailable" }, { status: 503 });
    return null;
  } catch { return NextResponse.json({ error: "spend_authorization_unavailable" }, { status: 503 }); }
}

/** Read at most 20 KB, including chunked requests; reject before provider prompt construction. */
export async function readProviderBody<T>(req: Request): Promise<{ body: T } | { response: NextResponse }> {
  const reader = req.body?.getReader();
  let size = 0;
  const chunks: Uint8Array[] = [];
  if (reader) {
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 20_000) { await reader.cancel(); return { response: NextResponse.json({ error: "request_too_large" }, { status: 413 }) }; }
        chunks.push(value);
      }
    } catch { return { response: NextResponse.json({ error: "invalid_body" }, { status: 400 }) }; }
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try {
    const body = size ? JSON.parse(new TextDecoder().decode(bytes)) : {};
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("object required");
    return { body: body as T };
  } catch { return { response: NextResponse.json({ error: "invalid_body" }, { status: 400 }) }; }
}
