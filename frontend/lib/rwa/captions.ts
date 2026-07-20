// Per-platform captions for a generated video — short, simple, on-brand, non-financial.
//
// House rules (from the brand):
//   • TikTok    → tagline + hashtags (discovery-driven)
//   • Instagram → tagline + a richer hashtag block
//   • X         → tagline only, NO hashtags
// Captions never make a financial claim; they describe the product and the Web3 angle only.

import type { Persona, Preset, WatchAsset } from "./catalog";

export type Platform = "TikTok" | "Instagram" | "X";
export const CAPTION_PLATFORMS: Platform[] = ["TikTok", "Instagram", "X"];

export type CaptionCtx = { watch: WatchAsset; persona: Persona; preset: Preset };
export type Caption = { tagline: string; hashtags: string[]; full: string };

// Short taglines keyed to the style concept; "{watch}" is interpolated. Kept simple, no hype.
const TAGLINES: Record<string, string[]> = {
  unboxing: ["Unboxing the {watch} — where luxury meets Web3. 📦", "First look at the {watch}. Scan, verify, own the story."],
  unboxing_asmr: ["Pure unboxing ASMR — the {watch}. 🔊", "Close-up, calm, crafted. The {watch}."],
  watch_presentation: ["Meet the {watch}. The QR isn't a promise — it's a path to verify.", "The {watch}: craftsmanship you can scan."],
  luxury_reveal: ["A luxury reveal, done right. The {watch}. ✨", "Slow reveal, real story. The {watch}."],
  qr_explainer: ["One scan explains it all. The {watch}.", "What's behind the QR? Let's break down the {watch}."],
  product_showcase: ["Clean shots, real craft. The {watch}.", "Let the watch speak — the {watch}."],
  selfie_testimonial: ["My honest take on the {watch}. No hype.", "Why the {watch} caught my eye."],
  direct_to_camera: ["Straight talk on the {watch} — luxury, on-chain.", "Here's what the {watch} actually is."],
  before_after: ["From box to wrist — the {watch}. 👀", "Before & after: the {watch}."],
  tutorial: ["How the {watch} works: scan, verify, done.", "Step by step with the {watch}."],
  default: [
    "When a luxury watch meets Web3 — the {watch}.",
    "Real-world luxury, on-chain. The {watch}.",
    "Scan. Verify. Own the story. — the {watch}.",
  ],
};

// Hashtag sets per platform (no leading "#" here — added at render time).
const CORE = ["RWADAO", "RWA", "Web3", "LuxuryWatch", "XDC"];
const TIKTOK_TAGS = [...CORE, "crypto", "watchtok", "fyp"];
const INSTAGRAM_TAGS = [...CORE, "luxurywatches", "watchesofinstagram", "tokenization", "blockchain", "horology"];

// Tiny deterministic hash so the same selection always yields the same caption (no Math.random).
function seedFrom(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function captionFor(platform: Platform, ctx: CaptionCtx): Caption {
  const key = ctx.preset.concept_type in TAGLINES ? ctx.preset.concept_type : "default";
  const pool = TAGLINES[key];
  const seed = seedFrom(`${ctx.preset.preset_id}|${ctx.watch.asset_id}`);
  const tagline = pool[seed % pool.length].replace("{watch}", ctx.watch.title);
  const tags = platform === "TikTok" ? TIKTOK_TAGS : platform === "Instagram" ? INSTAGRAM_TAGS : [];
  const hashtags = tags.map((t) => `#${t}`);
  const full = hashtags.length ? `${tagline}\n\n${hashtags.join(" ")}` : tagline;
  return { tagline, hashtags, full };
}
