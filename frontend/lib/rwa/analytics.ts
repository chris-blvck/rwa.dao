// Competition / analytics KPIs — DEMO data for the Attention House event scoreboard.
// The metrics that matter for the competition: new signups, views, watch-minutes, revenue.
// Real numbers come from event tracking + platform APIs (TikTok/Meta) once wired.

export type Kpi = {
  key: string;
  label: string;
  value: number;
  deltaPct: number; // vs previous period
  trend: number[]; // last 7 periods (for a sparkline)
  fmt: "int" | "usd";
};

export const DEMO_KPIS: Kpi[] = [
  { key: "signups", label: "New signups", value: 1284, deltaPct: 23, trend: [120, 160, 140, 210, 240, 300, 340], fmt: "int" },
  { key: "views", label: "Views", value: 412900, deltaPct: 41, trend: [28, 34, 31, 52, 60, 78, 96], fmt: "int" },
  { key: "minutes", label: "Watch minutes", value: 38400, deltaPct: 18, trend: [3.1, 3.6, 3.4, 4.2, 5.0, 5.8, 6.4], fmt: "int" },
  { key: "revenue", label: "Revenue", value: 21750, deltaPct: 29, trend: [1.2, 1.8, 2.1, 2.6, 3.4, 4.1, 4.9], fmt: "usd" },
];

// Build an SVG polyline path normalised into a [w × h] box from a series of values.
export function sparkPath(values: number[], w = 100, h = 28): string {
  if (!values.length) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = values.length > 1 ? w / (values.length - 1) : 0;
  return values
    .map((v, i) => {
      const x = +(i * step).toFixed(2);
      const y = +(h - ((v - min) / span) * h).toFixed(2);
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");
}
