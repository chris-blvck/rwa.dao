import type { Config } from "tailwindcss";

// RWA-DAO Creator Portal — monochrome, editorial, premium. Light + dark themes via
// CSS variables (toggled by the `.dark` class on <html>). Black & white only, large type.
const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Theme-aware (flip between light/dark via vars)
        bg: "rgb(var(--bg) / <alpha-value>)", // page background
        bg2: "rgb(var(--bg2) / <alpha-value>)", // panels
        bg3: "rgb(var(--bg3) / <alpha-value>)", // chips / hover
        fg: "rgb(var(--fg) / <alpha-value>)", // primary text + primary button
        fgSoft: "rgb(var(--fgSoft) / <alpha-value>)", // strong muted text
        fgMuted: "rgb(var(--fgMuted) / <alpha-value>)", // muted text
        line: "rgb(var(--line) / <alpha-value>)", // hairline borders
        line2: "rgb(var(--line2) / <alpha-value>)", // stronger borders
        tile: "rgb(var(--tile) / <alpha-value>)", // dark video preview tiles (elevated in dark)
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
      letterSpacing: {
        tightest: "-0.04em",
      },
    },
  },
  plugins: [],
};

export default config;
