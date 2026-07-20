// Higgsfield live-generation adapter — the REAL provider call (env-gated, off by default).
//
// This turns a RenderPlan into an actual Higgsfield job over their public REST API and reads the
// result video back. It is written against the official SDK contract
// (https://github.com/higgsfield-ai/higgsfield-js):
//   • Base URL:  https://platform.higgsfield.ai            (override: HIGGSFIELD_BASE_URL)
//   • Auth:      Authorization: Key <KEY_ID>:<KEY_SECRET>
//   • Create:    POST /v1/image2video/dop
//                  { model, prompt, input_images: [{ type: "image_url", image_url }] }
//                → { request_id, ... }
//   • Poll:      GET  /requests/{request_id}/status
//                → { status: queued|in_progress|completed|failed|nsfw, video: { url }, ... }
//
// Nothing here runs unless the route is explicitly switched on (provider=higgsfield +
// RWA_ALLOW_LIVE_GENERATION=1 + a key present), so the demo default never burns credits.
//
// DOP is Higgsfield's cinematic image-to-video model — feeding it our exact-watch start frame
// (the reference plate) reproduces the watch and animates it. The endpoint/model are overridable
// so this can be repointed (e.g. to a Seedance route) once that public endpoint is confirmed,
// with zero changes to the studio or the route.

export const HIGGSFIELD_BASE_DEFAULT = "https://platform.higgsfield.ai";

export type HiggsfieldCreds = { keyId: string; keySecret: string };

/**
 * Read credentials from the environment. Accepts, in order:
 *   • HIGGSFIELD_KEY_ID + HIGGSFIELD_KEY_SECRET (separate)
 *   • HIGGSFIELD_API_KEY or HF_CREDENTIALS in "KEY_ID:KEY_SECRET" form
 * Returns null when nothing usable is set (keeps the app in prepared/mock mode).
 */
export function readHiggsfieldCreds(env: Record<string, string | undefined> = process.env): HiggsfieldCreds | null {
  const id = env.HIGGSFIELD_KEY_ID?.trim();
  const secret = env.HIGGSFIELD_KEY_SECRET?.trim();
  if (id && secret) return { keyId: id, keySecret: secret };

  const combined = (env.HIGGSFIELD_API_KEY || env.HF_CREDENTIALS || "").trim();
  if (combined.includes(":")) {
    const idx = combined.indexOf(":");
    const kId = combined.slice(0, idx).trim();
    const kSecret = combined.slice(idx + 1).trim();
    if (kId && kSecret) return { keyId: kId, keySecret: kSecret };
  }
  return null;
}

/** The Authorization header value for a request. */
export function authHeader(creds: HiggsfieldCreds): string {
  return `Key ${creds.keyId}:${creds.keySecret}`;
}

/** Base URL, env-overridable, trailing slash trimmed. */
export function baseUrl(env: Record<string, string | undefined> = process.env): string {
  return (env.HIGGSFIELD_BASE_URL || HIGGSFIELD_BASE_DEFAULT).replace(/\/+$/, "");
}

/**
 * Resolve a start-image path to an absolute, publicly reachable URL (Higgsfield fetches it server
 * side, so it MUST be public — a relative /brand/... path or a localhost origin will not work).
 */
export function absoluteImageUrl(image: string, origin: string): string {
  if (/^https?:\/\//i.test(image)) return image;
  const base = origin.replace(/\/+$/, "");
  const path = image.startsWith("/") ? image : `/${image}`;
  return `${base}${path}`;
}

/** True when Higgsfield's servers can actually fetch this image (not localhost / private). */
export function isPubliclyFetchable(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    const h = u.hostname;
    return !(h === "localhost" || h === "127.0.0.1" || h === "0.0.0.0" || h.endsWith(".local"));
  } catch {
    return false;
  }
}

export type I2VTarget = { endpoint: string; model: string };

// Map our internal video-model id → a Higgsfield image-to-video endpoint + model. Defaults to the
// documented DOP endpoint; "fast/mini" tiers use the turbo model. Overridable via env so the exact
// provider (e.g. a Seedance route) can be swapped in later without touching the studio.
export function i2vTargetFor(
  internalModelId: string,
  env: Record<string, string | undefined> = process.env,
): I2VTarget {
  const endpoint = env.HIGGSFIELD_I2V_ENDPOINT || "/v1/image2video/dop";
  if (env.HIGGSFIELD_I2V_MODEL) return { endpoint, model: env.HIGGSFIELD_I2V_MODEL };
  // Alibaba models exposed through Higgsfield — endpoint + slug overridable per model (set the
  // exact slug from your Higgsfield model picker; defaults are best-effort until confirmed live).
  if (internalModelId === "happyhorse") return { endpoint: env.HIGGSFIELD_HAPPYHORSE_ENDPOINT || endpoint, model: env.HIGGSFIELD_HAPPYHORSE_MODEL || "happyhorse" };
  if (internalModelId === "wan_2") return { endpoint: env.HIGGSFIELD_WAN_ENDPOINT || endpoint, model: env.HIGGSFIELD_WAN_MODEL || "wan" };
  const fast = internalModelId === "seedance_fast" || internalModelId === "seedance_mini";
  return { endpoint, model: fast ? "dop-turbo" : "dop" };
}

