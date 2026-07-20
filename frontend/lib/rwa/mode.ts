import type { RwaMode } from "./types";

// Mode resolution (server) — mirrors Exhelia's canned/live toggle.
//   - Default: RWA_MODE (env), "canned" when absent.
//   - If RWA_ALLOW_MODE_COOKIE=1, the `rwa-mode` cookie can override (handy for demos).

export const MODE_COOKIE = "rwa-mode";

export function envMode(): RwaMode {
  return process.env.RWA_MODE === "live" ? "live" : "canned";
}

export function resolveMode(cookieValue?: string | null): RwaMode {
  if (process.env.RWA_ALLOW_MODE_COOKIE === "1" && (cookieValue === "live" || cookieValue === "canned")) {
    return cookieValue;
  }
  return envMode();
}

export function backendBaseUrl(): string {
  const raw = process.env.RWA_MOCK_API_BASE_URL || "http://127.0.0.1:8011";
  return raw.replace(/\/+$/, "");
}
