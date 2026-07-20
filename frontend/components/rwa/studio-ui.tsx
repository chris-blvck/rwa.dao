"use client";

import Image from "next/image";
import { useState } from "react";
import { compact, mockMetrics } from "@/lib/rwa/leaderboard";
import { creationFilename, creationPostText } from "@/lib/rwa/library_actions";
import type { Creation } from "@/lib/rwa/storage";

// Formats a length in seconds as a "0:SS" timecode (4–15s → 0:04–0:15).
export function fmtDur(s: number): string {
  return `0:${String(Math.max(0, Math.round(s))).padStart(2, "0")}`;
}

// Plain-language model descriptions for the engine toggle (the app targets AI newcomers).
export const ENGINE_INFO: Record<"premium" | "local", { name: string; blurb: string }> = {
  premium: { name: "Seedance AI", blurb: "Cinematic AI video — pay in token." },
  local: { name: "Instant demo", blurb: "Free preview render — no AI, no token. Great for trying things out." },
};

export function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-line2 bg-bg px-3 py-1 text-xs font-medium text-fgSoft">
      {children}
    </span>
  );
}

export function Seg({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="eyebrow text-fgMuted">{label}</span>
      <span className="inline-flex rounded-full border border-line2 bg-bg p-0.5" role="group" aria-label={label}>
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            aria-pressed={value === o}
            className={[
              "rounded-full px-2.5 py-1 text-xs font-semibold transition-colors",
              value === o ? "bg-fg text-bg" : "text-fgMuted hover:text-fg",
            ].join(" ")}
          >
            {o}
          </button>
        ))}
      </span>
    </span>
  );
}

export function RenderingCard({ progress, watchImage, etaText, premium }: { progress: number; watchImage: string; etaText: string; premium: boolean }) {
  const status =
    progress < 30 ? "Composing the scene…" : progress < 65 ? "Rendering frames…" : progress < 92 ? "Adding finishing touches…" : "Finalizing…";
  return (
    <div className="fade-up mt-8 flex items-center gap-5 rounded-2xl border border-line bg-bg p-5">
      <div className="relative h-24 w-[72px] shrink-0 overflow-hidden rounded-xl border border-line bg-black">
        <Image src={watchImage} alt="" fill sizes="72px" className="object-cover opacity-80" />
        <div className="absolute inset-0 animate-pulse bg-gradient-to-t from-black/40 to-transparent" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-fg">{status}</div>
        <div className="mt-1 text-xs text-fgMuted">{etaText}</div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-bg3">
          <div className="h-full rounded-full bg-fg transition-[width] duration-200 ease-out" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-2 text-xs text-fgMuted">
          {progress}%{premium ? " · you can keep this tab open — we'll save it to your library when it's done" : " · demo render"}
        </div>
      </div>
    </div>
  );
}

export function CreationCard({
  creation,
  onRemove,
  onSubmit,
  mintLink,
}: {
  creation: Creation;
  onRemove: () => void;
  onSubmit: () => void;
  /** The creator's mint link — appended to the copied caption so posts drive attributed mints. */
  mintLink?: string;
}) {
  const date = new Date(creation.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const copyCaption = async () => {
    try {
      await navigator.clipboard.writeText(creationPostText(creation, mintLink));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — no-op; the button just won't confirm */
    }
  };

  const download = async () => {
    if (!creation.videoUrl || downloading) return;
    setDownloading(true);
    try {
      // Fetch → blob → object URL so the browser honours the download filename (the `download`
      // attribute is ignored for cross-origin hrefs).
      const res = await fetch(creation.videoUrl);
      if (!res.ok) throw new Error(String(res.status));
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = creationFilename(creation);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch {
      // Cross-origin without CORS (or offline): open it so the user can still save manually.
      window.open(creation.videoUrl, "_blank", "noopener");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-line bg-bg">
      <div className="relative aspect-[3/4] overflow-hidden bg-black">
        {creation.videoUrl ? (
          // Real generated video → playable in the library.
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video src={creation.videoUrl} poster={creation.watchImage} controls loop playsInline preload="metadata" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={creation.watchImage} alt={creation.watchTitle} className="absolute inset-0 h-full w-full object-cover opacity-90" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-black">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M8 5v14l11-7L8 5z" /></svg>
              </span>
            </div>
          </>
        )}
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${creation.styleTitle} for ${creation.watchTitle}`}
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        <span className="absolute bottom-2 left-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-semibold text-white/85 backdrop-blur">{date}</span>
      </div>
      <div className="px-3 py-2.5">
        <div className="truncate text-sm font-semibold text-fg">{creation.styleTitle}</div>
        <div className="truncate text-xs text-fgMuted">{creation.creatorName} · {creation.watchTitle}</div>

        {/* Video actions — copy a ready-to-post caption (with the creator's mint link), and download
            the render with a proper filename when it's a real generated video. */}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={copyCaption}
            aria-label={`Copy a caption for ${creation.styleTitle}${mintLink ? " with your mint link" : ""}`}
            className="inline-flex items-center gap-1 rounded-full border border-line2 px-2.5 py-1 text-[11px] font-semibold text-fg transition-colors hover:border-fg hover:bg-bg2"
          >
            {copied ? "Caption copied ✓" : mintLink ? "Copy caption + link" : "Copy caption"}
          </button>
          {creation.videoUrl ? (
            <button
              type="button"
              onClick={download}
              disabled={downloading}
              aria-label={`Download the video for ${creation.styleTitle}`}
              className="inline-flex items-center gap-1 rounded-full border border-line2 px-2.5 py-1 text-[11px] font-semibold text-fg transition-colors hover:border-fg hover:bg-bg2 disabled:opacity-60"
            >
              {downloading ? "Downloading…" : "⭳ Download"}
            </button>
          ) : null}
        </div>

        {creation.postUrl ? (
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <a
              href={creation.postUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={`Open ${creation.postPlatform} post for ${creation.styleTitle} in a new tab`}
              className="inline-flex items-center gap-1 rounded-full border border-line2 px-2.5 py-0.5 text-[11px] font-semibold text-fg hover:bg-bg2"
            >
              <span className="text-fgMuted" aria-hidden="true">●</span> {creation.postPlatform} ↗
            </a>
            {(() => {
              const m = mockMetrics(creation.id);
              return (
                <span className="text-[11px] tabular-nums text-fgMuted">{compact(m.views)} views · {compact(m.likes)} likes</span>
              );
            })()}
          </div>
        ) : (
          <button
            type="button"
            onClick={onSubmit}
            aria-label={`Submit post link for ${creation.styleTitle}`}
            className="mt-2 inline-flex items-center gap-1 rounded-full border border-line2 px-2.5 py-1 text-[11px] font-semibold text-fg transition-colors hover:border-fg hover:bg-bg2"
          >
            Submit post
          </button>
        )}
      </div>
    </div>
  );
}
