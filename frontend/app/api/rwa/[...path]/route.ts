import { NextResponse, type NextRequest } from "next/server";
import { cannedResponse } from "@/lib/rwa/fixtures";
import { backendBaseUrl, MODE_COOKIE, resolveMode } from "@/lib/rwa/mode";

// Single server proxy for the portal (Exhelia "single server endpoint" pattern).
// The browser only talks to /api/rwa/<endpoint> (same origin); the server:
//   - canned mode: replies with the embedded fixtures (offline);
//   - live mode:   relays to the Python mock backend (FastAPI), future keys server-side.

export const dynamic = "force-dynamic";

type EndpointSpec = { backendPath: string; method: "GET" | "POST" };

const ENDPOINTS: Record<string, EndpointSpec> = {
  health: { backendPath: "/api/mock/health", method: "GET" },
  wallet: { backendPath: "/api/mock/wallet/connect", method: "POST" },
  preflight: { backendPath: "/api/mock/preflight", method: "POST" },
  "human-prerequisites": { backendPath: "/api/mock/human-prerequisites", method: "GET" },
  selection: { backendPath: "/api/mock/selection/options", method: "GET" },
  generation: { backendPath: "/api/mock/generation/payload", method: "POST" },
  payment: { backendPath: "/api/mock/payment/receipt", method: "POST" },
  "session-reset": { backendPath: "/api/mock/session/reset", method: "POST" },
};

async function readBody(req: NextRequest): Promise<Record<string, unknown>> {
  if (req.method === "GET" || req.method === "HEAD") return {};
  try {
    const parsed = await req.json();
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

async function handle(req: NextRequest, params: { path: string[] }) {
  const endpoint = params.path?.[0] ?? "";
  const spec = ENDPOINTS[endpoint];
  if (!spec) {
    return NextResponse.json(
      { error: "unknown_endpoint", message: `Unknown endpoint: ${endpoint}`, mode: "mock_only" },
      { status: 404 },
    );
  }

  const mode = resolveMode(req.cookies.get(MODE_COOKIE)?.value);
  const body = await readBody(req);
  const sessionId = req.nextUrl.searchParams.get("session_id") || (body.session_id as string) || "";

  // ── Canned mode: embedded fixtures ──────────────────────────────────────────
  if (mode === "canned") {
    const { status, body: out } = cannedResponse(endpoint, req.method, body);
    return NextResponse.json({ ...out, _mode_served: "canned" }, { status });
  }

  // ── Live mode: relay to the Python mock backend ─────────────────────────────
  let url = `${backendBaseUrl()}${spec.backendPath}`;
  if (endpoint === "selection" && sessionId) {
    url += `?session_id=${encodeURIComponent(sessionId)}`;
  }

  try {
    const upstream = await fetch(url, {
      method: spec.method,
      headers: { "Content-Type": "application/json" },
      body: spec.method === "POST" ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    const payload = await upstream.json().catch(() => ({}));
    return NextResponse.json({ ...payload, _mode_served: "live" }, { status: upstream.status });
  } catch (err) {
    // Live backend unreachable → explicit error (we do not silently fall back to canned).
    return NextResponse.json(
      {
        error: "backend_unreachable",
        message: `Mock backend unreachable at ${backendBaseUrl()}. Run: python -m app.main rwa-palier1-http-mock --serve --port 8011`,
        detail: String(err),
        mode: "mock_only",
      },
      { status: 502 },
    );
  }
}

export async function GET(req: NextRequest, ctx: { params: { path: string[] } }) {
  return handle(req, ctx.params);
}

export async function POST(req: NextRequest, ctx: { params: { path: string[] } }) {
  return handle(req, ctx.params);
}
