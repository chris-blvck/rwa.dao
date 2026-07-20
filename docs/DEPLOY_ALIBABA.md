# Deploy on Alibaba Cloud (Qwen Cloud hackathon — "backend running on Alibaba Cloud")

The hackathon requires the project to **use Alibaba Cloud services** and have its **backend running on
Alibaba Cloud**. This is the turnkey path: containerize the Next.js app (already done — see
`frontend/Dockerfile`) and run it on **Function Compute** (or ECS), with the agent's reasoning +
generation on **DashScope (Qwen / Wan)** and the hourly agent loop on an Alibaba **timer trigger**.

> Status: the container **build is verified** locally (`BUILD_STANDALONE=1 npm run build` →
> `.next/standalone/server.js`). The live deploy needs Peter's Alibaba Cloud account — the steps
> below are exact and ready to run; nothing here is guessed about our app, only about which Alibaba
> product you pick (FC vs ECS).

## The Alibaba-native stack (what satisfies the requirement)

| Layer | Alibaba Cloud service |
|---|---|
| Compute / backend | **Function Compute** (custom container) — or **ECS** |
| Agent reasoning + captions | **Model Studio / DashScope** — Qwen (`qwen-max`) via `lib/rwa/llm.ts` → `lib/rwa/qwen.ts` |
| Video generation | **DashScope video-synthesis** — Wan / HappyHorse via `lib/rwa/qwen_video.ts` |
| Image registry | **Container Registry (ACR)** |
| Hourly agent cron | **Function Compute timer trigger** (or **EventBridge** schedule) → `POST /api/rwa/agent/run` |
| Data | **Supabase** (external Postgres, unchanged) — or migrate to **ApsaraDB RDS for PostgreSQL** |

The chain reads stay on XDC Apothem (public RPC) — unchanged.

## 1. Build & push the image to ACR

```bash
# from the repo root
cd frontend
# Build the standalone image (bakes NEXT_PUBLIC_SITE_URL for metadata/robots/sitemap/OG).
# The build is hermetic — the Inter font is self-hosted (app/fonts/), so it needs NO Google Fonts
# egress and works on a mainland-China-region ACR build host. Only npm registry access is required.
docker build \
  --build-arg NEXT_PUBLIC_SITE_URL=https://<your-domain> \
  -t rwa-dao-portal:latest .

# Tag + push to Alibaba Container Registry
docker tag rwa-dao-portal:latest \
  registry.<region>.aliyuncs.com/<namespace>/rwa-dao-portal:latest
docker login registry.<region>.aliyuncs.com   # ACR credentials
docker push registry.<region>.aliyuncs.com/<namespace>/rwa-dao-portal:latest
```

## 2a. Run on Function Compute (recommended — serverless container)

1. **Create a function** → *Custom Container* → image = the ACR image above.
2. **Listening port: `3000`** (the container's `EXPOSE`/`PORT`). Enable the **web/HTTP** function type
   so FC forwards HTTP to it.
3. **Memory** ≥ 1 GB, **timeout** ≥ 60 s (Next SSR + edge OG rendering).
4. Set the **environment variables** (next section).
5. Add an **HTTP trigger** → you get the public URL. Point your domain at it.

## 2b. Or run on ECS (a VM)

```bash
# on the ECS instance (Docker installed)
docker pull registry.<region>.aliyuncs.com/<namespace>/rwa-dao-portal:latest
docker run -d --restart=always -p 80:3000 \
  --env-file /etc/rwa-dao.env \
  registry.<region>.aliyuncs.com/<namespace>/rwa-dao-portal:latest
```
Front it with **SLB** + HTTPS (ACM cert) for a production domain.

## 3. Environment variables (the matrix)

| Var | Needed for | Notes |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | metadata, robots, sitemap, OG | **build arg** (inlined) — also safe to set at runtime |
| `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL` | agent queue, memory, indexer | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | server-side writes (drafts, memory, mints) | **secret** — server only |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client library sync | publishable |
| `CRON_SECRET` | guards `/api/rwa/agent/run` | **secret**; Bearer token the timer sends |
| `DASHSCOPE_API_KEY` (or `QWEN_API_KEY`) | **Qwen reasoning + captions + video** | **secret** — the Alibaba-native path |
| `RWA_LLM_PROVIDER=qwen` | force captions through Qwen | else auto-selects by key presence |
| `RWA_VIDEO_PROVIDER=qwen` | route generation to DashScope video | + `RWA_ALLOW_LIVE_GENERATION=1` to actually run |
| `QWEN_MODEL`, `QWEN_WAN_I2V`, `QWEN_HAPPYHORSE_I2V`, `DASHSCOPE_BASE_URL` | model/endpoint overrides | validate the exact ids once the key is live |
| `RWA_MEMORY_AGENT` | `0` disables the MemoryAgent (plain rotation) | default on |

Put every **secret** in FC's encrypted env (or Secrets Manager) — never in the image.

## 4. The hourly agent loop (replaces the Netlify cron)

On Netlify a scheduled function hits `/api/rwa/agent/run`. On Alibaba Cloud, create a **timer trigger**:

- **Function Compute → Triggers → Timer**, cron `0 0 * * * *` (hourly), or an **EventBridge** schedule.
- Target: `POST https://<your-fc-url>/api/rwa/agent/run`
- Header: `Authorization: Bearer <CRON_SECRET>`

Each tick reinforces every creator's memory from on-chain mints, ranks the next batch, **writes the
captions on Qwen**, enqueues the drafts, and advances the Minted-event index — the full MemoryAgent
loop, running on Alibaba Cloud.

## 5. Verify the deploy

```bash
curl -sS https://<your-fc-url>/api/rwa/xdc-price            # public route → 200 JSON
curl -sS https://<your-fc-url>/manifest.webmanifest          # PWA manifest → 200

# Provider preflight — confirm the Qwen path is wired the moment the key is set (no generation cost).
# Config-only (zero external calls): reports key presence + the resolved DashScope video model ids.
curl -sS https://<your-fc-url>/api/rwa/agent/preflight \
  -H "Authorization: Bearer <CRON_SECRET>"                   # → { ok, llm, video.models, notes }
# Add ?probe=1 to also fire ONE ~5-token Qwen call and confirm key/base/auth end-to-end:
curl -sS "https://<your-fc-url>/api/rwa/agent/preflight?probe=1" \
  -H "Authorization: Bearer <CRON_SECRET>"                   # → llm.reachable: true, sample: "OK"

curl -sS -X POST https://<your-fc-url>/api/rwa/agent/run \
  -H "Authorization: Bearer <CRON_SECRET>"                   # scheduler tick → ran:true
```

The last call is the money shot for the submission: it exercises Qwen (captions) + Supabase (queue) +
the chain (indexer) in one request, from a backend running on Alibaba Cloud.
