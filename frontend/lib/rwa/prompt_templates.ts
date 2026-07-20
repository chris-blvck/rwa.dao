import type { Background, Hook, MusicTrack, Persona, Preset, WatchAsset } from "./catalog";
import type { OutputSettings } from "./storage";
import { type Team, teamPaletteText } from "./teams";

// ── Cinematic prompt engine (v2) ────────────────────────────────────────────────────────────
//
// The stylized text prompts that drive video generation, kept as versioned config. v2 upgrades the
// flat one-line templates into a shot-grammar engine:
//   • STYLE_BIBLE          — the shared direction (always the prompt's opening).
//   • PROMPT_TEMPLATES     — the per-style narrative core ({placeholders} filled by buildPrompt).
//   • SHOT_GRAMMAR         — per-style lens/light "look" + open/develop/close beats.
//   • beat structure       — duration-aware: short clips get ONE perfect move; longer clips get
//                            staged beats so they feel edited, not drifting.
//   • composition          — format-aware framing (9:16 vertical vs 1:1 vs 16:9 cinematic).
//   • end frame            — every clip ends on a clean hero frame (thumbnail- and loop-ready).
// buildPrompt() is called by the generate route, so the provider plan carries the final prompt.

// Shared cinematic direction applied to every style — premium, tasteful, compliance-aware.
export const STYLE_BIBLE =
  "Ultra-premium luxury watch film for RWA-DAO. Agency-grade craft: crisp macro detail on the " +
  "timepiece, soft volumetric key light with controlled speculars, true blacks, shallow depth of " +
  "field, deliberate slow camera moves on a stabilized rig, refined high-end color grade. Sober " +
  "and confident — no hype, no financial claims, no on-screen price, no watermark.";

// One stylized narrative core per preset concept_type. Falls back to product_showcase if new.
export const PROMPT_TEMPLATES: Record<string, string> = {
  unboxing:
    "Unboxing of the {watch} ({collection}). Gloved hands lift the lid of a premium lacquered box; " +
    "anticipation builds through texture — tissue, seal, clasp — into a clean hero reveal of the dial. " +
    "{creatorLine} {sceneLine} {hookLine} {musicLine} {durationLine}",
  product_showcase:
    "Premium product showcase of the {watch}. Rotating hero shots on a dark pedestal, a single glint " +
    "travelling across the {collection} finish, studio-grade reflections; let the watch speak. " +
    "{creatorLine} {sceneLine} {hookLine} {musicLine} {durationLine}",
  luxury_reveal:
    "Atmospheric luxury reveal of the {watch}. Open wide and moody — silhouette and negative space — " +
    "then push in through haze to a glamorous hero of the dial catching its first full light. " +
    "{creatorLine} {sceneLine} {hookLine} {musicLine} {durationLine}",
  worn_wrist:
    "The {watch} worn on the wrist — close, real, lifestyle framing. Natural window light, subtle " +
    "wrist rotation, tactile strap grain and skin detail, candid confidence. " +
    "{creatorLine} {sceneLine} {hookLine} {musicLine} {durationLine}",
  unboxing_asmr:
    "ASMR unboxing of the {watch}. Extreme macro close-ups and satisfying tactile detail — box fibres, " +
    "the seal peeling, the clasp's precise click — slow, deliberate, hypnotic motion. " +
    "{creatorLine} {sceneLine} {hookLine} {musicLine} {durationLine}",
  direct_to_camera:
    "{creatorName} speaks straight to camera about the {watch}, calm and clear, holding the piece in " +
    "authentic UGC framing. {personaLine} {sceneLine} {hookLine} {musicLine} {durationLine}",
  tutorial:
    "Step-by-step explainer on the {watch} and its QR: what it is, what is verified, what to read. " +
    "Clean insert shots, simple confident beats. {creatorLine} {sceneLine} {hookLine} {musicLine} {durationLine}",
};

// Per-style camera grammar: the "look" (lens/light) + three beats used to stage longer clips.
type ShotGrammar = { look: string; open: string; develop: string; close: string };

const SHOT_GRAMMAR: Record<string, ShotGrammar> = {
  unboxing: {
    look: "85mm feel, soft top light with deep falloff, hands always graceful and unhurried",
    open: "top-down on the closed box, a fingertip tracing the emboss",
    develop: "the lid lifts, light spills onto the watch, slow dolly-in",
    close: "hero macro of the dial, perfectly still",
  },
  product_showcase: {
    look: "100mm macro product lens feel, black-void studio, one moving specular highlight",
    open: "slow 30-degree orbit around the case",
    develop: "rack focus from clasp to dial as the glint crosses the pavé",
    close: "front-on hero, the watch dead-center, light settling",
  },
  luxury_reveal: {
    look: "anamorphic wide feel, volumetric haze, chiaroscuro lighting",
    open: "wide silhouette of the watch in darkness, rim light only",
    develop: "push-in as the key light blooms across the dial",
    close: "glamour hero frame, flare kissing the crystal",
  },
  worn_wrist: {
    look: "50mm natural light feel, golden-hour window light, true skin tones",
    open: "the cuff slides back as the wrist lifts",
    develop: "gentle wrist rotation, the dial catching daylight",
    close: "relaxed hero of the watch on the wrist, city bokeh behind",
  },
  unboxing_asmr: {
    look: "true macro lens, razor-thin focus plane, tactile texture detail, soft directional light",
    open: "extreme close-up of the seal breaking, fibres flexing",
    develop: "the clasp opening in slow motion, metal micro-reflections",
    close: "macro of the QR engraving on the dial, breath-still",
  },
  direct_to_camera: {
    look: "35mm handheld-but-steady UGC feel, flattering practical light, honest color",
    open: "the creator raises the watch into frame",
    develop: "natural gestures presenting the dial to the lens",
    close: "the watch held beside a genuine smile, steady",
  },
  tutorial: {
    look: "clean 50mm explainer feel, bright even light, uncluttered surfaces",
    open: "the watch flat on a neutral surface, phone entering frame",
    develop: "the phone scans the QR, insert of the verification moment",
    close: "side-by-side hero: watch and verified screen",
  },
};

