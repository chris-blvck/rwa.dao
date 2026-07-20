import type { Metadata } from "next";
import { MintScreen } from "@/components/rwa/screens/MintScreen";

export const metadata: Metadata = {
  title: "Mint · RWA-DAO Creator Studio",
  description: "Own a fraction of a real vaulted watch — live on XDC Apothem. Collect 1,000 RWAXDC fractions to redeem the physical timepiece.",
};

export default function MintPage() {
  return <MintScreen />;
}
