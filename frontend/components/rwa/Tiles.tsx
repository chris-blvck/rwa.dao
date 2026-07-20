"use client";

import Image from "next/image";
import { type ReactNode, useState } from "react";
import { previewPosterFor, previewVideoFor, type Background, type Hook, type MusicTrack, type Persona, type Preset, type WatchAsset } from "@/lib/rwa/catalog";
import { ConceptIcon } from "./ConceptIcon";

function initials(name: string): string {
  const w = name.replace(/\(.*?\)/g, "").trim().split(/\s+/);
  return ((w[0]?.[0] ?? "") + (w[1]?.[0] ?? "")).toUpperCase();
}

// Selectable gallery tile shell — full-bleed visual with a name overlay (Higgsfield style).
function Tile({
  selected,
  onClick,
  name,
  sub,
  badge,
  comingSoon,
  children,
  onMouseEnter,
  onMouseLeave,
}: {
  selected: boolean;
  onClick: () => void;
  name: string;
  sub?: string;
  badge?: string;
  comingSoon?: boolean; // no real reference asset yet → show a "Coming soon" treatment
  children: ReactNode;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      aria-pressed={selected}
      className={[
        "group relative aspect-[3/4] w-full overflow-hidden rounded-2xl border text-left transition-all",
        selected ? "border-fg ring-2 ring-fg" : "border-line hover:border-line2",
      ].join(" ")}
    >
      <div className="absolute inset-0 bg-tile">{children}</div>

      {/* Coming-soon overlay — for slots that don't have a real reference asset yet. */}
      {comingSoon ? <div className="absolute inset-0 bg-black/45" /> : null}

      {/* bottom gradient + name */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent p-3">
        <div className="text-sm font-semibold leading-tight text-white">{name}</div>
        {sub ? <div className="mt-0.5 line-clamp-1 text-[11px] text-white/70">{sub}</div> : null}
      </div>

      {comingSoon ? (
        <span className="absolute left-2 top-2 rounded-full border border-amber-300/40 bg-amber-300/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-100 backdrop-blur">
          Coming soon
        </span>
      ) : badge ? (
        <span className="absolute left-2 top-2 rounded-full border border-white/25 bg-black/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/85 backdrop-blur">
          {badge}
        </span>
      ) : null}

      {selected ? (
        <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white text-black">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12l5 5 9-10" />
          </svg>
        </span>
      ) : null}
    </button>
  );
}

export function WatchTile({ asset, selected, onSelect }: { asset: WatchAsset; selected: boolean; onSelect: () => void }) {
  return (
    <Tile selected={selected} onClick={onSelect} name={asset.title} sub={asset.collection.replace(/_/g, " ")}>
      <Image
        src={asset.image}
        alt={asset.title}
        fill
        sizes="(max-width: 640px) 50vw, 220px"
        className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
      />
    </Tile>
  );
}

export function CreatorTile({ persona, selected, onSelect }: { persona: Persona; selected: boolean; onSelect: () => void }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <Tile selected={selected} onClick={onSelect} name={persona.display_name} sub={persona.persona}>
      {/* Monogram base — always present; the photo fades in over it only once it loads. */}
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-white/10 to-transparent">
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10 text-2xl font-bold text-white ring-1 ring-white/20">
          {initials(persona.display_name)}
        </span>
      </div>
      {persona.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={persona.image}
          alt={persona.display_name}
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(false)}
          className={[
            "absolute inset-0 h-full w-full object-cover object-top transition-all duration-300 group-hover:scale-[1.04]",
            loaded ? "opacity-100" : "opacity-0",
          ].join(" ")}
        />
      ) : null}
    </Tile>
  );
}

export function StyleTile({ preset, selected, onSelect }: { preset: Preset; selected: boolean; onSelect: () => void }) {
  const src = previewVideoFor(preset.preset_id);
  const poster = previewPosterFor(preset.preset_id);
  return (
    <Tile selected={selected} onClick={onSelect} name={preset.title} sub={preset.hook_template} badge="9:16 · 0:15">
      <div className="tile-grain absolute inset-0 opacity-60" />
      <div className="absolute inset-0 flex items-center justify-center text-white">
        <ConceptIcon type={preset.concept_type} className="h-12 w-12 opacity-90 transition-transform duration-300 group-hover:scale-110" />
      </div>
      {/* Real example clip (autoplaying muted) only when a clip genuinely matches this style;
          otherwise the concept icon above stands in — no reused or mismatched footage.
          The poster is a real still frame, so a frame shows even before/without playback. */}
      {src ? (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video
          src={src}
          poster={poster ?? undefined}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
        />
      ) : null}
    </Tile>
  );
}

