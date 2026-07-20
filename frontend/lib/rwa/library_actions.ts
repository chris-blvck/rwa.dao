// Library-card actions for saved creations: a stable download filename and a ready-to-post caption.
// Pure + framework-free so they're unit-tested and reused by the card UI (studio-ui.tsx).

import type { Creation } from "./storage";

// Slugify for filenames — lowercase, non-alphanumerics collapse to single dashes, trimmed.
function slug(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "video"
  );
}

/** Download filename for a saved creation: `rwa-dao-<style>-<watch>.mp4`. */
export function creationFilename(c: Pick<Creation, "styleTitle" | "watchTitle">): string {
  return `rwa-dao-${slug(c.styleTitle)}-${slug(c.watchTitle)}.mp4`;
}

// Core brand hashtags (no leading "#"; added at render). Mirrors captions.ts CORE.
const LIBRARY_TAGS = ["RWADAO", "RWA", "Web3", "LuxuryWatch", "XDC"];

/**
 * A ready-to-post caption for a saved creation — on-brand, non-financial — with the creator's mint
 * link appended when supplied, so a copied post actually drives attributed mints (the ?ref= loop).
 */
export function creationPostText(c: Pick<Creation, "styleTitle" | "watchTitle">, mintLink?: string): string {
  const tagline = `${c.styleTitle} — the ${c.watchTitle}. Real-world luxury, on-chain. Scan, verify, own the story.`;
  const tags = LIBRARY_TAGS.map((t) => `#${t}`).join(" ");
  const parts = [tagline, tags];
  if (mintLink) parts.push(mintLink);
  return parts.join("\n\n");
}
