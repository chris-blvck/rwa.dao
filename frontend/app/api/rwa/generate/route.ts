import { NextResponse, type NextRequest } from "next/server";
import { ASSETS, BACKGROUNDS, HOOKS, MUSIC, PERSONAS, PRESETS } from "@/lib/rwa/catalog";
import {
  absoluteImageUrl,
  createImage2Video,
  createMarketingStudioVideo,
  i2vTargetFor,
  isPubliclyFetchable,
  msEndpoint,
  readHiggsfieldCreds,
} from "@/lib/rwa/higgsfield";
import { toMarketingStudioRequest } from "@/lib/rwa/marketing_studio";
import { resolveModel } from "@/lib/rwa/pricing";
import { createVideoTask, dashscopeVideoModel, qwenVideoActive } from "@/lib/rwa/qwen_video";
import { buildPrompt } from "@/lib/rwa/prompt_templates";
import { buildRenderPlan } from "@/lib/rwa/render";
import { teamById } from "@/lib/rwa/teams";
import type { OutputSettings } from "@/lib/rwa/storage";

// Real generation entrypoint.
//
// It resolves the studio selection, builds a provider-ready RenderPlan (avatar vs product), and:
//   • by default (demo) returns the prepared plan only — NO provider call, NO credits burned;
//   • when live generation is explicitly switched on AND nothing is blocking, it CREATES a real
//     Higgsfield image-to-video job from the exact-watch reference plate and returns a request_id
//     the client polls at /api/rwa/generate/status.
//
// The one switch to go live: RWA_VIDEO_PROVIDER=higgsfield, RWA_ALLOW_LIVE_GENERATION=1, and a key
// (HIGGSFIELD_API_KEY="KEY_ID:KEY_SECRET" or HIGGSFIELD_KEY_ID/HIGGSFIELD_KEY_SECRET). Avatar
// (Marketing Studio) shots additionally need each creator created as an avatar (ms_avatar_id).
//
// GO-LIVE PREREQUISITE (see docs/DELIVERY.md): this route is client-initiated, so once live
// generation is enabled it will create real (credit-burning) jobs for any caller. Before flipping
// RWA_ALLOW_LIVE_GENERATION=1 on a public URL, put it behind user auth + a per-user rate/credit
// limit. It is safe by default: with the flag off (the demo) it only returns the prepared plan.

export const dynamic = "force-dynamic";

// The public origin Higgsfield should fetch the reference image from (its servers pull it).
// Prefer an explicit site URL; else the request origin.
function resolveOrigin(req: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL || process.env.URL || process.env.DEPLOY_PRIME_URL;
  if (configured) return configured.replace(/\/+$/, "");
  return req.nextUrl.origin;
}

type Body = {
  selection?: { asset_id?: string; persona_id?: string; preset_id?: string; background_id?: string; hook_id?: string; music_id?: string; team_id?: string };
  output?: Partial<OutputSettings>;
  /** Variant count ("takes"): the same brief rendered 1–3 times with distinct seeds; user keeps the best. */
  takes?: number;
  /** Composed start frame (stage 1) to animate instead of the reference plate — absolute or /path. */
  start_image_url?: string;
};

