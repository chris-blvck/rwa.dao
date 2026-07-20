# RWA-DAO — reference video brief (Seedance / Marketing Studio)

Goal: a handful of **killer reference videos** of the RWA-DAO luxury watches, made cheaply and
on-brand, to use as portfolio/demo proof. **Don't generate blind** — follow the cost discipline.

## Approach (how to not burn credits)
1. **Image-to-video, always.** Feed the existing watch render as the **start image / reference**
   (`frontend/public/brand/watch-encrypto.png`, `watch-xdc.png`). This keeps the product exact and
   on-brand → far fewer re-rolls.
2. **Iterate cheap, finalize rich.** Lock the framing/prompt at **720p · 5s · mode=fast** (cheapest).
   Only re-run the winner at **1080p · 8s · mode=std**.
3. **One at a time.** Generate a single clip, judge it, then scale — never fire all variants at once.
4. **Format:** 9:16 vertical, `generate_audio: true` (Seedance native ambient/SFX).
5. **Compliance:** no financial claims; the QR = "verify", never "promise". No on-screen price.

## ⚠️ Modes & gotchas (READ THIS — where the first test went wrong)
Two mistakes tank a product shot:
- **Don't attach a talking avatar** for product/cinematic shots. Avatar / UGC / "Pro Virtual Try On"
  modes make a person **talk** (and often too fast). Prompts #1–#5 are product shots → **no avatar**.
- **Don't use "Pro Virtual Try On" for our watch.** Try-On **re-renders/swaps the product** → it
  invents a generic watch instead of the real RWA-DAO one. To keep the **exact** watch you MUST
  drive the shot from the **real watch render as the reference / start image**.

**Correct setup per prompt type:**
| Prompt | Mode | Attach | Avatar? |
|---|---|---|---|
| #1–#5 (product/cinematic) | **Seedance image-to-video** (or a Marketing Studio *product/cinematic* template like Product Showcase / Hyper Motion) | the **real watch render** as `start_image` / Product | **No** |
| Bonus (UGC testimonial) | Marketing Studio **avatar** | avatar + watch as Product | Yes — set a short script + **slower** speech |

If the watch still comes out wrong, the render you're attaching isn't strong enough — a clean, hi-res
product image of the RWA-DAO watch is the #1 asset; everything downstream depends on it.

## Which 5 to make (highest impact first)
1. Luxury Reveal (flagship hero)  2. Unboxing  3. Product Showcase  4. On-the-Wrist  5. World Cup edition.

## Settings cheat-sheet (Seedance 2.0)
`model: seedance_2_0` · `aspect_ratio: 9:16` · `resolution: 720p` (test) → `1080p` (final) ·
`duration: 5` (test) → `8` (final) · `mode: fast` (test) → `std` (final) · `generate_audio: true` ·
`medias: [{ role: start_image, value: <watch render> }]`

---

## Prompts (ready to paste)

### 1 — Luxury Reveal (flagship)
> Cinematic luxury reveal of the RWA-DAO Encrypto Black Diamond watch. Open on a dark, moody set with a single shaft of warm light; slow dolly-in as the light sweeps across the diamond-pavé case, catching every facet. The dial's QR motif glints, then the camera settles on a glamorous hero framing. Volumetric haze, deep blacks, premium reflections, shallow depth of field, elegant slow motion. Ultra-premium and sober. Subtle ambient hum with a soft chime on the reveal. No text.

### 2 — Unboxing (ASMR-grade)
> ASMR unboxing of a luxury watch. White-gloved hands slowly open a matte-black presentation box with an embossed QR emblem on the lid; soft top light, macro detail on the texture and clasp. The lid lifts to reveal the RWA-DAO Encrypto Black Diamond in a plush interior; a gentle glint travels across the diamonds. Clean, tactile, satisfying. Crisp foley — box seal, soft click, fabric. Vertical, premium, no text.

### 3 — Product Showcase (studio hero)
> Studio product showcase of the RWA-DAO Encrypto Black Diamond on a reflective black pedestal. Slow 180° orbit, glints of light travelling across the diamond-pavé case and bezel, crisp studio reflections, soft gradient backdrop. Macro sharpness on the dial and the QR detail. Clean, premium, e-commerce hero quality. Subtle cinematic whoosh. Vertical, no text.

### 4 — On-the-Wrist (lifestyle)
> Lifestyle close-up of the RWA-DAO luxury watch worn on the wrist. Natural golden-hour light, shallow depth of field; the wearer subtly turns the wrist and the diamonds catch the light, skin and leather-strap detail visible. Effortless, aspirational, real. Soft ambient lounge sound. Vertical, premium, no hype, no text.

### 5 — World Cup edition (Attention House tie-in)
> Cinematic reveal of the RWA-DAO luxury watch in {TEAM} national colours — e.g. France: blue, white and red accents washing across the diamond case. Dramatic stadium-tunnel lighting with the team colour wash, slow push-in to a glamorous hero of the dial. Energetic but premium — World Cup hype meets luxury. Subtle crowd-rumble ambience swelling on the reveal. Vertical, no text.
> (Swap {TEAM} + colours per team: 🇫🇷 blue/white/red · 🇧🇷 green/yellow/blue · 🇦🇷 light-blue/white · 🇲🇦 red/green …)

### Bonus — UGC testimonial (use **Marketing Studio**, not Seedance)
For a person presenting the watch, use a Marketing Studio **avatar** + the watch as the product:
> Authentic UGC selfie video, vertical 9:16. A stylish host holds the RWA-DAO Encrypto Black Diamond to camera, turns it so the diamonds catch the light, points at the QR on the dial. Calm, confident, real — "scan it, verify the story." Natural indoor light, handheld feel. No hype, no financial claims.

## Tool split
- **Seedance (image-to-video)** → product/cinematic (1–5 above). Best for the watch hero/reveal/showcase.
- **Marketing Studio (avatar/UGC)** → a person talking/presenting (the bonus). Needs an MS avatar + product.

## Suggested first run (minimal spend)
Run **#1 Luxury Reveal** and **#3 Product Showcase** at 720p/5s/fast first. If they look great,
re-run those two at 1080p/8s/std. That's 2 clips to validate quality before spending on the rest.
