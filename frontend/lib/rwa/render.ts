// Generation routing — turns a studio selection into a complete, provider-ready render plan.
// This is what makes the app work end-to-end for BOTH kinds of video:
//   • "product" styles → Seedance IMAGE-TO-VIDEO from the exact watch render (no avatar, no voice)
//     → the watch stays pixel-exact because the start frame IS the watch.
//   • "avatar" styles  → Marketing Studio with the creator as a talking/silent avatar + the watch
//     as the product reference.
// The plan adapts to the user's parameters (style, creator, model, quality, length, team, music).

import type { Background, Hook, MusicTrack, Persona, Preset, WatchAsset } from "./catalog";
import type { OutputSettings } from "./storage";
import { resolveModel } from "./pricing";
import { buildPrompt } from "./prompt_templates";
import { type RefKind, referenceFor } from "./references";
import type { Team } from "./teams";

export type RenderMode = "product" | "avatar";

export type RenderPlan = {
  mode: RenderMode;
  provider: "seedance" | "marketing_studio";
  model: string; // provider model id
  model_mode: string | null; // seedance std/fast, or the MS preset slug
  use_avatar: boolean;
  avatar_id: string | null; // ms_avatar_id (null until created in Higgsfield)
  product_image: string; // the exact watch render — start frame (product) / product ref (avatar)
  start_image: string | null; // product mode only: image-to-video start frame
  reference_kind: RefKind; // which reference plate drove the shot
  needs_plate: null | "team" | "scene" | "wrist"; // a better plate would lift this shot (asset gap)
  generate_audio: boolean;
  voice: boolean; // does the avatar speak?
  aspect_ratio: string;
  resolution: string;
  duration: number;
  prompt: string;
};

// Appended for product shots so the model reproduces the EXACT watch (the #1 fidelity issue).
const PRODUCT_FIDELITY =
  " Keep the watch identical to the reference image — same case, dial and QR code; do not invent a " +
  "different watch. No people, no on-screen text. Subtle, controlled motion so the product stays razor-sharp.";

// Hard artifact guardrails — the failure modes that make AI video read as AI. Appended to BOTH modes.
const ANTI_ARTIFACT =
  " Never: warped or extra fingers, morphing or melting watch geometry, altered or blurred QR pattern, " +
  "invented text or logos, duplicated hands on the dial, flicker, frame jitter, plastic-looking skin.";

function avatarInstruction(personaName: string, voice: boolean): string {
  const talk = voice
    ? `${personaName} presents the watch to camera at a natural pace.`
    : `${personaName} is shown with the watch — no dialogue, no voiceover, no talking; silent, ambient sound only.`;
  return ` ${talk} Keep the watch identical to the attached product reference — do not restyle it.`;
}

export function renderModeFor(preset: Preset): RenderMode {
  return preset.render_mode === "avatar" ? "avatar" : "product";
}

export function buildRenderPlan(input: {
  watch: WatchAsset;
  persona: Persona;
  preset: Preset;
  background: Background;
  hook: Hook;
  music?: MusicTrack | null;
  team?: Team | null;
  output: Pick<OutputSettings, "format" | "resolution" | "duration" | "model">;
}): RenderPlan {
  const { watch, persona, preset, background, team, output } = input;
  const mode = renderModeFor(preset);
  const base = buildPrompt(input);
  // Pick the best reference plate for this shot (drives fidelity + quality).
  // Close-up formats want the macro plate; everything else the 3-quarter hero.
  const angle = preset.concept_type === "unboxing_asmr" ? "macro" : "3q";
  const ref = referenceFor(watch, {
    worn: preset.concept_type === "worn_wrist",
    scene_id: background.background_id,
    team_id: team?.id,
    angle,
  });
  const common = {
    generate_audio: true,
    aspect_ratio: output.format,
    resolution: output.resolution,
    duration: output.duration,
    product_image: ref.image,
    reference_kind: ref.kind,
    needs_plate: ref.needs_plate,
  };

  if (mode === "avatar") {
    const voice = false; // brand default: silent, product-forward (a talking toggle can come later)
    return {
      ...common,
      mode,
      provider: "marketing_studio",
      model: "marketing_studio_video",
      model_mode: preset.mode ?? null,
      use_avatar: true,
      avatar_id: persona.ms_avatar_id ?? null,
      start_image: null,
      voice,
      prompt: base + avatarInstruction(persona.display_name, voice) + ANTI_ARTIFACT,
    };
  }

  // "auto" routes to the best model for this style + output; explicit ids pass through.
  const m = resolveModel(output.model, preset.concept_type, output).model;
  return {
    ...common,
    mode,
    provider: "seedance",
    model: m.provider,
    model_mode: m.mode ?? null,
    use_avatar: false,
    avatar_id: null,
    start_image: ref.image, // image-to-video → exact watch (from the best available plate)
    voice: false,
    prompt: base + PRODUCT_FIDELITY + ANTI_ARTIFACT,
  };
}
