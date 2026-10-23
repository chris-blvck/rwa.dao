-- Only after disabling all live provider flags; the guarded application will return 503.
DROP FUNCTION IF EXISTS public.rwa_reserve_provider_call(text,integer);
DROP FUNCTION IF EXISTS rwa_spend_internal.reserve_call(text,integer);
DROP TABLE IF EXISTS rwa_spend_internal.user_quotas;
DROP TABLE IF EXISTS rwa_spend_internal.provider_quotas;
DROP SCHEMA IF EXISTS rwa_spend_internal;
