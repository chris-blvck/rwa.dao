// "My videos" library — cloud (Supabase) when configured & reachable, else localStorage.
//
// Cloud uses Supabase anonymous auth so each visitor gets an authenticated session that
// satisfies the owner-scoped RLS on public.rwa_creations (no email/password needed).
// To enable cloud: set NEXT_PUBLIC_SUPABASE_URL/ANON_KEY and turn on "Anonymous sign-ins"
// in Supabase → Authentication → Providers. If anything fails (not configured, anon sign-in
// disabled, offline), every call transparently falls back to localStorage — the demo never breaks.

import { getSupabaseBrowser } from "./supabase";
import * as local from "./storage";
import type { Creation } from "./storage";

export type LibraryMode = "cloud" | "local";

let mode: LibraryMode = "local";
let uid: string | null = null;

function rowToCreation(r: any): Creation {
  return {
    id: r.id,
    createdAt: new Date(r.created_at).getTime(),
    watchId: r.watch_id,
    watchTitle: r.watch_title,
    watchImage: r.watch_image ?? "",
    creatorId: r.creator_id,
    creatorName: r.creator_name,
    styleId: r.style_id,
    styleTitle: r.style_title,
    sceneTitle: r.scene_title ?? "",
    videoUrl: r.video_url ?? undefined,
    requestId: r.request_id ?? undefined,
    postPlatform: r.post_platform ?? undefined,
    postUrl: r.post_url ?? undefined,
    postSubmittedAt: r.post_submitted_at ? new Date(r.post_submitted_at).getTime() : undefined,
  };
}

/** Try to establish a cloud session; returns the active mode. Safe to call once on mount. */
export async function initLibrary(): Promise<LibraryMode> {
  const sb = getSupabaseBrowser();
  if (!sb) return (mode = "local");
  try {
    const { data: s } = await sb.auth.getSession();
    if (s.session?.user) {
      uid = s.session.user.id;
      return (mode = "cloud");
    }
    const { data, error } = await sb.auth.signInAnonymously();
    if (error || !data.user) return (mode = "local");
    uid = data.user.id;
    return (mode = "cloud");
  } catch {
    return (mode = "local");
  }
}

export function libraryMode(): LibraryMode {
  return mode;
}

export async function listLibrary(): Promise<Creation[]> {
  const sb = getSupabaseBrowser();
  if (mode === "cloud" && sb && uid) {
    try {
      const { data, error } = await sb.from("rwa_creations").select("*").order("created_at", { ascending: false });
      if (!error && data) return data.map(rowToCreation);
    } catch {
      /* fall through */
    }
  }
  return local.listCreations();
}

export async function addToLibrary(c: Creation): Promise<Creation[]> {
  const sb = getSupabaseBrowser();
  if (mode === "cloud" && sb && uid) {
    try {
      const { error } = await sb.from("rwa_creations").insert({
        owner: uid,
        watch_id: c.watchId,
        watch_title: c.watchTitle,
        watch_image: c.watchImage,
        creator_id: c.creatorId,
        creator_name: c.creatorName,
        style_id: c.styleId,
        style_title: c.styleTitle,
        scene_title: c.sceneTitle,
        video_url: c.videoUrl ?? null,
        request_id: c.requestId ?? null,
      });
      if (!error) return listLibrary();
    } catch {
      /* fall through */
    }
  }
  return local.addCreation(c);
}

export async function updateInLibrary(id: string, patch: Partial<Creation>): Promise<Creation[]> {
  const sb = getSupabaseBrowser();
  if (mode === "cloud" && sb && uid) {
    try {
      const dbPatch: Record<string, unknown> = {};
      if (patch.videoUrl !== undefined) dbPatch.video_url = patch.videoUrl;
      if (patch.requestId !== undefined) dbPatch.request_id = patch.requestId;
      if (patch.postPlatform !== undefined) dbPatch.post_platform = patch.postPlatform;
      if (patch.postUrl !== undefined) dbPatch.post_url = patch.postUrl;
      if (patch.postSubmittedAt !== undefined) dbPatch.post_submitted_at = new Date(patch.postSubmittedAt).toISOString();
      const { error } = await sb.from("rwa_creations").update(dbPatch).eq("id", id);
      if (!error) return listLibrary();
    } catch {
      /* fall through */
    }
  }
  return local.updateCreation(id, patch);
}

export async function removeFromLibrary(id: string): Promise<Creation[]> {
  const sb = getSupabaseBrowser();
  if (mode === "cloud" && sb && uid) {
    try {
      const { error } = await sb.from("rwa_creations").delete().eq("id", id);
      if (!error) return listLibrary();
    } catch {
      /* fall through */
    }
  }
  return local.removeCreation(id);
}
