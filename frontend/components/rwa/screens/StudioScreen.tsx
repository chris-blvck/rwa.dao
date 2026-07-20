"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Slot } from "@/components/rwa/Slot";
import { GalleryModal } from "@/components/rwa/GalleryModal";
import {
  WatchTile, CreatorTile, StyleTile, SceneTile, HookTile, MusicTile,
  WatchThumb, CreatorThumb, StyleThumb, SceneThumb, HookThumb, MusicThumb,
} from "@/components/rwa/Tiles";
import { Chip, ENGINE_INFO, fmtDur, RenderingCard, Seg } from "@/components/rwa/studio-ui";
import { ASSETS, BACKGROUNDS, HOOKS, MUSIC, PERSONAS, PRESETS, resultPosterFor, resultVideoFor } from "@/lib/rwa/catalog";
import { etaSeconds, VIDEO_MODELS } from "@/lib/rwa/pricing";
import { TEAMS } from "@/lib/rwa/teams";
import { renderModeFor } from "@/lib/rwa/render";
import { CAPTION_PLATFORMS, captionFor } from "@/lib/rwa/captions";
import { buildMintLink } from "@/lib/rwa/rwa_watch_nft";
import { MAX_DURATION, MIN_DURATION, type Engine, type Format, type Resolution } from "@/lib/rwa/storage";
import { useStudio } from "@/lib/rwa/studio-context";

const STYLE_CATEGORY: Record<string, string> = {
  unboxing: "Showcase", product_showcase: "Showcase", luxury_reveal: "Showcase",
  worn_wrist: "Showcase", unboxing_asmr: "Showcase", direct_to_camera: "Explainer", tutorial: "Explainer",
};