const SCENE_BG: Record<string, string> = {
  luxury_showroom: "from-zinc-700 via-zinc-800 to-black",
  penthouse: "from-slate-700 via-slate-900 to-black",
  marble_lounge: "from-neutral-500 via-neutral-700 to-neutral-950",
  office: "from-stone-700 via-stone-800 to-black",
  street: "from-amber-700/40 via-zinc-800 to-neutral-950",
  riviera: "from-sky-700/40 via-zinc-800 to-black",
};

function SceneIcon({ id, className = "h-10 w-10" }: { id: string; className?: string }) {
  const c = { className, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (id === "penthouse")
    return (<svg {...c}><path d="M3 21h18M5 21V8l7-4 7 4v13M9 21v-5h6v5M9 11h.01M15 11h.01" /></svg>);
  if (id === "marble_lounge")
    return (<svg {...c}><path d="M3 21h18M4 21v-9h16v9M4 12l2-5h12l2 5M9 21v-5h6v5" /></svg>);
  if (id === "office")
    return (<svg {...c}><rect x="3" y="11" width="18" height="9" rx="1" /><path d="M7 11V7a2 2 0 012-2h6a2 2 0 012 2v4M8 16h.01M16 16h.01" /></svg>);
  if (id === "street")
    return (<svg {...c}><path d="M4 21l3-16M20 21l-3-16M9 21l1-16M15 21l-1-16M2 21h20" /></svg>);
  if (id === "riviera")
    return (<svg {...c}><path d="M2 18h20M3 18c2-3 4-3 6 0M11 18c2-3 4-3 6 0M17 8a3 3 0 11-6 0 3 3 0 016 0z" /></svg>);
  // showroom (default)
  return (<svg {...c}><path d="M3 9l2-5h14l2 5M4 9h16v10a1 1 0 01-1 1H5a1 1 0 01-1-1V9zM9 13h6" /></svg>);
}

function HookIcon({ id, className = "h-10 w-10" }: { id: string; className?: string }) {
  const c = { className, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (id === "none") return (<svg {...c}><circle cx="12" cy="12" r="9" /><path d="M8 12h8" /></svg>);
  // generic "spark/hook" mark
  return (<svg {...c}><path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" /></svg>);
}

export function HookTile({ hook, selected, onSelect }: { hook: Hook; selected: boolean; onSelect: () => void }) {
  // "No hook" is a real functional choice; every other hook has no preview reference yet.
  const comingSoon = hook.hook_id !== "none";
  return (
    <Tile selected={selected} onClick={onSelect} name={hook.title} sub={hook.description} comingSoon={comingSoon}>
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-700 via-zinc-800 to-black" />
      <div className="tile-grain absolute inset-0 opacity-40" />
      <div className="absolute inset-0 flex items-center justify-center text-white/90">
        <HookIcon id={hook.hook_id} className="h-12 w-12 transition-transform duration-300 group-hover:scale-110" />
      </div>
    </Tile>
  );
}

export function HookThumb({ hook }: { hook: Hook }) {
  return (
    <span className="relative flex h-14 w-11 items-center justify-center overflow-hidden rounded-md bg-gradient-to-br from-zinc-700 to-black text-white">
      <HookIcon id={hook.hook_id} className="relative h-6 w-6" />
    </span>
  );
}

function MusicIcon({ id, className = "h-10 w-10" }: { id: string; className?: string }) {
  const c = { className, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  // "No music" = a muted note (struck through).
  if (id === "none")
    return (<svg {...c}><path d="M9 17V5l10-2v12" /><circle cx="6.5" cy="17" r="2.5" /><circle cx="16.5" cy="15" r="2.5" /><path d="M3 3l18 18" /></svg>);
  return (<svg {...c}><path d="M9 17V5l10-2v12" /><circle cx="6.5" cy="17" r="2.5" /><circle cx="16.5" cy="15" r="2.5" /></svg>);
}

export function MusicTile({ track, selected, onSelect }: { track: MusicTrack; selected: boolean; onSelect: () => void }) {
  // "No music" is a real choice; every style preset has no licensed track yet → "coming soon".
  const comingSoon = track.music_id !== "none" && !track.preview;
  return (
    <Tile selected={selected} onClick={onSelect} name={track.title} sub={track.mood} comingSoon={comingSoon}>
      <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-800/40 via-zinc-800 to-black" />
      <div className="tile-grain absolute inset-0 opacity-40" />
      <div className="absolute inset-0 flex items-center justify-center text-white/90">
        <MusicIcon id={track.music_id} className="h-12 w-12 transition-transform duration-300 group-hover:scale-110" />
      </div>
    </Tile>
  );
}

export function MusicThumb({ track }: { track: MusicTrack }) {
  return (
    <span className="relative flex h-14 w-11 items-center justify-center overflow-hidden rounded-md bg-gradient-to-br from-fuchsia-800/50 to-black text-white">
      <MusicIcon id={track.music_id} className="relative h-6 w-6" />
    </span>
  );
}

export function SceneTile({ background, selected, onSelect }: { background: Background; selected: boolean; onSelect: () => void }) {
  const [loaded, setLoaded] = useState(false);
  const hasImage = !!background.image;
  return (
    <Tile selected={selected} onClick={onSelect} name={background.title} sub="Background scene" comingSoon={!hasImage || !loaded}>
      {/* Styled placeholder base — shown until/unless the real render loads over it. */}
      <div className={["absolute inset-0 bg-gradient-to-br", SCENE_BG[background.background_id] ?? "from-zinc-700 to-black"].join(" ")} />
      <div className="tile-grain absolute inset-0 opacity-40" />
      <div className="absolute inset-0 flex items-center justify-center text-white/90">
        <SceneIcon id={background.background_id} className="h-12 w-12 transition-transform duration-300 group-hover:scale-110" />
      </div>
      {hasImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={background.image}
          alt={background.title}
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(false)}
          className={["absolute inset-0 h-full w-full object-cover transition-all duration-300 group-hover:scale-[1.04]", loaded ? "opacity-100" : "opacity-0"].join(" ")}
        />
      ) : null}
    </Tile>
  );
}

/* ── Compact thumbnails for the studio slots ─────────────────────────────────── */

export function SceneThumb({ background }: { background: Background }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <span className={["relative flex h-14 w-11 items-center justify-center overflow-hidden rounded-md bg-gradient-to-br text-white", SCENE_BG[background.background_id] ?? "from-zinc-700 to-black"].join(" ")}>
      <SceneIcon id={background.background_id} className="relative h-6 w-6" />
      {background.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={background.image}
          alt=""
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(false)}
          className={["absolute inset-0 h-full w-full object-cover transition-opacity", loaded ? "opacity-100" : "opacity-0"].join(" ")}
        />
      ) : null}
    </span>
  );
}

