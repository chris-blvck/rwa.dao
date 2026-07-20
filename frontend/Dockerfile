# syntax=docker/dockerfile:1
# RWA-DAO Creator Studio — Next.js standalone container for Alibaba Cloud
# (Function Compute custom container, or ECS). Build context = this `frontend/` dir.
# See docs/DEPLOY_ALIBABA.md for the full deploy + env matrix.

# ── deps ──────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── build ─────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV BUILD_STANDALONE=1
# NEXT_PUBLIC_* are inlined at build time — pass the canonical site URL so metadata / robots /
# sitemap / OG cards bake the right host into the image.
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
RUN npm run build

# ── runner ────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
# Standalone server + the assets it does NOT bundle (static chunks + public/).
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
# Bind all interfaces so the container is reachable (Next standalone honours HOSTNAME).
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