export function StudioScreen() {
  const s = useStudio();
  const { watch, persona, preset, background, hook, music, team, output, chosen, selectedModel, cost, price } = s;

  return (
    <section className="fade-up mx-auto max-w-5xl px-5 pb-16 pt-10 sm:px-8 sm:pt-12">
      <Link href="/" className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-fgMuted transition-colors hover:text-fg">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        Back
      </Link>
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="eyebrow text-fgMuted">Compose your video</div>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-fg">Watch · Creator · Style · Scene · Hook · Music</h2>
        </div>
        <Button variant="secondary" size="md" onClick={s.surprise} className="gap-2">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 3h5v5M4 20l16-16M21 16v5h-5M15 15l6 6M4 4l5 5" />
          </svg>
          Random
        </Button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Slot label="Watch" name={watch.title} thumb={<WatchThumb asset={watch} />} onClick={() => s.setGallery("watch")} />
        <Slot label="Creator" name={persona.display_name} thumb={<CreatorThumb persona={persona} />} onClick={() => s.setGallery("creator")} />
        <Slot label="Style" name={preset.title} thumb={<StyleThumb preset={preset} />} onClick={() => s.setGallery("style")} />
        <Slot label="Scene" name={background.title} thumb={<SceneThumb background={background} />} onClick={() => s.setGallery("scene")} tag={background.image ? undefined : "Soon"} />
        <Slot label="Hook" name={hook.title} thumb={<HookThumb hook={hook} />} onClick={() => s.setGallery("hook")} />
        <Slot
          label="Music"
          name={music.title}
          thumb={<MusicThumb track={music} />}
          onClick={() => s.rechoose({ music_id: chosen.music_id === "none" ? "background" : "none" })}
          actionLabel={chosen.music_id === "none" ? "Turn on" : "Turn off"}
          comingSoon
        />
      </div>

      <div className="mt-5">
        <div className="eyebrow mb-2 text-fgMuted">⚽ World Cup colours</div>
        <div className="flex flex-wrap gap-2">
          {TEAMS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => s.rechoose({ team_id: t.id })}
              aria-pressed={chosen.team_id === t.id}
              className={[
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                chosen.team_id === t.id ? "border-fg bg-fg text-bg" : "border-line2 text-fgSoft hover:border-fg hover:text-fg",
              ].join(" ")}
            >
              <span aria-hidden="true">{t.flag}</span> {t.name}
              {t.id !== "none" ? (
                <span className="ml-0.5 flex gap-0.5">
                  {t.colors.map((c, i) => (
                    <span key={i} className="h-2.5 w-2.5 rounded-full ring-1 ring-black/20" style={{ backgroundColor: c }} />
                  ))}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {/* Generate bar */}
      <div className="mt-8 rounded-2xl border border-line2 bg-bg2 p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Seg label="Engine" value={output.engine === "premium" ? "Premium" : "Free"} options={["Premium", "Free"]} onChange={(v) => s.updateOutput({ engine: (v === "Free" ? "local" : "premium") as Engine })} />
            {output.engine === "premium" ? (
              <Seg
                label="Model"
                value={s.modelIsAuto ? "Auto" : selectedModel.label}
                options={["Auto", ...VIDEO_MODELS.map((m) => m.label)]}
                onChange={(v) => {
                  if (v === "Auto") { s.updateOutput({ model: "auto" }); return; }
                  const m = VIDEO_MODELS.find((x) => x.label === v);
                  if (m) s.updateOutput({ model: m.id });
                }}
              />
            ) : null}
            <Seg label="Format" value={output.format} options={["9:16", "1:1", "16:9"]} onChange={(v) => s.updateOutput({ format: v as Format })} />
            <Seg label="Quality" value={output.resolution} options={["720p", "1080p", "4K"]} onChange={(v) => s.updateOutput({ resolution: v as Resolution })} />
            {output.engine === "premium" ? (
              <Seg label="Takes" value={String(s.takes)} options={["1", "2", "3"]} onChange={(v) => s.setTakes(Number(v))} />
            ) : null}
            <span className="inline-flex items-center gap-2">
              <span className="eyebrow text-fgMuted">Length</span>
              <input
                type="range" min={MIN_DURATION} max={MAX_DURATION} step={1} value={output.duration}
                onChange={(e) => s.updateOutput({ duration: Number(e.target.value) })}
                aria-label="Video length in seconds" className="h-1 w-24 cursor-pointer accent-fg"
              />
              <span className="w-9 text-xs font-semibold tabular-nums text-fgSoft">{fmtDur(output.duration)}</span>
            </span>
            <Chip>{output.engine === "local" ? "Free · local render" : `◆ ${cost} XDC / video`}</Chip>
          </div>
          <Button onClick={s.onPrimary} disabled={s.phase === "rendering" || s.phase === "composing" || s.phase === "frame" || s.busy === "wallet" || s.busy === "pay"} className="sm:min-w-52">
            {s.phase === "rendering"
              ? `Rendering… ${s.progress}%`
              : s.busy === "pay" ? "Processing payment…"
              : s.busy === "wallet" ? "Connecting…"
              : !s.wallet ? "Connect wallet to generate"
              : output.engine === "local" ? "Generate · free"
              : s.credits < s.totalCost ? "Top up demo XDC"
              : `Pay & generate · ◆ ${s.totalCost}${s.takes > 1 ? ` · ${s.takes} takes` : ""}`}
          </Button>
        </div>
        {output.engine === "premium" ? (
          <p className="mt-3 text-xs text-fgMuted">
            <span className="font-semibold text-fgSoft">
              Seedance AI · {s.modelIsAuto ? `Auto → ${selectedModel.label}` : selectedModel.label}
            </span>{" "}
            — {s.modelIsAuto ? s.modelChoice.reason : selectedModel.blurb}{" "}
            <span>· XDC ${s.xdcUsd.toFixed(5)} {s.xdcLive ? "(live)" : "(est.)"}</span>
          </p>
        ) : (
          <p className="mt-3 text-xs text-fgMuted">
            <span className="font-semibold text-fgSoft">{ENGINE_INFO.local.name}</span> — {ENGINE_INFO.local.blurb}
          </p>
        )}
      </div>

      {s.phase === "composing" ? (
        <RenderingCard
          progress={s.progress}
          watchImage={watch.image}
          premium
          etaText="Composing your scene frame — placing the exact watch in the scene before it moves"
        />
      ) : null}

      {/* Stage 1 result: preview the composed frame, regenerate it, or animate it into video */}
      {s.phase === "frame" ? (
        <div className="fade-up mt-8 grid gap-6 rounded-2xl border border-line2 bg-bg2 p-4 sm:grid-cols-2">
          <div className="relative overflow-hidden rounded-xl border border-line bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.composedFrame ?? watch.image} alt="Composed scene frame" className="aspect-[3/4] w-full object-cover" />
            <span className="absolute bottom-2 left-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white/85 backdrop-blur">
              Scene frame · {s.composeMode === "live" ? "AI-composed" : "reference plate"}
            </span>
          </div>
          <div className="flex flex-col">
            <div className="eyebrow text-fgMuted">Stage 1 of 2 · compose</div>
            <h3 className="mt-1 text-lg font-bold text-fg">Your scene frame is ready</h3>
            <p className="mt-2 text-sm leading-relaxed text-fgMuted">
              This exact frame is what the video will animate — the watch stays pixel-perfect because the
              motion starts from here. Happy with it? Animate it. Want a different composition? Regenerate.
            </p>
            <div className="mt-auto flex flex-wrap gap-2 pt-4">
              <Button onClick={s.animate} className="gap-1.5">
                Animate → video · ◆ {s.totalCost}{s.takes > 1 ? ` · ${s.takes} takes` : ""}
              </Button>
              <Button variant="secondary" size="md" onClick={s.regenerateFrame}>Regenerate frame</Button>
              <Button variant="secondary" size="md" onClick={s.createAnother}>Back</Button>
            </div>
          </div>
        </div>
      ) : null}

      {s.phase === "rendering" ? (
        <RenderingCard
          progress={s.progress}
          watchImage={s.composedFrame ?? watch.image}
          premium={output.engine === "premium"}
          etaText={output.engine === "premium"
            ? `Estimated ~${Math.max(1, Math.round(etaSeconds(selectedModel, output.duration) / 60))} min · ${selectedModel.label} — Seedance renders take a few minutes`
            : "Instant demo render"}
        />
      ) : null}

      {s.phase === "ready" ? (
        <div className="fade-up mt-8 grid items-start gap-6 rounded-2xl border border-line bg-bg p-5 sm:grid-cols-[180px_1fr]">
          <div
            className="relative aspect-[3/4] overflow-hidden rounded-xl border border-line bg-black"
            style={team.id !== "none" ? { boxShadow: `0 0 0 2px ${team.colors[0]}, 0 0 26px -6px ${team.colors[2]}` } : undefined}
          >
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video src={s.liveVideoUrl ?? resultVideoFor(chosen.preset_id)} poster={s.liveVideoUrl ? undefined : resultPosterFor(chosen.preset_id)} autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover" />
            {team.id !== "none" ? (
              <span className="absolute right-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur">{team.flag} {team.name}</span>
            ) : null}
            <span className="absolute bottom-2 left-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-semibold text-white/85 backdrop-blur">{s.liveVideoUrl ? "Your video" : "Preview"}</span>
            {s.takeOptions.length > 1 ? (
              <div className="absolute right-2 top-2 flex gap-1.5" role="group" aria-label="Pick your take">
                {s.takeOptions.map((t, i) => (
                  <button
                    key={t.url}
                    type="button"
                    onClick={() => s.chooseTake(i)}
                    aria-pressed={s.liveVideoUrl === t.url}
                    className={[
                      "rounded-full px-2.5 py-1 text-[10px] font-bold backdrop-blur transition-colors",
                      s.liveVideoUrl === t.url ? "bg-white text-black" : "bg-black/50 text-white/85 hover:bg-black/70",
                    ].join(" ")}
                  >
                    Take {i + 1}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div>
            <div className="text-lg font-bold text-fg">
              {s.takeOptions.length > 1 ? "Pick your best take" : "Your video is ready to preview"}
            </div>
            <dl className="mt-3 divide-y divide-line border-y border-line">
              {[
                ["Watch", watch.title],
                ["Creator", persona.display_name],
                ["Style", preset.title],
                ["Scene", background.title],
                ...(team.id !== "none" ? [["Team", `${team.flag} ${team.name}`]] : []),
                ...(hook.hook_id !== "none" ? [["Hook", hook.title]] : []),
                ...(music.music_id !== "none" ? [["Music", music.title]] : []),
                ["Format", `${output.format} · ${output.resolution} · ${fmtDur(output.duration)}`],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between py-2 text-sm">
                  <dt className="text-fgMuted">{k}</dt>
                  <dd className="font-medium text-fg">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-xs text-fgMuted">
              {s.liveVideoUrl
                ? "Your video is ready — download it or submit the post link to enter the competition."
                : "Demo preview — the full video renders once live generation is switched on."}
            </p>

            {(() => {
              const cap = captionFor(s.capPlatform, { watch, persona, preset });
              const capText = s.aiCaption ?? cap.full;
              const mintLink = s.ambassadorCode ? buildMintLink(s.ambassadorCode) : "";
              const full = mintLink ? `${capText}\n\n🔗 Mint yours: ${mintLink}` : capText;
              return (
                <div className="mt-5 rounded-xl border border-line bg-bg2 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="eyebrow text-fgMuted">
                      {s.aiCaption ? "AI caption" : "Caption"}{mintLink ? " + your mint link" : ""}
                    </span>
                    <span className="inline-flex rounded-full border border-line2 bg-bg p-0.5">
                      {CAPTION_PLATFORMS.map((p) => (
                        <button
                          key={p}
                          onClick={() => s.setCapPlatform(p)}
                          className={["rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors", s.capPlatform === p ? "bg-fg text-bg" : "text-fgMuted hover:text-fg"].join(" ")}
                        >
                          {p}
                        </button>
                      ))}
                    </span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-fg">{full}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Button variant="secondary" size="md" onClick={() => s.copyCaption(full)} className="gap-1.5">
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 012-2h10" />
                      </svg>
                      {s.copied ? "Copied" : "Copy"}
                    </Button>
                    <Button variant="secondary" size="md" onClick={s.generateAiCaption} disabled={s.aiCaptionBusy} className="gap-1.5">
                      {s.aiCaptionBusy ? "Writing…" : "✨ AI rewrite"}
                    </Button>
                    <span className="text-[11px] text-fgMuted">{s.capPlatform === "X" ? "No hashtags on X" : `${cap.hashtags.length} hashtags`}</span>
                  </div>
                </div>
              );
            })()}

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-2 text-sm font-semibold text-fg">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-fg text-bg">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>
                </span>
                {s.paid ? "Paid in XDC · generated & saved to your videos" : "Generated & saved · local render (free)"}
              </span>
              {s.liveVideoUrl ? (
                <a href={s.liveVideoUrl} download target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-fg px-4 py-2 text-sm font-semibold text-bg transition-opacity hover:opacity-90">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" /></svg>
                  Download
                </a>
              ) : null}
              {s.creations[0] ? (
                <Button variant="secondary" size="md" onClick={() => s.openSubmit(s.creations[0])}>Submit post</Button>
              ) : null}
              <Button variant="secondary" size="md" onClick={s.createAnother}>Create another</Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Galleries */}
      <GalleryModal open={s.gallery === "watch"} title="Select a watch" items={ASSETS} selectedId={chosen.asset_id} getId={(a) => a.asset_id} getSearchText={(a) => `${a.title} ${a.collection}`} columns="grid-cols-2 sm:grid-cols-3" renderTile={(a, sel, onSel) => <WatchTile asset={a} selected={sel} onSelect={onSel} />} onSelect={(id) => s.rechoose({ asset_id: id })} onClose={() => s.setGallery(null)} />
      <GalleryModal open={s.gallery === "creator"} title="Select a creator" items={PERSONAS} selectedId={chosen.persona_id} getId={(p) => p.model_id} getSearchText={(p) => `${p.display_name} ${p.persona} ${p.tone}`} columns="grid-cols-2 sm:grid-cols-3" renderTile={(p, sel, onSel) => <CreatorTile persona={p} selected={sel} onSelect={onSel} />} onSelect={(id) => s.rechoose({ persona_id: id })} onClose={() => s.setGallery(null)} />
      <GalleryModal open={s.gallery === "style"} title="Select a style" items={PRESETS} selectedId={chosen.preset_id} getId={(p) => p.preset_id} getSearchText={(p) => `${p.title} ${p.concept_type} ${p.hook_template}`} categories={["Showcase", "Explainer"]} getCategory={(p) => STYLE_CATEGORY[p.concept_type] ?? "Showcase"} columns="grid-cols-2 sm:grid-cols-3 md:grid-cols-4" renderTile={(p, sel, onSel) => <StyleTile preset={p} selected={sel} onSelect={onSel} />} onSelect={(id) => s.rechoose({ preset_id: id })} onClose={() => s.setGallery(null)} />
      <GalleryModal open={s.gallery === "scene"} title="Select a scene" items={BACKGROUNDS} selectedId={chosen.background_id} getId={(b) => b.background_id} getSearchText={(b) => `${b.title} ${b.visual_prompt}`} columns="grid-cols-2 sm:grid-cols-3" renderTile={(b, sel, onSel) => <SceneTile background={b} selected={sel} onSelect={onSel} />} onSelect={(id) => s.rechoose({ background_id: id })} onClose={() => s.setGallery(null)} />
      <GalleryModal open={s.gallery === "hook"} title="Select a hook (optional)" items={HOOKS} selectedId={chosen.hook_id} getId={(h) => h.hook_id} getSearchText={(h) => `${h.title} ${h.description}`} columns="grid-cols-2 sm:grid-cols-3" renderTile={(h, sel, onSel) => <HookTile hook={h} selected={sel} onSelect={onSel} />} onSelect={(id) => s.rechoose({ hook_id: id })} onClose={() => s.setGallery(null)} />
      <GalleryModal open={s.gallery === "music"} title="Select music (optional)" items={MUSIC} selectedId={chosen.music_id} getId={(m) => m.music_id} getSearchText={(m) => `${m.title} ${m.mood}`} columns="grid-cols-2 sm:grid-cols-3" renderTile={(m, sel, onSel) => <MusicTile track={m} selected={sel} onSelect={onSel} />} onSelect={(id) => s.rechoose({ music_id: id })} onClose={() => s.setGallery(null)} />

      {/* Pre-generation recap modal */}
      {s.recapOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => s.setRecapOpen(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="recap-title" className="w-full max-w-md rounded-2xl border border-line2 bg-bg p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div id="recap-title" className="text-lg font-bold text-fg">Review before generating</div>
            <p className="mt-1 text-xs text-fgMuted">Quick check — this is what we&apos;ll create.</p>
            <dl className="mt-4 divide-y divide-line border-y border-line">
              {([
                ["Watch", watch.title],
                ["Creator", persona.display_name],
                ["Style", preset.title],
                ["Scene", background.title],
                ...(team.id !== "none" ? [["Team", `${team.flag} ${team.name}`]] : []),
                ...(hook.hook_id !== "none" ? [["Hook", hook.title]] : []),
                ["Music", music.title],
                ["Engine", output.engine === "premium" ? `Seedance AI · ${selectedModel.label}` : "Instant demo"],
                ["Render", renderModeFor(preset) === "avatar" ? `${persona.display_name} avatar (Marketing Studio)` : "Product · exact watch (image-to-video)"],
                ["Format", `${output.format} · ${output.resolution}`],
                ["Length", fmtDur(output.duration)],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between py-2 text-sm">
                  <dt className="text-fgMuted">{k}</dt>
                  <dd className="font-medium text-fg">{v}</dd>
                </div>
              ))}
            </dl>
            {output.engine === "premium" ? (
              <div className="mt-3 rounded-xl border border-line bg-bg2 p-3 text-sm">
                <div className="flex items-center justify-between py-1">
                  <span className="text-fgMuted">Generation <span className="opacity-70">(2× provider cost)</span></span>
                  <span className="font-medium text-fg">◆ {price.genXdc} XDC</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-fgMuted">Network gas</span>
                  <span className="font-medium text-fg">◆ {price.gasXdc} XDC</span>
                </div>
                <div className="mt-1 flex items-center justify-between border-t border-line pt-2">
                  <span className="font-semibold text-fg">Total</span>
                  <span className="font-bold text-fg">◆ {price.totalXdc} XDC</span>
                </div>
                <div className="mt-1 text-right text-[11px] text-fgMuted">≈ ${price.totalUsd.toFixed(2)} · XDC ${s.xdcUsd.toFixed(5)} {s.xdcLive ? "(live)" : "(est.)"}</div>
              </div>
            ) : (
              <div className="mt-3 flex items-center justify-between rounded-xl border border-line bg-bg2 p-3 text-sm">
                <span className="text-fgMuted">Cost</span>
                <span className="font-semibold text-fg">Free · local render</span>
              </div>
            )}
            <div className="mt-5 flex items-center gap-3">
              <Button onClick={() => { s.setRecapOpen(false); s.startGeneration(); }} className="flex-1">
                {output.engine === "local" ? "Generate · free" : `Pay & generate · ◆ ${cost}`}
              </Button>
              <Button variant="secondary" size="md" onClick={() => s.setRecapOpen(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
