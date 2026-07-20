// Selection catalog for the Tier 1 portal.
//
// The mock backend `/api/mock/selection/options` returns a DEFAULT selection (it picks the
// first item of each list), not the full catalog. To offer a real selection UX
// (templates / personas / locations / assets) we mirror the repo CSVs here. IDs are kept
// identical to the source data; titles/hooks/disclaimers are faithful English renderings of
// the French source content (no claims invented). Source CSVs:
//   data/rwa_creator_presets.csv
//   data/rwa_influencer_models.csv
//   data/rwa_background_presets.csv
//   data/rwa_watch_assets.csv
//
// ⚠ Compliance: every item stays `rights_status: to_confirm_before_publication` or an internal
// draft. No public/provider-live use until rights are confirmed.

export type Preset = {
  preset_id: string;
  title: string;
  concept_type: string;
  hook_template: string;
  cta: string;
  disclaimer: string;
  risk_level: string;
  mode?: string; // Higgsfield Marketing Studio preset slug (for the future live adapter)
  // How the video is generated (drives the provider routing in render.ts):
  //   "product" (default) = Seedance image-to-video from the exact watch render (no avatar, no voice).
  //   "avatar"            = Marketing Studio with the creator as a talking avatar + watch as product.
  render_mode?: "product" | "avatar";
};

export type Persona = {
  model_id: string;
  display_name: string;
  persona: string;
  tone: string;
  language: string;
  usage_rights_status: string;
  image?: string; // public/brand/creators/*.png — falls back to a monogram if missing
  ms_avatar_id?: string; // Higgsfield Marketing Studio avatar id (set once created in Higgsfield)
};

export type Background = {
  background_id: string;
  title: string;
  visual_prompt: string;
  rights_status: string;
  ms_id?: string; // Higgsfield Marketing Studio setting id (for the future live adapter)
  image?: string; // public/brand/scenes/*.webp — real backdrop render; falls back to a styled tile if missing
};

export type WatchAsset = {
  asset_id: string;
  title: string;
  collection: string;
  qr_story: string;
  proof_status: string;
  rights_status: string;
  image: string; // real render from the repo (public/brand/*), rights to_confirm
  ms_product_id?: string; // Higgsfield Marketing Studio product id (set once created in Higgsfield)
  // Named materials render far better than generic "luxury watch" — the prompt engine weaves this in.
  material_prompt?: string;
};

const DISCLAIMER = "For information only. Not financial advice. Human validation required before distribution.";

// Curated style list — trimmed to the formats that are meaningful for a luxury-watch creator
// and that we can represent honestly. Removed the abstract/compliance-jargon ones (Watch & QR
// Presentation, Ultra-simple QR Explainer, Cautious Ambassador Pitch, Community Angle, Risk-first
// Explainer, Selfie Testimonial, Before & After). The four with a real preview clip come first.
export const PRESETS: Preset[] = [
  {
    preset_id: "unboxing_watch_mvp",
    title: "RWA-DAO Watch Unboxing",
    concept_type: "unboxing",
    hook_template: "Can a luxury watch become an understandable Web3 entry point?",
    cta: "TO_DEFINE",
    disclaimer: DISCLAIMER,
    risk_level: "review_required",
  },
  {
    preset_id: "product_showcase_mvp",
    title: "Product Showcase",
    concept_type: "product_showcase",
    hook_template: "Clean, premium hero shots that let the watch speak.",
    cta: "TO_DEFINE",
    disclaimer: DISCLAIMER,
    risk_level: "review_required",
    mode: "product_showcase",
  },
  {
    preset_id: "luxury_reveal_mvp",
    title: "Luxury Reveal",
    concept_type: "luxury_reveal",
    hook_template: "A luxury reveal — but with the limits shown before the hype.",
    cta: "TO_DEFINE",
    disclaimer: DISCLAIMER,
    risk_level: "review_required",
  },
  {
    preset_id: "worn_wrist_mvp",
    title: "On the Wrist",
    concept_type: "worn_wrist",
    hook_template: "See how the piece actually looks worn — close, real, on the wrist.",
    cta: "TO_DEFINE",
    disclaimer: DISCLAIMER,
    risk_level: "review_required",
  },
  // Marketing-Studio-aligned formats (mode maps to Higgsfield modes for the future live adapter).
  {
    preset_id: "unboxing_asmr_mvp",
    title: "Unboxing ASMR",
    concept_type: "unboxing_asmr",
    hook_template: "Satisfying close-up unboxing with an ASMR feel.",
    cta: "TO_DEFINE",
    disclaimer: DISCLAIMER,
    risk_level: "review_required",
    mode: "ugc_unboxing_asmr",
  },
  {
    preset_id: "direct_to_camera_mvp",
    title: "Direct to Camera",
    concept_type: "direct_to_camera",
    hook_template: "The creator speaks straight to camera, clear and calm.",
    cta: "TO_DEFINE",
    disclaimer: DISCLAIMER,
    risk_level: "review_required",
    mode: "ugc_direct_to_camera",
    render_mode: "avatar",
  },
  {
    preset_id: "tutorial_mvp",
    title: "How-to / Tutorial",
    concept_type: "tutorial",
    hook_template: "Step-by-step: the QR, what's verified, what to read.",
    cta: "TO_DEFINE",
    disclaimer: DISCLAIMER,
    risk_level: "low_hype_review_required",
    mode: "ugc_how_to",
    render_mode: "avatar",
  },
];

