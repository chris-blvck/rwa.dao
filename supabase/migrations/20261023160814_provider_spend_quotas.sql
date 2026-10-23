-- Fail-closed, shared durable quotas. Default zero budget authorizes no provider spending.
-- Internal schema must NOT be added to the Supabase Data API exposed schemas.
CREATE SCHEMA IF NOT EXISTS rwa_spend_internal;
REVOKE ALL ON SCHEMA rwa_spend_internal FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA rwa_spend_internal TO authenticated;

CREATE TABLE IF NOT EXISTS rwa_spend_internal.provider_quotas (
  action text PRIMARY KEY CHECK(action IN ('caption','compose','generate')),
  daily_limit integer NOT NULL DEFAULT 0 CHECK(daily_limit>=0),
  minute_limit integer NOT NULL DEFAULT 0 CHECK(minute_limit>=0),
  usage_day date NOT NULL DEFAULT CURRENT_DATE,
  daily_used integer NOT NULL DEFAULT 0,
  usage_minute timestamptz NOT NULL DEFAULT date_trunc('minute',now()),
  minute_used integer NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS rwa_spend_internal.user_quotas (
  owner uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL REFERENCES rwa_spend_internal.provider_quotas(action),
  daily_limit integer NOT NULL DEFAULT 0 CHECK(daily_limit>=0),
  minute_limit integer NOT NULL DEFAULT 0 CHECK(minute_limit>=0),
  usage_day date NOT NULL DEFAULT CURRENT_DATE,
  daily_used integer NOT NULL DEFAULT 0,
  usage_minute timestamptz NOT NULL DEFAULT date_trunc('minute',now()),
  minute_used integer NOT NULL DEFAULT 0,
  PRIMARY KEY(owner,action)
);
ALTER TABLE rwa_spend_internal.provider_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE rwa_spend_internal.user_quotas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA rwa_spend_internal FROM PUBLIC, anon, authenticated;
INSERT INTO rwa_spend_internal.provider_quotas(action) VALUES ('caption'),('compose'),('generate') ON CONFLICT DO NOTHING;

-- Privileged counter updates stay in a non-exposed schema and always check auth.uid().
CREATE OR REPLACE FUNCTION rwa_spend_internal.reserve_call(p_action text,p_units integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
  v_owner uuid := auth.uid();
  v_global rwa_spend_internal.provider_quotas%ROWTYPE;
  v_user rwa_spend_internal.user_quotas%ROWTYPE;
  v_day date := (clock_timestamp() AT TIME ZONE 'UTC')::date;
  v_minute timestamptz := date_trunc('minute',clock_timestamp());
  g_day integer; g_min integer; u_day integer; u_min integer;
BEGIN
  IF v_owner IS NULL THEN RAISE EXCEPTION 'authentication_required' USING ERRCODE='28000'; END IF;
  IF p_action NOT IN ('caption','compose','generate') OR p_units IS NULL OR p_units<1 OR p_units>3 THEN
    RAISE EXCEPTION 'invalid_spend_units' USING ERRCODE='22023';
  END IF;
  -- Lock in one global order. Concurrent requests cannot overbook either budget.
  SELECT * INTO v_global FROM rwa_spend_internal.provider_quotas WHERE action=p_action FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'quota_exceeded'; END IF;
  SELECT * INTO v_user FROM rwa_spend_internal.user_quotas WHERE owner=v_owner AND action=p_action FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'quota_exceeded'; END IF;
  g_day := CASE WHEN v_global.usage_day=v_day THEN v_global.daily_used ELSE 0 END;
  g_min := CASE WHEN v_global.usage_minute=v_minute THEN v_global.minute_used ELSE 0 END;
  u_day := CASE WHEN v_user.usage_day=v_day THEN v_user.daily_used ELSE 0 END;
  u_min := CASE WHEN v_user.usage_minute=v_minute THEN v_user.minute_used ELSE 0 END;
  IF g_day::bigint+p_units>v_global.daily_limit OR g_min::bigint+1>v_global.minute_limit
     OR u_day::bigint+p_units>v_user.daily_limit OR u_min::bigint+1>v_user.minute_limit THEN
    RAISE EXCEPTION 'quota_exceeded';
  END IF;
  UPDATE rwa_spend_internal.provider_quotas SET usage_day=v_day,daily_used=g_day+p_units,
    usage_minute=v_minute,minute_used=g_min+1 WHERE action=p_action;
  UPDATE rwa_spend_internal.user_quotas SET usage_day=v_day,daily_used=u_day+p_units,
    usage_minute=v_minute,minute_used=u_min+1 WHERE owner=v_owner AND action=p_action;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION rwa_spend_internal.reserve_call(text,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rwa_spend_internal.reserve_call(text,integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.rwa_reserve_provider_call(p_action text,p_units integer)
RETURNS boolean LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
  SELECT rwa_spend_internal.reserve_call(p_action,p_units);
$$;
REVOKE ALL ON FUNCTION public.rwa_reserve_provider_call(text,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rwa_reserve_provider_call(text,integer) TO authenticated;
