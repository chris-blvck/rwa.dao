"use client";

import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";
type Size = "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-fg text-bg hover:opacity-90 border border-fg",
  secondary: "bg-bg text-fg hover:bg-bg2 border border-line2",
  ghost: "bg-transparent text-fg hover:bg-bg2 border border-transparent",
};

const SIZES: Record<Size, string> = {
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

export function Button({
  variant = "primary",
  size = "lg",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      {...props}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-30",
        VARIANTS[variant],
        SIZES[size],
        className,
      ].join(" ")}
    />
  );
}