// AI-generated synthetic creators (Higgsfield / Nano Banana Pro). Not real people.
// AI-generated portraits are available under public/brand/creators/*.webp.
export const PERSONAS: Persona[] = [
  {
    model_id: "calm_educator",
    display_name: "Adrian",
    persona: "Calm educator — explains luxury Web3 without hype",
    tone: "clear, cautious, premium",
    language: "fr",
    usage_rights_status: "ai_generated_synthetic_persona",
    image: "/brand/creators/creator-calm-educator.webp",
  },
  {
    model_id: "luxury_host",
    display_name: "Valentina",
    persona: "Luxury showroom host — keeps disclaimers visible",
    tone: "sober, visual, refined",
    language: "fr",
    usage_rights_status: "ai_generated_synthetic_persona",
    image: "/brand/creators/creator-luxury-host.webp",
  },
  {
    model_id: "community_builder",
    display_name: "Marcus",
    persona: "Community builder — content, referral and reward drafts",
    tone: "direct, reassuring, non-financial",
    language: "fr",
    usage_rights_status: "ai_generated_synthetic_persona",
    image: "/brand/creators/creator-community-builder.webp",
  },
  {
    model_id: "market_analyst",
    display_name: "Mei",
    persona: "Market analyst — RWA and crypto context, sober tone",
    tone: "sharp, composed, factual",
    language: "fr",
    usage_rights_status: "ai_generated_synthetic_persona",
    image: "/brand/creators/creator-market-analyst.webp",
  },
  {
    model_id: "watch_expert",
    display_name: "Daniel",
    persona: "Watch expert — educational luxury, product-led",
    tone: "confident, premium, trustworthy",
    language: "fr",
    usage_rights_status: "ai_generated_synthetic_persona",
    image: "/brand/creators/creator-watch-expert.webp",
  },
];

// Brand-matching scene backdrops (RWA-DAO luxury watches x Web3, dark, premium, sober).
// Each scene references a real render under `public/brand/scenes/`. SceneTile shows that
// render and falls back to a styled placeholder tile (+ "Coming soon" badge) only if the
// image is missing or fails to load.
export const BACKGROUNDS: Background[] = [
  {
    background_id: "luxury_showroom",
    title: "Luxury Showroom",
    visual_prompt: "dark luxury watch boutique, black marble and smoked glass, soft spotlights, premium but sober",
    rights_status: "to_confirm_before_publication",
    image: "/brand/scenes/scene-showroom.webp",
  },
  {
    background_id: "penthouse",
    title: "Penthouse",
    visual_prompt: "luxury penthouse at night, floor-to-ceiling windows, city skyline, dark elegant, warm low light",
    rights_status: "to_confirm_before_publication",
    image: "/brand/scenes/scene-penthouse.webp",
  },
  {
    background_id: "marble_lounge",
    title: "Marble Lounge",
    visual_prompt: "premium marble lounge, white and grey marble with gold accents, soft luxurious light, refined minimal",
    rights_status: "to_confirm_before_publication",
    image: "/brand/scenes/scene-lounge.webp",
  },
  // Marketing-Studio-aligned settings (ms_id maps to Higgsfield setting presets).
  {
    background_id: "office",
    title: "Executive Office",
    visual_prompt: "modern executive office, glass wall, soft daylight, minimalist designer desk, premium corporate luxury",
    rights_status: "to_confirm_before_publication",
    ms_id: "d39dda10-643c-44e2-bfc8-2451dddde7d9",
    image: "/brand/scenes/scene-office.webp",
  },
  {
    background_id: "street",
    title: "Luxury District",
    visual_prompt: "upscale city street at golden hour, elegant storefronts, warm bokeh, sophisticated metropolitan mood",
    rights_status: "to_confirm_before_publication",
    ms_id: "8c95f9ba-5849-44b1-82d0-9f6b33240758",
    image: "/brand/scenes/scene-street.webp",
  },
  {
    background_id: "riviera",
    title: "Riviera Terrace",
    visual_prompt: "luxury Riviera terrace at golden hour, stone balustrade over calm sea and greenery, serene premium mood",
    rights_status: "to_confirm_before_publication",
    ms_id: "10f47b85-abd7-4899-b6b6-91ff2969d3bf",
    image: "/brand/scenes/scene-terrace.webp",
  },
];

