import type { MetadataRoute } from "next";

// Same canonical-origin resolution as robots.ts (explicit site URL → Netlify URL → localhost).
const SITE = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.URL ||
  process.env.DEPLOY_PRIME_URL ||
  "http://localhost:3000"
).replace(/\/+$/, "");

// sitemap.xml — the public, indexable pages (the /api surface is excluded via robots.ts).
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const pages: { path: string; priority: number }[] = [
    { path: "", priority: 1 },
    { path: "/studio", priority: 0.9 },
    { path: "/mint", priority: 0.9 },
    { path: "/dashboard", priority: 0.7 },
    { path: "/leaderboard", priority: 0.6 },
  ];
  return pages.map(({ path, priority }) => ({
    url: `${SITE}${path}`,
    lastModified,
    changeFrequency: "weekly",
    priority,
  }));
}
