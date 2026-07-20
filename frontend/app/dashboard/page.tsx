import type { Metadata } from "next";
import { DashboardScreen } from "@/components/rwa/screens/DashboardScreen";

export const metadata: Metadata = {
  title: "Dashboard · RWA-DAO Creator Studio",
  description: "Your videos, your ambassador link and your AI auto-pilot — all in one place.",
};

export default function DashboardPage() {
  return <DashboardScreen />;
}
