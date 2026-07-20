// NFT mint economics + points/FOMO — DEMO logic (off-chain). Wired to plug into an audited
// NFT contract (OpenZeppelin / thirdweb claim phases) later — no custom contract to audit.
//
// Mechanics (from the client brief):
//   • Price rises with every mint (bonding curve) → scarcity.
//   • A countdown timer grants bonus points that decay as it ticks down.
//   • Minting resets your timer (encourages a fast next purchase).
//   • Points: 1 US cent = 1 point ($1 = 100 pts). Accumulate to redeem an NFT.

export const MINT_BASE_USD = 50; // starting price
export const MINT_STEP_USD = 2; // price increase per mint
export const MINT_SUPPLY = 500; // total supply
export const TIMER_SECONDS = 500; // FOMO window length
export const POINTS_PER_USD = 100; // 1 cent = 1 point
export const MAX_TIME_BONUS = 500; // bonus points at full timer, decaying to 0
export const REDEEM_THRESHOLD = 50_000; // points needed to redeem an NFT
export const POST_REWARD_POINTS = 500; // demo: submitting a post to a campaign earns points

/** Current mint price after `minted` units (linear bonding curve). */
export function priceAt(minted: number): number {
  return MINT_BASE_USD + minted * MINT_STEP_USD;
}

/** Bonus points from the countdown — full at TIMER_SECONDS, linearly down to 0 at expiry. */
export function timeBonus(secondsLeft: number): number {
  const s = Math.min(TIMER_SECONDS, Math.max(0, secondsLeft));
  return Math.round((s / TIMER_SECONDS) * MAX_TIME_BONUS);
}

/** Points earned for a mint = base (price × 100) + the current time bonus. */
export function pointsForMint(minted: number, secondsLeft: number): number {
  return Math.round(priceAt(minted) * POINTS_PER_USD) + timeBonus(secondsLeft);
}

/** Points → USD value at 1 cent / point. */
export function pointsUsd(points: number): number {
  return points / POINTS_PER_USD;
}

export function mmss(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}
