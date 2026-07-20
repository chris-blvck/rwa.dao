// Alibaba-native video generation via DashScope (Wan / HappyHorse) — the Qwen Cloud hackathon path
// (calling Alibaba Cloud's own API, not a 3rd-party aggregator). Uses DashScope's async task API:
//   Create: POST {base}/api/v1/services/aigc/video-generation/video-synthesis
//           header X-DashScope-Async: enable
//           body { model, input:{ prompt, img_url? }, parameters:{ resolution?, ... } }
//         → { output:{ task_id, task_status } }
//   Poll:   GET  {base}/api/v1/tasks/{task_id}  →  { output:{ task_status, video_url } }
//
// Endpoints + model ids are env-overridable. Both Wan and HappyHorse are confirmed on DashScope
// (Alibaba Cloud Model Studio) at this same video-synthesis endpoint. Gated by RWA_VIDEO_PROVIDER=qwen
// + a DashScope key, so nothing calls out in demo. Pure builders/normalizers are unit-tested.

import { readQwenKey } from "./qwen";

export const DASHSCOPE_VIDEO_BASE_DEFAULT = "https://dashscope-intl.aliyuncs.com";

export function dashscopeVideoBase(env: Record<string, string | undefined> = process.env): string {
  return (env.DASHSCOPE_VIDEO_BASE_URL || env.DASHSCOPE_BASE_HOST || DASHSCOPE_VIDEO_BASE_DEFAULT).replace(/\/+$/, "");
}

/** Resolve the DashScope video model id for our internal model + whether it's image-driven. */
export function dashscopeVideoModel(internalModelId: string, hasImage: boolean, env: Record<string, string | undefined> = process.env): string {
  if (env.QWEN_VIDEO_MODEL) return env.QWEN_VIDEO_MODEL;
  // HappyHorse 1.0 — Alibaba's flagship video model on DashScope (native 1080p + audio).
  if (internalModelId === "happyhorse") return hasImage ? (env.QWEN_HAPPYHORSE_I2V || "happyhorse-1.0-i2v") : (env.QWEN_HAPPYHORSE_T2V || "happyhorse-1.0-t2v");
  // Wan (also confirmed on DashScope) — the default.
  return hasImage ? (env.QWEN_WAN_I2V || "wan2.2-i2v-flash") : (env.QWEN_WAN_T2V || "wan2.2-t2v-plus");
}

export type VideoSynthesisInput = { prompt: string; imageUrl?: string | null; model: string; resolution?: string };

/**
 * DashScope expects the resolution's trailing quality letter UPPERCASE (e.g. "1080P", "720P").
 * Our UI carries lowercase ("1080p") — normalize before send, or Wan rejects the parameter.
 */
export function normalizeResolution(res: string): string {
  return res.trim().replace(/p$/i, "P");
}

/** Build the DashScope video-synthesis task body (image-to-video when img_url is present). */
export function buildVideoSynthesisBody(input: VideoSynthesisInput): Record<string, unknown> {
  const inputObj: Record<string, unknown> = { prompt: input.prompt };
  if (input.imageUrl) inputObj.img_url = input.imageUrl;
  const parameters: Record<string, unknown> = {};
  if (input.resolution) parameters.resolution = normalizeResolution(input.resolution);
  return { model: input.model, input: inputObj, parameters };
}

export type VideoTaskState = "pending" | "running" | "succeeded" | "failed" | "unknown";

/** Map a DashScope task payload → a stable { state, video_url } the studio can poll on. */
export function normalizeVideoTask(json: unknown): { state: VideoTaskState; video_url: string | null; taskId: string | null } {
  if (!json || typeof json !== "object") return { state: "unknown", video_url: null, taskId: null };
  const out = (json as { output?: Record<string, unknown> }).output ?? {};
  const raw = String(out.task_status ?? "").toUpperCase();
  const state: VideoTaskState =
    raw === "SUCCEEDED" ? "succeeded" : raw === "FAILED" || raw === "CANCELED" || raw === "UNKNOWN" ? "failed" : raw === "RUNNING" ? "running" : raw === "PENDING" ? "pending" : "unknown";
  const video_url = typeof out.video_url === "string" ? (out.video_url as string) : null;
  const taskId = typeof out.task_id === "string" ? (out.task_id as string) : null;
  return { state, video_url, taskId };
}

/** Create an async video-synthesis task on DashScope. Throws on transport / non-2xx. */
export async function createVideoTask(
  input: VideoSynthesisInput,
  opts?: { apiKey?: string; fetchImpl?: typeof fetch; env?: Record<string, string | undefined> },
): Promise<string> {
  const env = opts?.env ?? process.env;
  const apiKey = opts?.apiKey ?? readQwenKey(env);
  if (!apiKey) throw new Error("qwen_video: no DashScope key");
  const f = opts?.fetchImpl ?? fetch;
  const res = await f(`${dashscopeVideoBase(env)}/api/v1/services/aigc/video-generation/video-synthesis`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}`, "X-DashScope-Async": "enable" },
    body: JSON.stringify(buildVideoSynthesisBody(input)),
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (json && (json.message || json.code)) || `HTTP ${res.status}`;
    throw new Error(`qwen_video_create_failed: ${msg}`);
  }
  const taskId = normalizeVideoTask(json).taskId;
  if (!taskId) throw new Error("qwen_video_create_failed: no task_id");
  return taskId;
}

/** Poll a DashScope task. Throws on transport / non-2xx. */
export async function fetchVideoTask(
  taskId: string,
  opts?: { apiKey?: string; fetchImpl?: typeof fetch; env?: Record<string, string | undefined> },
): Promise<{ state: VideoTaskState; video_url: string | null }> {
  const env = opts?.env ?? process.env;
  const apiKey = opts?.apiKey ?? readQwenKey(env);
  if (!apiKey) throw new Error("qwen_video: no DashScope key");
  const f = opts?.fetchImpl ?? fetch;
  const res = await f(`${dashscopeVideoBase(env)}/api/v1/tasks/${encodeURIComponent(taskId)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`qwen_video_status_failed: HTTP ${res.status}`);
  const n = normalizeVideoTask(json);
  return { state: n.state, video_url: n.video_url };
}

/** Whether the Alibaba-native video path is active (provider selected + key present). */
export function qwenVideoActive(env: Record<string, string | undefined> = process.env): boolean {
  return (env.RWA_VIDEO_PROVIDER || "").toLowerCase() === "qwen" && !!readQwenKey(env);
}
