// Netlify Scheduled Function — the autonomous trigger for the Managed Agents.
// Every hour it calls the app's scheduler endpoint, which iterates the enabled agents and tops
// each user's draft queue up to their daily cadence (see app/api/rwa/agent/run/route.ts).
//
// Required env (Netlify → Site settings → Environment variables):
//   CRON_SECRET                — shared secret guarding the run endpoint.
//   SUPABASE_SERVICE_ROLE_KEY  — lets the endpoint enqueue per-user drafts (else it demo-ticks).
// `URL` is provided by Netlify automatically (the site's canonical URL).

export default async () => {
  const secret = process.env.CRON_SECRET;
  const site = process.env.URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (!secret || !site) {
    console.log("agent-cron: skipped (CRON_SECRET or site URL not configured)");
    return new Response("cron not configured", { status: 200 });
  }
  const res = await fetch(`${site}/api/rwa/agent/run`, {
    method: "POST",
    headers: { authorization: `Bearer ${secret}` },
  });
  const body = await res.text();
  console.log(`agent-cron: ${res.status} ${body}`);
  return new Response(body, { status: res.status });
};

export const config = { schedule: "@hourly" };