const DEFAULT_GRAMMAR = SHOT_GRAMMAR.product_showcase;

// Selected hooks become the OPENING BEAT (a concrete camera action), not a vague mention.
const HOOK_ACTIONS: Record<string, string> = {
  product_hit: "the watch glides into frame and settles with a soft, weighty landing",
  spicy: "an extreme close-up slides into focus, revealing the dial detail by detail",
  interview: "a candid street-style framing opens mid-moment before turning to the watch",
  product_crash: "a burst of chaotic motion snaps into a clean, calm composition on the watch",
  camera_bump: "the camera bumps, refocuses, and lands perfectly on the watch",
  epic_fail: "a light slip, an unflappable recover, and the watch takes the frame",
};

/**
 * Duration-aware beat structure: one perfect move for short clips, staged beats for longer ones.
 * A selected hook replaces the default opening beat with its concrete action.
 */
function beatLine(conceptType: string, duration: number, hookId?: string): string {
  const g = SHOT_GRAMMAR[conceptType] ?? DEFAULT_GRAMMAR;
  const open = (hookId && HOOK_ACTIONS[hookId]) || g.open;
  const look = `Look: ${g.look}.`;
  if (duration <= 8) {
    const move = hookId && HOOK_ACTIONS[hookId] ? `open as ${open}, flowing into ${g.close}` : `${g.develop} — no cuts, one perfect gesture`;
    return `${look} Single continuous camera move — ${move}.`;
  }
  if (duration <= 12) {
    return `${look} Two beats: (1) ${open}; (2) ${g.close}.`;
  }
  return `${look} Three beats, evenly paced: (1) ${open}; (2) ${g.develop}; (3) ${g.close}.`;
}

/** Format-aware composition so the framing is designed for the destination, not cropped into it. */
function compositionLine(format?: string): string {
  if (format === "9:16") {
    return "Vertical composition: the watch dominant and centered in the upper two-thirds, clean " +
      "headroom and bottom margin for platform UI.";
  }
  if (format === "1:1") {
    return "Square composition: the watch perfectly centered, symmetrical negative space.";
  }
  if (format === "16:9") {
    return "Widescreen cinematic composition: generous negative space, the watch on a golden-ratio line.";
  }
  return "";
}

// Every clip must cut cleanly into feeds and loops: end stable, end beautiful.
const END_FRAME_LINE =
  "End on a clean, stable hero frame of the watch — sharp, centered, thumbnail-ready.";

function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}

/** Compose the final, stylized generation prompt for the current selection. */
export function buildPrompt(input: {
  watch: WatchAsset;
  persona: Persona;
  preset: Preset;
  background: Background;
  hook: Hook;
  music?: MusicTrack | null;
  team?: Team | null;
  output?: Pick<OutputSettings, "format" | "duration">;
}): string {
  const { watch, persona, preset, background, hook, music, team, output } = input;
  const vars: Record<string, string> = {
    watch: watch.title,
    collection: watch.collection.replace(/_/g, " "),
    creatorName: persona.display_name,
    creatorLine: `Presented by ${persona.display_name} (${persona.persona}), tone: ${persona.tone}.`,
    personaLine: `Persona: ${persona.persona}; tone ${persona.tone}.`,
    sceneLine: `Scene: ${background.title} — ${background.visual_prompt}.`,
    hookLine: hook.hook_id !== "none" ? `Opening hook: ${hook.title}${hook.description ? ` (${hook.description})` : ""}.` : "",
    musicLine: music && music.music_id !== "none" ? `Music: ${music.title} — ${music.mood}.` : "No background music.",
    durationLine: output?.duration ? `Target length ${output.duration}s${output.format ? `, ${output.format}` : ""}.` : "",
  };
  const template = PROMPT_TEMPLATES[preset.concept_type] ?? PROMPT_TEMPLATES.product_showcase;
  const teamLine =
    team && team.id !== "none"
      ? ` Theme the watch in ${team.name} national colours (${teamPaletteText(team)}) — tasteful accents, not garish.`
      : "";
  // Named materials render dramatically better than generic "luxury watch".
  const materialLine = watch.material_prompt ? ` Materials: ${watch.material_prompt}.` : "";
  const grammar = ` ${beatLine(preset.concept_type, output?.duration ?? 15, hook.hook_id !== "none" ? hook.hook_id : undefined)}`;
  const composition = output?.format ? ` ${compositionLine(output.format)}` : "";
  // Collapse the whitespace left by any empty placeholders.
  return `${STYLE_BIBLE} ${fill(template, vars)}${materialLine}${teamLine}${grammar}${composition} ${END_FRAME_LINE}`
    .replace(/\s+/g, " ")
    .trim();
}