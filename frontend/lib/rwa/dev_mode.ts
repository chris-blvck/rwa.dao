import type { RwaMode } from "./types";

export function canUseDevLiveMode(flag = process.env.NEXT_PUBLIC_RWA_DEV_TOOLS): boolean {
  return flag === "1";
}

export function normalizeUiMode(cookieMode: string | null | undefined, devLiveModeEnabled = canUseDevLiveMode()): RwaMode {
  if (devLiveModeEnabled && (cookieMode === "live" || cookieMode === "canned")) return cookieMode;
  return "canned";
}

export function modeCookie(mode: RwaMode): string {
  return `rwa-mode=${mode}; path=/; max-age=2592000`;
}
