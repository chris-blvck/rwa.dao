import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from "@/components/rwa/og-card";

export const runtime = "edge";
export const alt = "RWA-DAO MemoryAgent — judge tour (Qwen Cloud Hackathon)";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return ogCard({
    eyebrow: "Qwen Cloud Hackathon",
    title: "Watch the agent learn from real revenue",
    subtitle: "MemoryAgent track — memory reinforced by on-chain mints, reasoning on Qwen. A hands-on judge tour.",
  });
}
