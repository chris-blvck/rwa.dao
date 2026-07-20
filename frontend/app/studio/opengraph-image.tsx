import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from "@/components/rwa/og-card";

export const runtime = "edge";
export const alt = "RWA-DAO Studio — generate a cinematic watch video";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return ogCard({
    eyebrow: "Studio",
    title: "Generate an agency-grade watch video in minutes",
    subtitle: "Compose the scene, then animate it — cinematic shot grammar, no editing skills needed.",
  });
}
