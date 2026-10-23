## Security deployment gate — 2026-10-23

The security branch has prepared the following controls; no migration or deployment is implied:

- Rewards voucher signing is unconditionally disabled (`503 reward_accounting_unavailable`), including when a signer key is present. A real entitlement ledger, atomic redemption and an independently reviewed payout flow are still required.
- Every live caption, image composition and video generation requires a Supabase user access token verified by `auth.getUser`, then an atomic reservation through `rwa_reserve_provider_call`. `API_GUARD_SECRET` is no longer an authorization bypass or a substitute for user identity.
- Apply the additive `*_provider_spend_quotas.sql` migration once to the intended project. Keep `rwa_spend_internal` out of the Data API exposed schemas. Its provider/user limits default to zero: configuring provider keys alone cannot enable spending.
- Provision each authenticated user's action limits and the provider-wide limits in the internal quota tables through an authorized operator workflow. Daily units bound generated jobs (multi-take video reserves up to three units); minute limits bound requests. They are not a currency-denominated billing ledger. Provider errors retain the reservation to prevent retry abuse.
- The existing simulated wallet connection is not a Supabase login. Until a real user-auth flow is connected and quota rows are provisioned, live requests correctly return 401/429/503; the no-cost demo remains available. Never place a service-role key or API guard secret in the browser.
- Scheduled agents currently use deterministic no-cost captions. A future scheduler LLM path must reserve an owner-scoped quota before any call.
- Rollback: disable live flags and revoke the public quota RPC before dropping the new internal schema with the reviewed rollback script. The application then fails closed; do not restore the former anonymous provider or reward-signing handlers.

Validation in this session: frontend typecheck/lint and security regressions; PostgreSQL quota tests use only an isolated local database. No provider call, wallet transaction, production migration or deployment was executed.
