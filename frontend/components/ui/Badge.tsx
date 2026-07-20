import type { ReactNode } from "react";

type Tone = "solid" | "outline" | "muted";

const TONES: Record<Tone, string> = {
  solid: "bg-fg text-bg border-fg",
  outline: "bg-transparent text-fg border-line2",
  muted: "bg-bg3 text-fgSoft border-transparent",
};

export function Badge({ tone = "outline", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
        TONES[tone],
      ].join(" ")}
    >
      {children}
    </span>
  );
}
