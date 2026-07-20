"use client";

import type { ReactNode } from "react";

// A studio "slot": shows the current pick (thumb + name) and opens its gallery on click.
// `comingSoon` greys it out and shows a "Coming soon" pill; `disabled` makes it non-interactive;
// `actionLabel` overrides the default "Change" pill (e.g. "Toggle" for the music switch).
export function Slot({
  label,
  name,
  thumb,
  onClick,
  tag,
  comingSoon,
  disabled,
  actionLabel,
}: {
  label: string;
  name: string;
  thumb: ReactNode;
  onClick: () => void;
  tag?: string;
  comingSoon?: boolean;
  disabled?: boolean;
  actionLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-disabled={disabled || undefined}
      className={[
        "group flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors",
        disabled ? "cursor-not-allowed border-line bg-bg opacity-60" : "border-line bg-bg hover:border-line2 hover:bg-bg2",
      ].join(" ")}
    >
      <span className={["relative shrink-0", comingSoon ? "opacity-70" : ""].join(" ")}>
        {thumb}
        {tag ? (
          <span className="absolute -right-1.5 -top-1.5 rounded-full border border-amber-300/50 bg-amber-300/20 px-1.5 py-px text-[8px] font-bold uppercase tracking-wide text-amber-200 backdrop-blur">
            {tag}
          </span>
        ) : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="eyebrow block truncate text-fgMuted">{label}</span>
        <span className="mt-0.5 block truncate text-sm font-semibold text-fg">{name}</span>
      </span>
      <span
        className={[
          "shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
          comingSoon ? "border-line2 text-fgMuted" : "border-line2 text-fgSoft group-hover:border-fg group-hover:text-fg",
        ].join(" ")}
      >
        {actionLabel ?? (comingSoon ? "Coming soon" : "Change")}
      </span>
    </button>
  );
}