const MAX_TAKES = 3;

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Body;
  const sel = body.selection ?? {};

  const watch = ASSETS.find((a) => a.asset_id === sel.asset_id) ?? ASSETS[0];
  const persona = PERSONAS.find((p) => p.model_id === sel.persona_id) ?? PERSONAS[0];
  const preset = PRESETS.find((p) => p.preset_id === sel.preset_id) ?? PRESETS[0];
  const background = BACKGROUNDS.find((b) => b.background_id === sel.background_id) ?? BACKGROUNDS[0];
  const hook = HOOKS.find((h) => h.hook_id === sel.hook_id) ?? HOOKS[0];
  const music = MUSIC.find((m) => m.music_id === sel.music_id) ?? MUSIC[0];
  const team = teamById(sel.team_id ?? "none");
  const reqDuration = Number(body.output?.duration);
  const output: OutputSettings = {
    resolution: body.output?.resolution ?? "1080p",
    format: body.output?.format ?? "9:16",
    engine: body.output?.engine ?? "premium",
    duration: Number.isFinite(reqDuration) ? Math.min(15, Math.max(4, Math.round(reqDuration))) : 15,
    model: body.output?.model ?? "auto",
  };

  // Complete, provider-ready render plan — routes avatar vs product and adapts to the parameters.
  const render = buildRenderPlan({ watch, persona, preset, background, hook, music, team, output });

  // Structured provider params + the composed stylized prompt (versioned in prompt_templates.ts).
  // "auto" resolves against the style + output so the whole plan (and the live job) uses one model.
  const model = resolveModel(output.model ?? "auto", preset.concept_type, output).model;
  const request = {
    ...toMarketingStudioRequest({ watch, persona, preset, background, hook, output }),
    prompt: render.prompt,
    seedance_model: { id: model.id, provider: model.provider, mode: model.mode ?? null, duration: output.duration, resolution: output.resolution },
    team: { id: team.id, name: team.name, colors: team.colors },
  };

  const provider = process.env.RWA_VIDEO_PROVIDER || "mock";
  const liveAllowed =
    provider === "higgsfield" &&
    process.env.RWA_ALLOW_LIVE_GENERATION === "1" &&
    !!process.env.HIGGSFIELD_API_KEY;

  // What still blocks a real run (so the UI / ops know what's missing) — render-mode aware.
  const blockers: string[] = [];
  if (provider !== "higgsfield") blockers.push("provider_is_mock");
  if (process.env.RWA_ALLOW_LIVE_GENERATION !== "1") blockers.push("live_generation_disabled");
  if (!process.env.HIGGSFIELD_API_KEY) blockers.push("missing_provider_key");
  // Product (Seedance/DOP image-to-video) drives from the watch render — no MS ids needed.
  // Avatar (Marketing Studio) needs an avatar + the watch as a product, and a confirmed endpoint.
  if (render.mode === "avatar") {
    if (!render.avatar_id) blockers.push("missing_ms_avatar_id");
    if (!watch.ms_product_id) blockers.push("missing_ms_product_id");
    if (!msEndpoint()) blockers.push("ms_endpoint_not_configured");
  }

  const origin = resolveOrigin(req);
  // Stage 2: animate the composed frame from stage 1 when provided; else the reference plate.
  const startImageSource = typeof body.start_image_url === "string" && body.start_image_url ? body.start_image_url : render.start_image;
  const startImageUrl = startImageSource ? absoluteImageUrl(startImageSource, origin) : null;
  // Higgsfield fetches the start image server-side, so it must be publicly reachable.
  if (render.mode === "product" && startImageUrl && !isPubliclyFetchable(startImageUrl)) {
    blockers.push("start_image_not_public");
  }

  const canRun = liveAllowed && blockers.length === 0;

  // ── Alibaba-native path (Qwen Cloud): generate on DashScope (Wan / HappyHorse) ────────────────
  // Runs Alibaba's own API instead of the aggregator — the hackathon-qualifying path.
  if (qwenVideoActive() && process.env.RWA_ALLOW_LIVE_GENERATION === "1" && render.mode === "product" && startImageUrl && isPubliclyFetchable(startImageUrl)) {
    try {
      const dsModel = dashscopeVideoModel(model.id, true);
      const taskId = await createVideoTask({ prompt: render.prompt, imageUrl: startImageUrl, model: dsModel, resolution: output.resolution });
      return NextResponse.json({
        status: "generating",
        mode: "live",
        provider: "qwen",
        model: dsModel,
        request_id: taskId,
        poll_url: `/api/rwa/generate/status?id=${encodeURIComponent(taskId)}&provider=qwen`,
        start_image: startImageUrl,
        render,
        request,
      });
    } catch (err) {
      return NextResponse.json(
        { status: "error", mode: "live", provider: "qwen", error: String(err instanceof Error ? err.message : err), render, request },
        { status: 502 },
      );
    }
  }

  // ── Live path: only the product (image-to-video) route is auto-executable today ──────────────
  // (Avatar/Marketing Studio needs avatar+product ids created in Higgsfield first — kept prepared.)
  // Multi-take: the same brief runs `takes` times with distinct seeds; the creator keeps the best.
  const takes = Math.min(MAX_TAKES, Math.max(1, Math.round(Number(body.takes) || 1)));
  if (canRun && render.mode === "product" && startImageUrl) {
    const creds = readHiggsfieldCreds();
    if (creds) {
      const target = i2vTargetFor(model.id); // resolved id, so Auto's fast picks map to dop-turbo
      const seedBase = Date.now() % 1_000_000_000;
      const jobs: { request_id: string; poll_url: string; seed: number }[] = [];
      let firstError: unknown = null;
      for (let i = 0; i < takes; i++) {
        const seed = (seedBase + i * 7919) % 1_000_000_000; // distinct, deterministic-ish per take
        try {
          const job = await createImage2Video(creds, target, {
            prompt: render.prompt,
            imageUrl: startImageUrl,
            model: target.model,
            seed,
          });
          jobs.push({ request_id: job.request_id, poll_url: `/api/rwa/generate/status?id=${encodeURIComponent(job.request_id)}`, seed });
        } catch (err) {
          firstError = firstError ?? err; // partial takes are fine; total failure is a 502 below
        }
      }
      if (jobs.length > 0) {
        return NextResponse.json({
          status: "generating",
          mode: "live",
          provider,
          takes_requested: takes,
          takes_started: jobs.length,
          jobs,
          // Legacy single-job fields (first take) so older clients keep working.
          request_id: jobs[0].request_id,
          poll_url: jobs[0].poll_url,
          target,
          start_image: startImageUrl,
          render,
          request,
        });
      }
      return NextResponse.json(
        {
          status: "error",
          mode: "live",
          provider,
          error: String(firstError instanceof Error ? firstError.message : firstError ?? "job_creation_failed"),
          render,
          request,
        },
        { status: 502 },
      );
    }
  }

  // ── Live path: avatar (Marketing Studio) — needs avatar_id + product_id + a confirmed endpoint ─
  if (canRun && render.mode === "avatar" && render.avatar_id) {
    const ep = msEndpoint();
    const creds = readHiggsfieldCreds();
    if (ep && creds) {
      try {
        const job = await createMarketingStudioVideo(creds, ep, {
          prompt: render.prompt,
          avatarId: render.avatar_id,
          productId: watch.ms_product_id ?? null,
          settingId: background.ms_id ?? null,
          hookId: hook.ms_id ?? null,
          resolution: output.resolution === "720p" ? "720p" : "1080p",
          aspectRatio: output.format,
          generateAudio: render.voice,
        });
        return NextResponse.json({
          status: "generating",
          mode: "live",
          provider,
          request_id: job.request_id,
          poll_url: `/api/rwa/generate/status?id=${encodeURIComponent(job.request_id)}`,
          render,
          request,
        });
      } catch (err) {
        return NextResponse.json(
          { status: "error", mode: "live", provider, error: String(err instanceof Error ? err.message : err), render, request },
          { status: 502 },
        );
      }
    }
  }

  // ── Prepared path (demo default): full plan, no provider call, no credits burned ─────────────
  return NextResponse.json({
    status: "prepared",
    takes_requested: takes,
    mode: liveAllowed ? "live_ready" : "mock_only",
    provider,
    live_allowed: liveAllowed,
    can_run: canRun,
    blockers,
    start_image: startImageUrl,
    render, // the authoritative, provider-ready plan (avatar vs product routing)
    request,
    safety: { no_job_created: true, no_live_provider_call: true },
  });
}