export type Image2VideoInput = {
  prompt: string;
  imageUrl: string; // absolute, public
  model: string;
  seed?: number;
};

/** Build the create-job request body (documented core fields only, to avoid 4xx on extras). */
export function buildImage2VideoBody(input: Image2VideoInput): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: input.model,
    prompt: input.prompt,
    input_images: [{ type: "image_url", image_url: input.imageUrl }],
  };
  if (typeof input.seed === "number" && Number.isFinite(input.seed)) body.seed = input.seed;
  return body;
}

export type JobState = "queued" | "in_progress" | "completed" | "failed" | "nsfw" | "unknown";
export type JobStatus = { state: JobState; video_url: string | null; raw: unknown };

const KNOWN_STATES: JobState[] = ["queued", "in_progress", "completed", "failed", "nsfw"];

function pickVideoUrl(json: Record<string, unknown>): string | null {
  const video = json.video as { url?: string } | undefined;
  if (video?.url) return video.url;
  // SDK result shape: jobs[0].results.raw.url
  const jobs = json.jobs as Array<{ results?: { raw?: { url?: string } } }> | undefined;
  const fromJobs = jobs?.[0]?.results?.raw?.url;
  if (fromJobs) return fromJobs;
  const results = json.results as { raw?: { url?: string }; url?: string } | undefined;
  return results?.raw?.url ?? results?.url ?? null;
}

/** Normalize a status payload into a stable shape the UI can poll on. */
export function normalizeStatus(json: unknown): JobStatus {
  if (!json || typeof json !== "object") return { state: "unknown", video_url: null, raw: json };
  const obj = json as Record<string, unknown>;
  const rawState = String(obj.status ?? obj.state ?? "").toLowerCase().replace(/\s+/g, "_");
  const state: JobState = (KNOWN_STATES as string[]).includes(rawState) ? (rawState as JobState) : "unknown";
  return { state, video_url: pickVideoUrl(obj), raw: json };
}

export type CreatedJob = { request_id: string; raw: unknown };

/** Create an image-to-video job. Throws on transport / non-2xx so the caller can surface it. */
export async function createImage2Video(
  creds: HiggsfieldCreds,
  target: I2VTarget,
  input: Image2VideoInput,
  env: Record<string, string | undefined> = process.env,
): Promise<CreatedJob> {
  const url = `${baseUrl(env)}${target.endpoint}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: authHeader(creds) },
    body: JSON.stringify(buildImage2VideoBody({ ...input, model: target.model })),
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (json && (json.message || json.error)) || `HTTP ${res.status}`;
    throw new Error(`higgsfield_create_failed: ${msg}`);
  }
  const request_id = String((json as Record<string, unknown>).request_id ?? (json as Record<string, unknown>).id ?? "");
  if (!request_id) throw new Error("higgsfield_create_failed: no request_id in response");
  return { request_id, raw: json };
}

// ── Image composition (stage 1: compose the scene still) ──────────────────────────────────────
// Compose a start frame with Higgsfield's image model (image-to-image, keeping the exact watch as
// the reference). Endpoint + model are env-overridable and the live path is gated by
// RWA_ALLOW_LIVE_COMPOSE=1 (see the compose route), so the demo never calls it — the reference
// plate stands in as the composed frame there.

export type ImageTarget = { endpoint: string; model: string };

export function imageTargetFor(env: Record<string, string | undefined> = process.env): ImageTarget {
  return {
    endpoint: env.HIGGSFIELD_IMAGE_ENDPOINT || "/v1/text2image/soul",
    model: env.HIGGSFIELD_IMAGE_MODEL || "soul",
  };
}

export type ComposeImageInput = {
  prompt: string;
  referenceImageUrl: string; // the exact watch render — kept via image-to-image so the piece stays exact
  aspectRatio?: string;
  seed?: number;
};

/** Build the compose-image request body (reference image preserved as input_images). */
export function buildComposeImageBody(input: ComposeImageInput, model: string): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model,
    prompt: input.prompt,
    input_images: [{ type: "image_url", image_url: input.referenceImageUrl }],
  };
  if (input.aspectRatio) body.aspect_ratio = input.aspectRatio;
  if (typeof input.seed === "number" && Number.isFinite(input.seed)) body.seed = input.seed;
  return body;
}

/** Pick a still-image URL from a status/create payload (image jobs return an image, not a video). */
export function pickImageUrl(json: Record<string, unknown>): string | null {
  const image = json.image as { url?: string } | undefined;
  if (image?.url) return image.url;
  const images = json.images as Array<{ url?: string }> | undefined;
  if (images?.[0]?.url) return images[0].url!;
  const jobs = json.jobs as Array<{ results?: { raw?: { url?: string } } }> | undefined;
  const fromJobs = jobs?.[0]?.results?.raw?.url;
  if (fromJobs) return fromJobs;
  const results = json.results as { raw?: { url?: string }; url?: string } | undefined;
  return results?.raw?.url ?? results?.url ?? null;
}

/** Normalize an image job status → { state, image_url }. */
export function normalizeImageStatus(json: unknown): { state: JobState; image_url: string | null; raw: unknown } {
  if (!json || typeof json !== "object") return { state: "unknown", image_url: null, raw: json };
  const obj = json as Record<string, unknown>;
  const rawState = String(obj.status ?? obj.state ?? "").toLowerCase().replace(/\s+/g, "_");
  const state: JobState = (KNOWN_STATES as string[]).includes(rawState) ? (rawState as JobState) : "unknown";
  return { state, image_url: pickImageUrl(obj), raw: json };
}

/** Create a compose-image job. Throws on transport / non-2xx so the caller can surface it. */
export async function createImageJob(
  creds: HiggsfieldCreds,
  target: ImageTarget,
  input: ComposeImageInput,
  env: Record<string, string | undefined> = process.env,
): Promise<CreatedJob> {
  const url = `${baseUrl(env)}${target.endpoint}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: authHeader(creds) },
    body: JSON.stringify(buildComposeImageBody(input, target.model)),
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (json && (json.message || json.error)) || `HTTP ${res.status}`;
    throw new Error(`higgsfield_image_failed: ${msg}`);
  }
  const request_id = String((json as Record<string, unknown>).request_id ?? (json as Record<string, unknown>).id ?? "");
  // Some image endpoints return the URL synchronously; expose both to the caller.
  const image_url = pickImageUrl(json as Record<string, unknown>);
  if (!request_id && !image_url) throw new Error("higgsfield_image_failed: no request_id or image url");
  return { request_id: request_id || `sync:${image_url}`, raw: json };
}

