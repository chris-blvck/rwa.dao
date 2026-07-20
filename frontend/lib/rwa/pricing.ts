// Video model catalog + token pricing.
//
// Models map to Higgsfield (Bytedance Seedance / Kling) generators. Pricing is DATA-DRIVEN and
// configurable: a generation's provider cost is estimated in Higgsfield credits (scaling with
// resolution and duration), converted to USD, then the user is charged 2× that in XDC so the
// margin funds the treasury. Network gas is added on top and shown separately. The XDC/USD rate
// is fetched live (CoinGecko) with a fallback.
//
// Credit figures are anchored to the observed Higgsfield Marketing Studio cost (~150 credits for
// a ~12s 720p video) and are easy to retune once Higgsfield's exact per-credit rate is confirmed.

export const CREDIT_USD = 0.01; // ≈ USD per Higgsfield credit (top-up packs); configurable
export const MARKUP = 2; // user pays 2× provider cost → the extra 1× funds the treasury
export const GAS_XDC = 1; // network gas buffer per generation (XDC), shown separately
export const XDC_USD_FALLBACK = 0.02781; // used until the live price loads

export type VideoModel = {
  id: string; // our internal id
  label: string; // UI label
  blurb: string; // one-line, beginner-friendly explanation
  provider: string; // Higgsfield model id
  mode?: string; // provider mode (e.g. Seedance "fast")
  creditsPerSec: number; // base credits per second at 720p
  maxRes: "720p" | "1080p" | "4K";
};

// The provider tech is reached via Higgsfield today; the Alibaba models (HappyHorse, Wan) can also
// run Alibaba-native via DashScope for the Qwen Cloud path (lib/rwa/qwen_video.ts, env-gated).
export const VIDEO_MODELS: VideoModel[] = [
  { id: "happyhorse", label: "HappyHorse 1.0", blurb: "Alibaba's #1-ranked model — 1080p, native audio, ~10s fast.", provider: "happyhorse", mode: "std", creditsPerSec: 12, maxRes: "1080p" },
  { id: "wan_2", label: "Wan 2.7", blurb: "Alibaba Wan — cinematic, camera control, sound.", provider: "wan2_7", mode: "std", creditsPerSec: 13, maxRes: "4K" },
  { id: "seedance_2", label: "Seedance 2.0", blurb: "Best quality — cinematic, consistent identity.", provider: "seedance_2_0", mode: "std", creditsPerSec: 12, maxRes: "4K" },
  { id: "seedance_fast", label: "Seedance Fast", blurb: "Faster & cheaper — great for quick drafts.", provider: "seedance_2_0", mode: "fast", creditsPerSec: 6, maxRes: "720p" },
  { id: "seedance_mini", label: "Seedance Mini", blurb: "Budget — lightweight, lowest cost.", provider: "seedance_2_0_mini", creditsPerSec: 4, maxRes: "720p" },
  { id: "kling_3", label: "Kling 3.0", blurb: "Cinematic multi-shot with audio sync.", provider: "kling3_0", mode: "std", creditsPerSec: 14, maxRes: "4K" },
];

export function modelById(id: string): VideoModel {
  return VIDEO_MODELS.find((m) => m.id === id) ?? VIDEO_MODELS[0];
}

// ── Auto model routing ──────────────────────────────────────────────────────────────────────
// Creators shouldn't need to know what "Seedance Mini" is: "Auto" picks the right model from the
// style + output, and the UI shows what it chose and why. Rules are deliberately simple/auditable.

export const AUTO_MODEL_ID = "auto";

export type ModelChoice = { model: VideoModel; reason: string };

/** Pick the best model for a style + output. Order matters: capability first, then economy. */
export function recommendModel(
  conceptType: string,
  output: { resolution: string; duration: number; format?: string },
): ModelChoice {
  // Macro/texture styles live on fine detail — always the max-detail standard model.
  if (conceptType === "unboxing_asmr") {
    return { model: modelById("seedance_2"), reason: "macro detail — max-quality model" };
  }
  // 4K requires a model that can serve it.
  if (output.resolution === "4K") {
    const cinematic = output.duration >= 12 && output.format === "16:9";
    return cinematic
      ? { model: modelById("kling_3"), reason: "4K long cinematic — multi-shot model" }
      : { model: modelById("seedance_2"), reason: "4K output — max-quality model" };
  }
  // Long widescreen pieces read as edited films — the multi-shot model handles beats + audio sync.
  if (output.duration >= 12 && output.format === "16:9") {
    return { model: modelById("kling_3"), reason: "long widescreen — multi-shot cinematic model" };
  }
  // Short, low-res drafts don't need premium credits.
  if (output.resolution === "720p" && output.duration <= 8) {
    return { model: modelById("seedance_fast"), reason: "short 720p draft — fast model saves credits" };
  }
  return { model: modelById("seedance_2"), reason: "default — best quality, consistent identity" };
}

/** Resolve a stored model id ("auto" or explicit) into the concrete model + why. */
export function resolveModel(
  modelId: string,
  conceptType: string,
  output: { resolution: string; duration: number; format?: string },
): ModelChoice {
  if (modelId === AUTO_MODEL_ID) return recommendModel(conceptType, output);
  return { model: modelById(modelId), reason: "chosen manually" };
}

// Higher resolution → more credits.
export const RES_MULT: Record<string, number> = { "480p": 0.6, "720p": 1, "1080p": 1.8, "4K": 3.5 };

// Estimated provider cost in Higgsfield credits — scales with resolution and duration.
export function creditsFor(model: VideoModel, resolution: string, durationSec: number): number {
  const rm = RES_MULT[resolution] ?? 1;
  return Math.max(1, Math.round(model.creditsPerSec * durationSec * rm));
}

export type PriceBreakdown = {
  credits: number; // estimated provider credits
  apiUsd: number; // provider cost (credits × CREDIT_USD)
  genUsd: number; // user generation charge (apiUsd × MARKUP)
  genXdc: number; // generation charge in XDC
  gasXdc: number; // network gas (separated)
  totalXdc: number; // genXdc + gasXdc
  totalUsd: number; // total in USD at the current rate
  xdcUsd: number; // rate used
};

export function priceFor(model: VideoModel, resolution: string, durationSec: number, xdcUsd: number): PriceBreakdown {
  const px = xdcUsd > 0 ? xdcUsd : XDC_USD_FALLBACK;
  const credits = creditsFor(model, resolution, durationSec);
  const apiUsd = credits * CREDIT_USD;
  const genUsd = apiUsd * MARKUP;
  const genXdc = Math.ceil(genUsd / px);
  const gasXdc = GAS_XDC;
  const totalXdc = genXdc + gasXdc;
  return { credits, apiUsd, genUsd, genXdc, gasXdc, totalXdc, totalUsd: totalXdc * px, xdcUsd: px };
}

// Rough generation ETA (seconds) shown during rendering — Seedance/Kling take a few minutes.
export function etaSeconds(model: VideoModel, durationSec: number): number {
  const base = model.mode === "fast" || model.id === "seedance_mini" ? 150 : 300; // ~2.5–5 min
  return Math.round(base + durationSec * 6);
}
