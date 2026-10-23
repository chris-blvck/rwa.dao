import { NextResponse, type NextRequest } from "next/server";

// Response headers are defense in depth. Spend authorization lives inside each handler.
const SECURITY_HEADERS: Record<string, string> = {
  "X-Frame-Options": "SAMEORIGIN",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
};

export function middleware(_req: NextRequest) {
  const res = NextResponse.next();
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.headers.set(k, v);
  return res;
}

export const config = {
  // Everything except Next static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