// ── Marketing Studio (avatar mode) ───────────────────────────────────────────────────────────
// Avatar shots run through Higgsfield Marketing Studio (a talking/silent creator presenting the
// watch). Unlike DOP image-to-video, the public REST path for Marketing Studio is not in the SDK
// README, so we DO NOT fabricate one: the operator must set HIGGSFIELD_MS_ENDPOINT to the confirmed
// path. Until then avatar mode stays "prepared" and the route reports ms_endpoint_not_configured.

/** The configured Marketing Studio endpoint, or null (avatar live path stays off until confirmed). */
export function msEndpoint(env: Record<string, string | undefined> = process.env): string | null {
  return env.HIGGSFIELD_MS_ENDPOINT?.trim() || null;
}

export type MarketingStudioInput = {
  prompt: string;
  avatarId: string;
  productId?: string | null;
  settingId?: string | null;
  hookId?: string | null;
  resolution?: string;
  aspectRatio?: string;
  generateAudio?: boolean;
};

/** Build the Marketing Studio create-job body from the render plan + created asset ids. */
export function buildMarketingStudioBody(input: MarketingStudioInput): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: "marketing_studio_video",
    prompt: input.prompt,
    avatar_ids: [input.avatarId],
    generate_audio: input.generateAudio ?? false,
  };
  if (input.productId) body.product_ids = [input.productId];
  if (input.settingId) body.setting_id = input.settingId;
  if (input.hookId) body.hook_id = input.hookId;
  if (input.resolution) body.resolution = input.resolution;
  if (input.aspectRatio) body.aspect_ratio = input.aspectRatio;
  return body;
}

/** Create a Marketing Studio (avatar) job at the configured endpoint. Throws on transport / non-2xx. */
export async function createMarketingStudioVideo(
  creds: HiggsfieldCreds,
  endpoint: string,
  input: MarketingStudioInput,
  env: Record<string, string | undefined> = process.env,
): Promise<CreatedJob> {
  const url = `${baseUrl(env)}${endpoint}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: authHeader(creds) },
    body: JSON.stringify(buildMarketingStudioBody(input)),
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (json && (json.message || json.error)) || `HTTP ${res.status}`;
    throw new Error(`higgsfield_ms_create_failed: ${msg}`);
  }
  const request_id = String((json as Record<string, unknown>).request_id ?? (json as Record<string, unknown>).id ?? "");
  if (!request_id) throw new Error("higgsfield_ms_create_failed: no request_id in response");
  return { request_id, raw: json };
}

/** Poll a job's status. Throws on transport / non-2xx. */
export async function fetchJobStatus(
  creds: HiggsfieldCreds,
  requestId: string,
  env: Record<string, string | undefined> = process.env,
): Promise<JobStatus> {
  const url = `${baseUrl(env)}/requests/${encodeURIComponent(requestId)}/status`;
  const res = await fetch(url, {
    method: "GET",
    headers: { Authorization: authHeader(creds) },
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (json && (json.message || json.error)) || `HTTP ${res.status}`;
    throw new Error(`higgsfield_status_failed: ${msg}`);
  }
  return normalizeStatus(json);
}