export const ASSETS: WatchAsset[] = [
  {
    asset_id: "watch_qr_concept_001",
    title: "Encrypto Black Diamond",
    collection: "rwa_dao_watch",
    qr_story: "The QR is an entry point to information that must be verified",
    proof_status: "source_assets_imported_but_claims_to_confirm",
    rights_status: "to_confirm_before_publication",
    image: "/brand/watch-encrypto.png",
    material_prompt:
      "tonneau case fully set with black diamond pavé, glossy black lacquered numerals, a QR code " +
      "engraved at the dial's heart like a seal, black alligator strap with white contrast stitching",
  },
  {
    asset_id: "diamond_luxury_visual_001",
    title: "XDC Rainbow Pavé",
    collection: "rwa_dao_luxury",
    qr_story: "The visual illustrates the luxury positioning without any financial claim",
    proof_status: "source_assets_imported_but_claims_to_confirm",
    rights_status: "to_confirm_before_publication",
    image: "/brand/watch-xdc.png",
    material_prompt:
      "tonneau case set with a rainbow gradient of sapphires (orange to violet), bold black " +
      "numerals on a pavé dial, a QR code engraved at the dial's heart, white alligator strap",
  },
];

// Optional "hook" — the attention-grab opener (mirrors Higgsfield Marketing Studio hooks).
// ms_id maps to the Higgsfield hook preset for the future live adapter. "none" = no hook.
export type Hook = {
  hook_id: string;
  title: string;
  description: string;
  ms_id?: string;
};

export const HOOKS: Hook[] = [
  { hook_id: "none", title: "No hook", description: "Start directly — no special opener." },
  { hook_id: "product_hit", title: "Product Hit", description: "Object flies into frame, brief reaction, pivot to the watch.", ms_id: "3d45fb46-254f-4c83-9685-8e3d28945a67" },
  { hook_id: "spicy", title: "Slow Reveal", description: "Slow close-up reveal that leads into the pitch.", ms_id: "75b6d501-be0e-4416-a7ed-52f04f180574" },
  { hook_id: "interview", title: "Street Interview", description: "Casual street-interview style lead-in.", ms_id: "26cac2dd-99cb-4818-a678-509b0dab2c32" },
  { hook_id: "product_crash", title: "Crash & Reset", description: "Chaotic crash resets to a clean, calm review.", ms_id: "8101cd3e-3cc9-4607-a171-3582daa2f6ee" },
  { hook_id: "camera_bump", title: "Camera Bump", description: "Camera bump, quick recover, then the reveal.", ms_id: "2db84ed8-7082-4981-9c9c-9d61b3c28668" },
  { hook_id: "epic_fail", title: "Epic Fail", description: "A light fail, then an unflappable review.", ms_id: "ec9fdf99-314d-480d-a656-10d9861341e7" },
];

// Optional background music. "none" is the functional default. The style presets are royalty-free
// moods — NOT actual TikTok sounds (those require licensing). `preview` (an audio URL under
// public/brand/music/) enables the in-picker player and is wired once tracks are licensed; until
// then the picker marks each style "coming soon" and the choice is applied at generation time.
export type MusicTrack = {
  music_id: string;
  title: string;
  mood: string;
  preview?: string;
};

