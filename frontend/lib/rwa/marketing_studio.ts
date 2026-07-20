import type { Background, Hook, Persona, Preset, WatchAsset } from "./catalog";
import type { OutputSettings } from "./storage";

// Maps the studio selection → a Higgsfield Marketing Studio (`marketing_studio_video`) request.
//
// NOT called yet: the live provider is a human prerequisite (provider/key/rights). This documents
// the exact mapping so wiring the real backend is a drop-in. To actually run it, the watch must
// exist as a Marketing Studio *product* (ms_product_id) and each creator as an *avatar*
// (ms_avatar_id) — created once in Higgsfield from our renders/portraits.
export type MarketingStudioRequest = {
  model: "marketing_studio_video";
  mode?: string;
  aspect_ratio: string;
  resolution: "480p" | "720p" | "1080p";
  generate_audio: boolean;
  avatar_ids?: string[];
  product_ids?: string[];
  setting_id?: string;
  hook_id?: string;
  prompt?: string; // composed by buildPrompt() (see prompt_templates.ts), attached in the route
};

export function toMarketingStudioRequest(input: {
  watch: WatchAsset;
  persona: Persona;
  preset: Preset;
  background: Background;
  hook: Hook;
  output: Pick<OutputSettings, "resolution" | "format">;
}): MarketingStudioRequest {
  const { watch, persona, preset, background, hook, output } = input;
  // Marketing Studio caps at 1080p; map our 4K choice down to 1080p.
  const resolution: MarketingStudioRequest["resolution"] = output.resolution === "720p" ? "720p" : "1080p";
  return {
    model: "marketing_studio_video",
    mode: preset.mode,
    aspect_ratio: output.format,
    resolution,
    generate_audio: true,
    avatar_ids: persona.ms_avatar_id ? [persona.ms_avatar_id] : undefined,
    product_ids: watch.ms_product_id ? [watch.ms_product_id] : undefined,
    setting_id: background.ms_id,
    hook_id: hook.ms_id,
  };
}
