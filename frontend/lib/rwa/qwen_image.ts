// Alibaba-native STAGE-1 compose via DashScope (Wanx image-synthesis) — so the two-stage pipeline is
// fully Alibaba-native (Qwen Cloud track), not just the stage-2 video. Mirrors qwen_video.ts: async
// task create + poll on DashScope's own endpoints.
//   Create: POST {base}/api/v1/services/aigc/text2image/image-synthesis
//           header X-DashScope-Async: enable
//           body { model, input:{ prompt, ref_img? }, parameters:{ size?, n:1 } }
//         → { output:{ task_id, task_status } }
//   Poll:   GET  {base}/api/v1/tasks/{task_id} → { output:{ task_status, results:[{ url }] } }
//
// Model id + endpoint host are env-overridable (QWEN_IMAGE_MODEL, DASHSCOPE_IMAGE_BASE_URL). Gated by
// RWA_VIDEO_PROVIDER=qwen + a DashScope key. Pure builders/normalizers are unit-tested; the exact
// reference-image field is best-effort until validated live with the key (same posture as the video
// adapter) — env override QWEN_IMAGE_REF_FIELD if DashScope expects a different key than "ref_img".

import { readQwenKey } from "./qwen";
import type { VideoTaskState } from "./qwen_video";

export const DASHSCOPE_IMAGE_BASE_DEFAULT = "https://dashscope-intl.aliyuncs.com";

export function dashscopeImageBase(env: Record<string, string | undefined> = process.env): string {
  return (env.DASHSCOPE_IMAGE_BASE_URL || env.DASHSCOPE_VIDEO_BASE_URL || env.DASHSCOPE_BASE_HOST || DASHSCOPE_IMAGE_BASE_DEFAULT).replace(/\/+$/, "");
}

/** Default Wanx text-to-image model — override with QWEN_IMAGE_MODEL. */
export function dashscopeImageModel(env: Record<string, string | undefined> = process.env): string {
  return env.QWEN_IMAGE_MODEL || "wanx2.1-t2i-turbo";
}

/** DashScope Wanx expects WIDTH*HEIGHT. Map our aspect formats to a supported size. */
export function sizeForFormat(format?: string): string {
  switch (format) {
    case "1:1":
      return "1024*1024";
    case "16:9":
      return "1280*720";
    case "9:16":
    default:
      return "720*1280";
  }
}

export type ImageSynthesisInput = { prompt: string; refImageUrl?: string | null; size?: string; model: string };

/** Build the DashScope image-synthesis task body (reference-guided when a ref image is present). */
export function buildImageSynthesisBody(input: ImageSynthesisInput, env: Record<string, string | undefined> = process.env): Record<string, unknown> {
  const inputObj: Record<string, unknown> = { prompt: input.prompt };
  if (input.refImageUrl) inputObj[env.QWEN_IMAGE_REF_FIELD || "ref_img"] = input.refImageUrl;
  const parameters: Record<string, unknown> = { n: 1 };
  if (input.size) parameters.size = input.size;
  return { model: input.model, input: inputObj, parameters };
}

/** Map a DashScope image-task payload → a stable { state, image_url } the studio can poll on. */
export function normalizeImageTask(json: unknown): { state: VideoTaskState; image_url: string | null; taskId: string | null } {
  if (!json || typeof json !== "object") return { state: "unknown", image_url: null, taskId: null };
  const out = (json as { output?: Record<string, unknown> }).output ?? {};
  const raw = String(out.task_status ?? "").toUpperCase();
  const state: VideoTaskState =
    raw === "SUCCEEDED" ? "succeeded" : raw === "FAILED" || raw === "CANCELED" || raw === "UNKNOWN" ? "failed" : raw === "RUNNING" ? "running" : raw === "PENDING" ? "pending" : "unknown";
  const results = Array.isArray(out.results) ? (out.results as Array<{ url?: string }>) : [];
  const image_url = typeof results[0]?.url === "string" ? results[0]!.url! : null;
  const taskId = typeof out.task_id === "string" ? (out.task_id as string) : null;
  return { state, image_url, taskId };
}

/** Create an async image-synthesis task on DashScope. Throws on transport / non-2xx. */
export async function createImageTask(
  input: ImageSynthesisInput,
  opts?: { apiKey?: string; fetchImpl?: typeof fetch; env?: Record<string, string | undefined> },
): Promise<string> {
  const env = opts?.env ?? process.env;
  const apiKey = opts?.apiKey ?? readQwenKey(env);
  if (!apiKey) throw new Error("qwen_image: no DashScope key");
  const f = opts?.fetchImpl ?? fetch;
  const res = await f(`${dashscopeImageBase(env)}/api/v1/services/aigc/text2image/image-synthesis`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}`, "X-DashScope-Async": "enable" },
    body: JSON.stringify(buildImageSynthesisBody(input, env)),
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (json && (json.message || json.code)) || `HTTP ${res.status}`;
    throw new Error(`qwen_image_create_failed: ${msg}`);
  }
  const taskId = normalizeImageTask(json).taskId;
  if (!taskId) throw new Error("qwen_image_create_failed: no task_id");
  return taskId;
}

/** Poll a DashScope image task. Throws on transport / non-2xx. */
export async function fetchImageTask(
  taskId: string,
  opts?: { apiKey?: string; fetchImpl?: typeof fetch; env?: Record<string, string | undefined> },
): Promise<{ state: VideoTaskState; image_url: string | null }> {
  const env = opts?.env ?? process.env;
  const apiKey = opts?.apiKey ?? readQwenKey(env);
  if (!apiKey) throw new Error("qwen_image: no DashScope key");
  const f = opts?.fetchImpl ?? fetch;
  const res = await f(`${dashscopeImageBase(env)}/api/v1/tasks/${encodeURIComponent(taskId)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`qwen_image_status_failed: HTTP ${res.status}`);
  const n = normalizeImageTask(json);
  return { state: n.state, image_url: n.image_url };
}

/** Whether the Alibaba-native compose path is active (provider selected + key present). */
export function qwenImageActive(env: Record<string, string | undefined> = process.env): boolean {
  return (env.RWA_VIDEO_PROVIDER || "").toLowerCase() === "qwen" && !!readQwenKey(env);
}
