import type { MetadataRoute } from "next";

// Resolve the canonical origin the same way the generate route does: an explicit site URL, else
// Netlify's build-provided URL, else localhost. NEXT_PUBLIC_* is inlined at build, so the Netlify
// production build bakes in the right host without any extra config.
const SITE = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.URL ||
  process.env.DEPLOY_PRIME_URL ||
  "http://localhost:3000"
).replace(/\/+$/, "");

// robots.txt — crawlable, but keep the API surface out of the index.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/"] },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
