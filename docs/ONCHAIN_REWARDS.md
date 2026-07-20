# On-chain reward payout — built (contract + oracle)

The "real tokens" money-path, built and tested. It uses the **signed-voucher (lazy-claim)** pattern
so the on-chain surface is tiny (easy to audit) and the token economy is **farm-resistant from day
one**: the contract only pays what the off-chain oracle is willing to sign, and the oracle only signs
**verified, deduped, capped** rewards.

## Pieces
- **`web3/contracts/RwaxRewardDistributor.sol`** — EIP-712 signed-voucher distributor. `claim(voucher,
  sig)` pays RWAX to `voucher.to` iff the oracle signed it, it isn't expired, isn't over the cap, and
  the nonce is unused. `Ownable2Step` + `Pausable` + `ReentrancyGuard` + `SafeERC20`. Targets the
  **paris** EVM so the bytecode runs on XDC (no Cancun `mcopy`/`tstore`).
- **`web3/test/…`** — 8 tests: pays valid voucher, blocks double-claim, rejects non-oracle sig,
  rejects expired, enforces cap, honors pause, rotates signer, owner-only withdraw. All green.
- **`web3/scripts/deploy.js`** — deploy to XDC (`--network xdcApothem` / `xdc`).
- **`frontend/lib/rwa/rewards.ts`** — the oracle: EIP-712 domain/types matching the contract, sign +
  recover (viem). Server-side signing only.
- **`frontend/app/api/rwa/rewards/voucher`** — issues a signed voucher. **OFF by default**; when
  configured, this is where the anti-farm accounting lives (compute the verified amount, then sign).

## Flow
1. Treasury pre-funds the distributor with RWAX.
2. User earns (referral conversion on-chain / click via our redirect / post reward) → the server
   verifies + dedupes + caps → **signs a voucher**.
3. User calls `claim(voucher, signature)` → pulls their RWAX. One nonce = one payout. Views never pay
   directly (leaderboard only) → not farmable.

## Go-live (env)
| Var | Where | Notes |
|---|---|---|
| `REWARD_SIGNER_KEY` | server (oracle) | private key of the signer; **server-only, never commit** |
| `RWAX_DISTRIBUTOR` | app | deployed distributor address |
| `RWA_CHAIN_ID` | app | 50 (XDC) / 51 (Apothem) |
| `REWARD_MAX_CLAIM_WEI` | app | per-voucher ceiling (defense-in-depth) |
| `RWAX_TOKEN`,`REWARD_SIGNER`,`REWARD_OWNER` | deploy | constructor args (see `deploy.js`) |

Deploy: `cd web3 && npm i && npx hardhat test` then `npx hardhat run scripts/deploy.js --network xdcApothem`.
Before mainnet: **audit** the distributor (small, but it moves value) + set `owner` to a multisig.
