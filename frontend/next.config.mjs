/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Opt-in self-contained server bundle for containers (Alibaba Cloud Function Compute / ECS via the
  // Dockerfile). Off by default so the Netlify build (which expects the normal output) is unchanged;
  // the Docker build sets BUILD_STANDALONE=1. See docs/DEPLOY_ALIBABA.md.
  output: process.env.BUILD_STANDALONE ? "standalone" : undefined,
  // Shareable referral short link → homepage with the ref code (captured client-side).
  // A Next redirect (compiled into routing, handled natively by the Netlify Next runtime) —
  // not a route handler, so no serverless function and no 502 risk.
  async redirects() {
    return [{ source: "/r/:code", destination: "/?ref=:code", permanent: false }];
  },
};

export default nextConfig;
