import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from "@/components/rwa/og-card";

export const runtime = "edge";
export const alt = "RWA-DAO Leaderboard — the creators driving the most mints";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return ogCard({
    eyebrow: "Leaderboard",
    title: "The creators driving the most mints",
    subtitle: "Post, drive on-chain conversions, climb the ranks — the marketing army, ranked by real revenue.",
  });
}
