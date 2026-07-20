// Reference asset system — the key to pro-quality, exact-watch videos.
//
// A generation is only as good as its START IMAGE (image-to-video reproduces that frame). So the
// app keeps a registry of reference plates per watch and picks the best one for the selection:
//   • product angle (front / 3-quarter / macro) for hero / showcase / reveal / unboxing
//   • wrist plate for worn shots
//   • in-scene plate (watch composited into a chosen backdrop) for scene-driven shots
//   • team colourway plate for World Cup editions
// Missing plates fall back to the best available hero AND flag what's needed, so nothing is
// silently wrong (a World Cup shot with no team plate still uses the hero + team-coloured prompt).
//
// The plates under public/brand/refs/ are generated once (Nano Banana Pro, from the real watch
// render as reference so the exact piece is preserved) and reused across many videos. Adding more
// plates here raises quality with zero code changes.

import type { WatchAsset } from "./catalog";

export type RefKind = "product" | "wrist" | "scene" | "team";
export type Angle = "front" | "3q" | "macro";

export type WatchReference = {
  watch_id: string;
  kind: RefKind;
  angle?: Angle; // for kind "product"
  scene_id?: string; // matches a background_id
  team_id?: string; // matches a team id
  image: string;
};

// Real reference plates (generated from the exact watch renders). Front render is the seed base;
// 3-quarter / macro / wrist / scene / team plates lift each shot type.
export const WATCH_REFERENCES: WatchReference[] = [
  // ── Encrypto Black Diamond ────────────────────────────────────────────────────────────────
  { watch_id: "watch_qr_concept_001", kind: "product", angle: "front", image: "/brand/watch-encrypto.png" },
  { watch_id: "watch_qr_concept_001", kind: "product", angle: "3q", image: "/brand/refs/encrypto-3q.png" },
  { watch_id: "watch_qr_concept_001", kind: "product", angle: "macro", image: "/brand/refs/encrypto-macro.png" },
  { watch_id: "watch_qr_concept_001", kind: "wrist", image: "/brand/refs/encrypto-wrist.png" },
  { watch_id: "watch_qr_concept_001", kind: "scene", scene_id: "luxury_showroom", image: "/brand/refs/encrypto-showroom.png" },
  { watch_id: "watch_qr_concept_001", kind: "scene", scene_id: "penthouse", image: "/brand/refs/encrypto-penthouse.png" },
  { watch_id: "watch_qr_concept_001", kind: "team", team_id: "france", image: "/brand/refs/encrypto-france.png" },
  { watch_id: "watch_qr_concept_001", kind: "team", team_id: "brazil", image: "/brand/refs/encrypto-brazil.png" },
  { watch_id: "watch_qr_concept_001", kind: "team", team_id: "argentina", image: "/brand/refs/encrypto-argentina.png" },
  // ── XDC Rainbow Pavé ──────────────────────────────────────────────────────────────────────
  { watch_id: "diamond_luxury_visual_001", kind: "product", angle: "front", image: "/brand/watch-xdc.png" },
  { watch_id: "diamond_luxury_visual_001", kind: "product", angle: "3q", image: "/brand/refs/xdc-3q.png" },
  { watch_id: "diamond_luxury_visual_001", kind: "product", angle: "macro", image: "/brand/refs/xdc-macro.png" },
  { watch_id: "diamond_luxury_visual_001", kind: "wrist", image: "/brand/refs/xdc-wrist.png" },
  { watch_id: "diamond_luxury_visual_001", kind: "scene", scene_id: "luxury_showroom", image: "/brand/refs/xdc-showroom.png" },
  { watch_id: "diamond_luxury_visual_001", kind: "scene", scene_id: "penthouse", image: "/brand/refs/xdc-penthouse.png" },
];

export type ReferencePick = {
  image: string; // the start frame to animate
  kind: RefKind;
  needs_plate: null | "team" | "scene" | "wrist"; // a better plate would improve this shot
};

export function referenceFor(
  watch: WatchAsset,
  opts: { worn?: boolean; scene_id?: string; team_id?: string; angle?: Angle },
): ReferencePick {
  const refs = WATCH_REFERENCES.filter((r) => r.watch_id === watch.asset_id);
  const productBy = (angle: Angle) => refs.find((r) => r.kind === "product" && r.angle === angle)?.image;
  // Hero = requested angle, else 3-quarter, else front, else any product plate, else the flat render.
  const hero =
    (opts.angle ? productBy(opts.angle) : undefined) ??
    productBy("3q") ??
    productBy("front") ??
    refs.find((r) => r.kind === "product")?.image ??
    watch.image;

  // Team colourway takes priority (World Cup edition).
  if (opts.team_id && opts.team_id !== "none") {
    const plate = refs.find((r) => r.kind === "team" && r.team_id === opts.team_id);
    if (plate) return { image: plate.image, kind: "team", needs_plate: null };
    return { image: hero, kind: "product", needs_plate: "team" }; // hero + team-coloured prompt
  }
  // In-scene plate for a chosen backdrop.
  if (opts.scene_id) {
    const plate = refs.find((r) => r.kind === "scene" && r.scene_id === opts.scene_id);
    if (plate) return { image: plate.image, kind: "scene", needs_plate: null };
  }
  // Wrist plate for worn shots.
  if (opts.worn) {
    const plate = refs.find((r) => r.kind === "wrist");
    if (plate) return { image: plate.image, kind: "wrist", needs_plate: null };
    return { image: hero, kind: "product", needs_plate: "wrist" };
  }
  // Best product hero for the requested angle.
  return { image: hero, kind: "product", needs_plate: opts.scene_id ? "scene" : null };
}
