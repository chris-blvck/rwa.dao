import type { Metadata } from "next";
import { LeaderboardScreen } from "@/components/rwa/screens/LeaderboardScreen";

export const metadata: Metadata = {
  title: "Leaderboard · RWA-DAO Creator Studio",
  description: "Top posts each period earn token rewards — climb the creator leaderboard.",
};

export default function LeaderboardPage() {
  return <LeaderboardScreen />;
}
