import { NextResponse, type NextRequest } from "next/server";
import { ASSETS, BACKGROUNDS, PRESETS } from "@/lib/rwa/catalog";
import { buildComposePrompt } from "@/lib/rwa/compose";
import { absoluteImageUrl, createImageJob, imageTargetFor, readHiggsfieldCreds } from "@/lib/rwa/higgsfield";
import { createImageTask, dashscopeImageModel, qwenImageActive, sizeForFormat } from "@/lib/rwa/qwen_image";
import { referenceFor } from "@/lib/rwa/references";
import { teamById } from "@/lib/rwa/teams";
import type { OutputSettings } from "@/lib/rwa/storage";

// Stage 1 — compose the scene still. Demo (default): returns the best reference plate as the
// composed frame instantly (no cost) so the two-stage flow is visible. Live (RWA_ALLOW_LIVE_COMPOSE=1
// + Higgsfield key): composes a fresh still from the exact watch reference and returns it (or a job
// to poll). The chosen frame is then passed to /api/rwa/generate as start_image_url (stage 2).

export const dynamic = "force-dynamic";

type Body = {
  selection?: { asset_id?: string; preset_id?: string; background_id?: string; team_id?: string };
  output?: Partial<OutputSettings>;
  seed?: number;
};

function resolveOrigin(req: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL || process.env.URL || process.env.DEPLOY_PRIME_URL;
  return (configured || req.nextUrl.origin).replace(/\/+$/, "");
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Body;
  const sel = body.selection ?? {};
  const watch = ASSETS.find((a) => a.asset_id === sel.asset_id) ?? ASSETS[0];
  const preset = PRESETS.find((p) => p.preset_id === sel.preset_id) ?? PRESETS[0];
  const background = BACKGROUNDS.find((b) => b.background_id === sel.background_id) ?? BACKGROUNDS[0];
  const team = teamById(sel.team_id ?? "none");
  const format = body.output?.format ?? "9:16";

  const angle = preset.concept_type === "unboxing_asmr" ? "macro" : "3q";
  const ref = referenceFor(watch, {
    worn: preset.concept_type === "worn_wrist",
    scene_id: background.background_id,
    team_id: team.id,
    angle,
  });
  const prompt = buildComposePrompt({ watch, preset, background, team, format });

  const liveAllowed = process.env.RWA_ALLOW_LIVE_COMPOSE === "1";
  const creds = readHiggsfieldCreds();
  const origin = resolveOrigin(req);
  const referenceImageUrl = absoluteImageUrl(ref.image, origin);

  // ── Alibaba-native compose (Qwen Cloud): DashScope Wanx image-synthesis ───────────────────────
  // Makes stage 1 run on Alibaba's own API too (not just stage-2 video) — the fully-native pipeline.
  if (liveAllowed && qwenImageActive()) {
    try {
      const taskId = await createImageTask({ prompt, refImageUrl: referenceImageUrl, size: sizeForFormat(format), model: dashscopeImageModel() });
      return NextResponse.json({
        status: "composing",
        mode: "live",
        provider: "qwen",
        request_id: taskId,
        poll_url: `/api/rwa/compose/status?id=${encodeURIComponent(taskId)}&provider=qwen`,
        reference_kind: ref.kind,
        prompt,
      });
    } catch (err) {
      // Never dead-end: fall back to the reference plate as the composed frame.
      return NextResponse.json({
        status: "composed",
        mode: "plate_fallback",
        provider: "qwen",
        image_url: ref.image,
        reference_kind: ref.kind,
        needs_plate: ref.needs_plate,
        prompt,
        error: String(err instanceof Error ? err.message : err),
      });
    }
  }

  if (liveAllowed && creds) {
    try {
      const seed = Number.isFinite(Number(body.seed)) ? Math.floor(Number(body.seed)) : (Date.now() % 1_000_000_000);
      const job = await createImageJob(creds, imageTargetFor(), { prompt, referenceImageUrl, aspectRatio: format, seed });
      // Synchronous providers return the URL inside the request_id sentinel "sync:<url>".
      if (job.request_id.startsWith("sync:")) {
        return NextResponse.json({ status: "composed", mode: "live", image_url: job.request_id.slice(5), reference_kind: ref.kind, prompt });
      }
      return NextResponse.json({
        status: "composing",
        mode: "live",
        request_id: job.request_id,
        poll_url: `/api/rwa/compose/status?id=${encodeURIComponent(job.request_id)}`,
        reference_kind: ref.kind,
        prompt,
      });
    } catch (err) {
      // Fall back to the plate so the flow never dead-ends on a provider hiccup.
      return NextResponse.json({
        status: "composed",
        mode: "plate_fallback",
        image_url: ref.image,
        reference_kind: ref.kind,
        needs_plate: ref.needs_plate,
        prompt,
        error: String(err instanceof Error ? err.message : err),
      });
    }
  }

  // Demo: the reference plate is the composed frame (instant, no cost). `mode:"plate"` is honest.
  return NextResponse.json({
    status: "composed",
    mode: "plate",
    image_url: ref.image,
    reference_kind: ref.kind,
    needs_plate: ref.needs_plate,
    prompt,
    live_compose_available: liveAllowed && !!creds,
  });
}