export function WatchThumb({ asset }: { asset: WatchAsset }) {
  return (
    <span className="relative block h-14 w-11 overflow-hidden rounded-md bg-tile">
      <Image src={asset.image} alt="" fill sizes="44px" className="object-cover" />
    </span>
  );
}

export function CreatorThumb({ persona }: { persona: Persona }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="relative flex h-14 w-11 items-center justify-center overflow-hidden rounded-md bg-tile text-sm font-bold text-white">
      <span>{initials(persona.display_name)}</span>
      {persona.image && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={persona.image}
          alt=""
          loading="eager"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover object-top"
        />
      ) : null}
    </span>
  );
}

export function StyleThumb({ preset }: { preset: Preset }) {
  const src = previewVideoFor(preset.preset_id);
  const poster = previewPosterFor(preset.preset_id);
  return (
    <span className="relative flex h-14 w-11 items-center justify-center overflow-hidden rounded-md bg-tile text-white">
      <span className="tile-grain absolute inset-0 opacity-60" />
      <ConceptIcon type={preset.concept_type} className="relative h-6 w-6 opacity-90" />
      {/* Real example clip as a live thumbnail (only when one matches); else the concept icon stands in. */}
      {src ? (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video src={src} poster={poster ?? undefined} autoPlay muted loop playsInline preload="auto" className="absolute inset-0 h-full w-full object-cover" />
      ) : null}
    </span>
  );
}
