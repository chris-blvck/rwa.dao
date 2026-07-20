import { NextResponse, type NextRequest } from "next/server";

// Global middleware — "prod security" hardening, safe for the demo:
//   (1) Security headers on every response (anti-clickjacking, anti-MIME-sniffing,
//       referrer policy, HSTS).
//   (2) OPT-IN guard on the server-to-server, spend-capable routes via API_GUARD_SECRET.
// The guard only activates when API_GUARD_SECRET is set, so the demo (no secrets) is unaffected.
// Note: /api/rwa/agent/run has its own CRON_SECRET guard; /api/rwa/generate is client-initiated and
// stays gated by the explicit RWA_ALLOW_LIVE_GENERATION flag (see that route + docs/DELIVERY.md).

const SECURITY_HEADERS: Record<string, string> = {
  "X-Frame-Options": "SAMEORIGIN",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
};

// Spend-capable server-to-server routes: the reward-voucher signer and the LLM caption relay.
// Closed in prod via the shared secret (x-rwa-api-key). The guard only activates if the secret is set.
const GUARDED: string[] = ["/api/rwa/rewards/voucher", "/api/rwa/agent/caption"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const secret = process.env.API_GUARD_SECRET;
  if (secret && GUARDED.some((p) => pathname.startsWith(p))) {
    if (req.headers.get("x-rwa-api-key") !== secret) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  const res = NextResponse.next();
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.headers.set(k, v);
  return res;
}

export const config = {
  // Everything except Next static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
