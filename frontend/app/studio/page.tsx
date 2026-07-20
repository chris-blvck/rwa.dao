import type { Metadata } from "next";
import { StudioScreen } from "@/components/rwa/screens/StudioScreen";

export const metadata: Metadata = {
  title: "Studio · RWA-DAO Creator Studio",
  description: "Compose your luxury-watch video — pick a watch, creator, style and scene, then generate.",
};

export default function StudioPage() {
  return <StudioScreen />;
}
