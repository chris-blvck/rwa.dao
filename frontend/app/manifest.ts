import type { MetadataRoute } from "next";

// Web app manifest — makes the Creator Studio installable (PWA) with an on-brand icon set.
// Next serves this at /manifest.webmanifest and auto-links it from the document head.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RWA-DAO Creator Studio",
    short_name: "RWA-DAO",
    description:
      "Make cinematic content about RWA-DAO luxury watches: pick a watch, a creator and a style, generate, and earn as the mints you drive convert on-chain.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0a12",
    theme_color: "#0a0a12",
    categories: ["finance", "productivity", "entertainment"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
