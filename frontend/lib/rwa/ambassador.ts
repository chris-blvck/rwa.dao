// Ambassador identity — persistent when Supabase is configured, else localStorage.
//
// Reuses the anonymous session established by lib/rwa/library.ts (initLibrary) so the ambassador's
// referral code and their upline (referred_by_code) live in public.rwa_ambassadors under owner-scoped
// RLS — no email/password. Everything degrades transparently to localStorage (not configured,
// anon sign-in off, offline) so the demo never breaks.

import { getSupabaseBrowser } from "./supabase";

const K_CODE = "rwa-ambassador-code";
const K_REFBY = "rwa-referred-by";
const K_SEED = "rwa-amb-seed";

export type AmbassadorState = { code: string | null; referredBy: string | null; mode: "cloud" | "local" };

async function currentUid(): Promise<string | null> {
  const sb = getSupabaseBrowser();
  if (!sb) return null;
  try {
    const { data } = await sb.auth.getSession();
    return data.session?.user?.id ?? null;
  } catch {
    return null;
  }
}

function ls(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function localAmbassador(): AmbassadorState {
  const s = ls();
  return { code: s?.getItem(K_CODE) ?? null, referredBy: s?.getItem(K_REFBY) ?? null, mode: "local" };
}

/** Capture an incoming ?ref=CODE (the upline) — persisted onto the row when the user joins. */
export function captureReferral(code: string): void {
  ls()?.setItem(K_REFBY, code);
}

/** Stable seed for the referral code: the wallet address, else a persisted per-browser demo seed. */
export function stableSeed(walletAddress?: string): string {
  if (walletAddress) return walletAddress;
  const s = ls();
  const existing = s?.getItem(K_SEED);
  if (existing) return existing;
  const seed = `demo-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  s?.setItem(K_SEED, seed);
  return seed;
}

/** Load the persisted ambassador (cloud first, then local), mirroring cloud → local for offline. */
export async function loadAmbassador(): Promise<AmbassadorState> {
  const sb = getSupabaseBrowser();
  const uid = await currentUid();
  if (sb && uid) {
    try {
      const { data, error } = await sb
        .from("rwa_ambassadors")
        .select("ref_code, referred_by_code")
        .eq("owner", uid)
        .maybeSingle();
      if (!error && data?.ref_code) {
        const s = ls();
        s?.setItem(K_CODE, data.ref_code);
        if (data.referred_by_code) s?.setItem(K_REFBY, data.referred_by_code);
        return { code: data.ref_code, referredBy: data.referred_by_code ?? null, mode: "cloud" };
      }
    } catch {
      /* fall through to local */
    }
  }
  return localAmbassador();
}

/**
 * Persist the ambassador code. If a cloud row already exists it stays canonical (stable code);
 * otherwise the code is inserted with the captured upline. Always mirrors to localStorage.
 */
export async function joinAmbassador(code: string): Promise<AmbassadorState> {
  const s = ls();
  const referredBy = s?.getItem(K_REFBY) ?? null;
  s?.setItem(K_CODE, code);

  const sb = getSupabaseBrowser();
  const uid = await currentUid();
  if (sb && uid) {
    try {
      const { data: existing } = await sb
        .from("rwa_ambassadors")
        .select("ref_code")
        .eq("owner", uid)
        .maybeSingle();
      if (existing?.ref_code) {
        s?.setItem(K_CODE, existing.ref_code);
        return { code: existing.ref_code, referredBy, mode: "cloud" };
      }
      const { error } = await sb
        .from("rwa_ambassadors")
        .insert({ owner: uid, ref_code: code, referred_by_code: referredBy });
      if (!error) return { code, referredBy, mode: "cloud" };
    } catch {
      /* fall through to local */
    }
  }
  return { code, referredBy, mode: "local" };
}
