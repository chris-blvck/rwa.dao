# Reference system — how the app makes pro, exact-watch videos

A generated video is only as good as its **start image** (image-to-video reproduces that frame).
So the app doesn't feed a flat catalog render into every shot — it picks the **best reference plate**
for the selection, then animates it. Add better plates → better videos, **no code change**.

## How it plugs in (`lib/rwa/references.ts`)
`referenceFor(watch, { worn, scene_id, team_id })` returns the start frame + flags:
- **team colourway** plate → World Cup editions (highest priority)
- **in-scene** plate → the watch composited into the chosen backdrop
- **wrist** plate → worn shots
- else the **base product render**, plus `needs_plate` telling us which better plate is missing.

`buildRenderPlan` (`render.ts`) uses this as the Seedance `start_image` (product mode) or the
Marketing Studio product reference (avatar mode). Nothing is silently wrong: a missing plate is
reported in the plan (`needs_plate`), so World Cup / scene / wrist shots are *activated for real*.

## The asset kit — GENERATED and registered (per watch)
The kit below now exists in `public/brand/refs/` (Nano Banana Pro, generated from the real watch
render as reference so the exact piece is preserved) and is wired into `WATCH_REFERENCES`:
| Plate | Encrypto | XDC | Drives |
|---|---|---|---|
| **Front** (seed render) | ✅ | ✅ | ultimate fallback |
| **3-quarter** hero | ✅ | ✅ | showcase / reveal / unboxing (default) |
| **Macro** (dial + QR) | ✅ | ✅ | ASMR / close-up beats |
| **On a wrist** | ✅ | ✅ | worn shots |
| **In-scene** (showroom, penthouse) | ✅ | ✅ | scene-driven cinematic shots |
| **Team colourways** (France, Brazil, Argentina) | ✅ | — | World Cup editions |

`buildRenderPlan` maps the preset to an angle (ASMR → macro, else → 3-quarter hero) and the chosen
background/team to the matching plate. Scenes without a plate (office, street, marble, riviera) fall
back to the hero and flag `needs_plate:"scene"`. To extend: drop a PNG in `public/brand/refs/`, add
one line to `WATCH_REFERENCES` — the plan picks it up, no other code changes.

## Two ways to build the plates (you don't have to shoot everything)
1. **Shoot once**: a few real photos (front, 3-quarter, macro, on-wrist) = the strongest base.
2. **Generate/composite**: from the front render, use an image model that keeps the exact product
   (Higgsfield `generate_image` with the watch as reference, or nano-banana / Photoshop) to make the
   team colourways and in-scene plates. Generate the **still** once, reuse it for many videos.

## The pro pipeline (what "ultra-pro" means)
1. **Reference plate** → the exact watch, right angle/scene/team (this module).
2. **Animate** it with Seedance (subtle, controlled motion → stays razor-sharp).
3. **Assemble**: for high-energy looks, cut several short exact-watch clips on the beat — the punch
   comes from the **edit**, not from frantic model motion.

Flat-render-to-video looks flat; **great still → animate → edit** looks like a real ad. The app is
built to drive step 1 automatically and hand a ready plan to steps 2–3.
