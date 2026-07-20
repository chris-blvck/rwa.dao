import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from "@/components/rwa/og-card";

export const runtime = "edge";
export const alt = "RWA-DAO Mint — own a fraction of a vaulted luxury watch";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return ogCard({
    eyebrow: "Mint",
    title: "Own a fraction of a vaulted luxury watch",
    subtitle: "Real, vaulted timepieces — minted on XDC. Collect fractions, redeem the physical watch.",
  });
}
