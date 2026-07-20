import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from "@/components/rwa/og-card";

export const runtime = "edge";
export const alt = "RWA-DAO Creator Studio — luxury watches, on-chain";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return ogCard({
    eyebrow: "Creator Studio",
    title: "Make content about RWA-DAO luxury watches",
    subtitle: "Pick a watch, a creator and a style — generate, post, and earn as the mints you drive convert on-chain.",
  });
}
