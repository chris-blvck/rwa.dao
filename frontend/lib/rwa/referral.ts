// Ambassador / referral program — DEMO logic (off-chain). Two tiers:
//   • Level 1: you earn 10% of what people you referred buy.
//   • Level 2: you earn 1% (10% of their 10%) of what THEIR referrals buy.
// Real attribution + on-chain payouts (wallet-linked) come after scope sign-off; this drives the
// dashboard and the share-link flow for the demo/pitch.

export const COMMISSION_L1 = 0.1; // 10%
export const COMMISSION_L2 = 0.01; // 1%

export type Referral = {
  handle: string;
  level: 1 | 2;
  purchasesUsd: number; // total purchased through this referral
  joinedDaysAgo: number;
};

// Seeded referrals so an ambassador dashboard looks alive in a pitch (clearly demo data).
export const DEMO_REFERRALS: Referral[] = [
  { handle: "@kev.eth", level: 1, purchasesUsd: 1240, joinedDaysAgo: 2 },
  { handle: "@watchgirl", level: 1, purchasesUsd: 860, joinedDaysAgo: 4 },
  { handle: "@rwa_max", level: 1, purchasesUsd: 540, joinedDaysAgo: 6 },
  { handle: "@degen.lina", level: 2, purchasesUsd: 2100, joinedDaysAgo: 3 },
  { handle: "@sosa", level: 2, purchasesUsd: 980, joinedDaysAgo: 5 },
  { handle: "@miko", level: 2, purchasesUsd: 430, joinedDaysAgo: 8 },
];

export type Earnings = { l1: number; l2: number; total: number; l1Count: number; l2Count: number };

export function earningsFrom(refs: Referral[]): Earnings {
  let l1 = 0, l2 = 0, l1Count = 0, l2Count = 0;
  for (const r of refs) {
    if (r.level === 1) { l1 += r.purchasesUsd * COMMISSION_L1; l1Count++; }
    else { l2 += r.purchasesUsd * COMMISSION_L2; l2Count++; }
  }
  return { l1, l2, total: l1 + l2, l1Count, l2Count };
}

// Stable 8-char referral code from a seed (wallet address, or a generated id for demo wallets).
export function refCode(seed: string): string {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) + h + seed.charCodeAt(i)) >>> 0;
  return h.toString(36).toUpperCase().padStart(8, "0").slice(0, 8);
}

// Shareable short link handled by a CDN redirect in netlify.toml (/r/:code → /?ref=:code),
// so the homepage captures the code. No serverless function involved.
export function refLink(code: string, origin = "https://rwadao.netlify.app"): string {
  return `${origin}/r/${code}`;
}
