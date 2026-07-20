// World Cup team customization — pick a national team and the watch is themed in its colours.
// For the demo this drives a colour treatment on the preview + feeds the team palette into the
// generation prompt (so the live Seedance render actually comes out in the team's colours).
// Pre-generated per-team watch renders can replace the `image` field later.

export type Team = {
  id: string;
  name: string;
  flag: string; // emoji flag
  colors: [string, string, string]; // primary, secondary, accent (hex)
  image?: string; // optional pre-generated team-coloured watch render (public/brand/teams/*)
};

export const TEAMS: Team[] = [
  { id: "none", name: "No team", flag: "🏆", colors: ["#9ca3af", "#4b5563", "#e5e7eb"] },
  { id: "france", name: "France", flag: "🇫🇷", colors: ["#0055A4", "#FFFFFF", "#EF4135"] },
  { id: "brazil", name: "Brazil", flag: "🇧🇷", colors: ["#009C3B", "#FFDF00", "#002776"] },
  { id: "argentina", name: "Argentina", flag: "🇦🇷", colors: ["#74ACDF", "#FFFFFF", "#F6B40E"] },
  { id: "england", name: "England", flag: "🏴", colors: ["#FFFFFF", "#CE1124", "#1D3D8F"] },
  { id: "spain", name: "Spain", flag: "🇪🇸", colors: ["#AA151B", "#F1BF00", "#AA151B"] },
  { id: "germany", name: "Germany", flag: "🇩🇪", colors: ["#000000", "#DD0000", "#FFCE00"] },
  { id: "portugal", name: "Portugal", flag: "🇵🇹", colors: ["#006600", "#FF0000", "#FFD700"] },
  { id: "italy", name: "Italy", flag: "🇮🇹", colors: ["#0066CC", "#FFFFFF", "#009246"] },
  { id: "netherlands", name: "Netherlands", flag: "🇳🇱", colors: ["#FF6200", "#FFFFFF", "#21468B"] },
  { id: "usa", name: "USA", flag: "🇺🇸", colors: ["#3C3B6E", "#FFFFFF", "#B22234"] },
  { id: "morocco", name: "Morocco", flag: "🇲🇦", colors: ["#C1272D", "#006233", "#FFFFFF"] },
  { id: "japan", name: "Japan", flag: "🇯🇵", colors: ["#BC002D", "#FFFFFF", "#1D3D8F"] },
];

export function teamById(id: string): Team {
  return TEAMS.find((t) => t.id === id) ?? TEAMS[0];
}

/** Comma-separated colour names-ish description for the generation prompt. */
export function teamPaletteText(team: Team): string {
  return `${team.colors[0]}, ${team.colors[1]} and ${team.colors[2]}`;
}