// Background music is a simple on/off toggle for now (with vs without). Curated style tracks +
// an in-picker player come later, once tracks are licensed (via MusicTrack.preview).
export const MUSIC: MusicTrack[] = [
  { music_id: "none", title: "No music", mood: "Clean audio from the video only" },
  { music_id: "background", title: "Background music", mood: "Add a fitting background track (coming soon)" },
];

export type CatalogSelection = {
  preset_id: string;
  persona_id: string;
  background_id: string;
  asset_id: string;
  hook_id: string;
  music_id: string;
  team_id: string;
};

/** Default selection = first of each list (matches the mock backend behaviour). */
export const DEFAULT_SELECTION: CatalogSelection = {
  preset_id: PRESETS[0].preset_id,
  persona_id: PERSONAS[0].model_id,
  background_id: BACKGROUNDS[0].background_id,
  asset_id: ASSETS[0].asset_id,
  hook_id: HOOKS[0].hook_id,
  music_id: MUSIC[0].music_id,
  team_id: "none",
};

// Real example clips (optimized from assets/videos). Used as animated previews on the style
// tiles and as the "generated" result preview, so the demo shows actual motion.
export const EXAMPLE_VIDEOS = [
  "/brand/videos/example-1.mp4",
  "/brand/videos/example-2.mp4",
  "/brand/videos/example-3.mp4",
  "/brand/videos/example-4.mp4",
  "/brand/videos/example-5.mp4",
];

// Still frame extracted from each clip — shown as the video poster so a real frame always
// appears even where the browser can't decode the clip (and before it starts playing).
export const EXAMPLE_POSTERS = [
  "/brand/videos/poster-1.jpg",
  "/brand/videos/poster-2.jpg",
  "/brand/videos/poster-3.jpg",
  "/brand/videos/poster-4.jpg",
  "/brand/videos/poster-5.jpg",
];

// Curated preview clips. Each clip is mapped to the ONE style it genuinely represents (reviewed
// frame-by-frame) — a clip is never reused, so two tiles never show the same footage. Styles
// without a matching clip return null and fall back to their concept icon in StyleTile/StyleThumb.
//   example-1 = piece worn on the wrist (worn product)       → On the Wrist
//   example-2 = styled atmospheric hero scene (festive)      → Luxury Reveal
//   example-3 = neon "10 Draws" promo  ⚠ on-screen "XRecorder" watermark + hype overlay — NOT used
//               anywhere (off-brand/amateur); replace the file before mapping it to a style.
//   example-4 = gloved hands opening the watch box           → RWA-DAO Watch Unboxing
//   example-5 = clean studio close-up of the dial (hero)     → Product Showcase
const PREVIEW_BY_PRESET: Record<string, { video: string; poster: string }> = {
  worn_wrist_mvp: { video: EXAMPLE_VIDEOS[0], poster: EXAMPLE_POSTERS[0] },
  luxury_reveal_mvp: { video: EXAMPLE_VIDEOS[1], poster: EXAMPLE_POSTERS[1] },
  unboxing_watch_mvp: { video: EXAMPLE_VIDEOS[3], poster: EXAMPLE_POSTERS[3] },
  product_showcase_mvp: { video: EXAMPLE_VIDEOS[4], poster: EXAMPLE_POSTERS[4] },
};

// Neutral default for the result preview, which must always show motion: the clean studio hero.
const DEFAULT_RESULT_INDEX = 4;

/** Curated example clip for a preset, or null when no clip genuinely matches it (tiles only). */
export function previewVideoFor(presetId: string): string | null {
  return PREVIEW_BY_PRESET[presetId]?.video ?? null;
}

/** Matching still frame (poster) for a preset's example clip, or null when there is none. */
export function previewPosterFor(presetId: string): string | null {
  return PREVIEW_BY_PRESET[presetId]?.poster ?? null;
}

/** Result-preview clip — always returns a clip (the curated one, else the clean hero default). */
export function resultVideoFor(presetId: string): string {
  return PREVIEW_BY_PRESET[presetId]?.video ?? EXAMPLE_VIDEOS[DEFAULT_RESULT_INDEX];
}

/** Result-preview poster — always returns a poster (mirrors resultVideoFor). */
export function resultPosterFor(presetId: string): string {
  return PREVIEW_BY_PRESET[presetId]?.poster ?? EXAMPLE_POSTERS[DEFAULT_RESULT_INDEX];
}
