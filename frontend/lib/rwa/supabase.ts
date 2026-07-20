import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Supabase browser client — shares the Exhelia production project, but RWA-DAO data is
// isolated under the `rwa_*` table namespace (see supabase/migrations/0001_rwa_creations.sql).
//
// Config-gated: returns a client only when the public env vars are set; otherwise null, and
// the app keeps using localStorage (lib/rwa/storage.ts). The publishable/anon key is public
// by design — rows are protected by RLS (owner-scoped). Cloud sync of "My videos" activates
// once wallet/auth is wired (a human prerequisite); until then localStorage is the store.

let cached: SupabaseClient | null | undefined;

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function getSupabaseBrowser(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  cached = url && key ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } }) : null;
  return cached;
}
