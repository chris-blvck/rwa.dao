import type { Metadata } from "next";
import { HackathonScreen } from "@/components/rwa/screens/HackathonScreen";

export const metadata: Metadata = {
  title: "Judge tour · RWA-DAO MemoryAgent",
  description:
    "Hands-on tour for Qwen Cloud Hackathon judges: watch the MemoryAgent learn from on-chain revenue, live in your browser — the real functions, no keys, no cost.",
};

export default function HackathonPage() {
  return <HackathonScreen />;
}
