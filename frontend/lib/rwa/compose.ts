// Stage 1 of the two-stage pipeline: COMPOSE a scene still, then animate it (see render.ts).
//
// A generation is only as good as its start frame. Instead of animating a generic reference plate,
// we first compose a still that places THIS exact watch into THIS exact scene / team colourway /
// framing — using the watch's render as the visual reference so the piece stays exact — then feed
// that composed still to the image-to-video model. The creator can preview + regenerate the cheap
// still before committing to the expensive video.
//
// This module is the pure prompt builder for the compose step (unit-tested). The provider call is
// either DashScope Wanx (Alibaba-native, qwen_image.ts) when RWA_VIDEO_PROVIDER=qwen, or
// higgsfield.createImageJob — both env-gated; the plate stands in as the "composed" frame in demo mode.

import type { Background, Preset, WatchAsset } from "./catalog";
import { type Team, teamPaletteText } from "./teams";

const COMPOSE_BIBLE =
  "Ultra-premium still photograph for a luxury-watch film's opening frame. Editorial product " +
  "photography: crisp focus on the timepiece, soft volumetric key light, true blacks, shallow depth " +
  "of field, refined high-end color grade. A single, composed, motionless frame — no motion blur.";

// Framing per style — the composed still is the FIRST frame the video will animate from.
const COMPOSE_FRAMING: Record<string, string> = {
  unboxing: "the watch resting in an open premium box, three-quarter hero angle",
  product_showcase: "the watch on a dark pedestal, clean three-quarter hero angle, one soft specular",
  luxury_reveal: "the watch emerging from shadow, moody rim light, glamorous hero angle",
  worn_wrist: "the watch worn on a wrist, natural window light, relaxed lifestyle framing",
  unboxing_asmr: "extreme macro of the watch's dial and clasp, razor-thin focus plane",
  direct_to_camera: "the watch held toward camera in authentic UGC framing, flattering practical light",
  tutorial: "the watch flat on a neutral surface beside a phone, clean explainer framing",
};

/** Build the still-composition prompt for the compose step (distinct from the video prompt). */
export function buildComposePrompt(input: {
  watch: WatchAsset;
  preset: Preset;
  background: Background;
  team?: Team | null;
  format?: string;
}): string {
  const { watch, preset, background, team, format } = input;
  const framing = COMPOSE_FRAMING[preset.concept_type] ?? COMPOSE_FRAMING.product_showcase;
  const material = watch.material_prompt ? ` The watch: ${watch.material_prompt}.` : "";
  const scene = background?.visual_prompt ? ` Setting: ${background.title} — ${background.visual_prompt}.` : "";
  const teamLine =
    team && team.id !== "none"
      ? ` Theme the watch in ${team.name} national colours (${teamPaletteText(team)}) — tasteful accents, not garish.`
      : "";
  const comp =
    format === "9:16"
      ? " Vertical composition, the watch dominant in the upper two-thirds."
      : format === "1:1"
        ? " Square composition, the watch centered."
        : format === "16:9"
          ? " Widescreen composition, the watch on a golden-ratio line, generous negative space."
          : "";
  const fidelity =
    " Reproduce the watch identically to the reference image — same case, dial and QR code; do not " +
    "invent a different watch. No people unless the framing calls for a wrist. No on-screen text, no logos.";
  return `${COMPOSE_BIBLE} Compose ${framing}.${material}${scene}${teamLine}${comp}${fidelity}`
    .replace(/\s+/g, " ")
    .trim();
}
