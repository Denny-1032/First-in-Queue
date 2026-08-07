-- =============================================
-- 016: CRITICAL — revoke public/anon access to all application tables
-- ---------------------------------------------
-- The policies created in 001/002/003/004 were commented "Service role can
-- access everything (for API routes)" but were written as:
--
--     CREATE POLICY "Service role full access" ON tenants FOR ALL USING (true);
--
-- A policy with no TO clause applies to PUBLIC — which includes `anon`. The
-- anon key is public by design (it ships in the client JS bundle), so this
-- granted the whole internet full read AND write on every table.
--
-- Verified against production on 2026-07-31 using ONLY the public anon key:
--   tenants   -> readable, exposing whatsapp_access_token + openai_api_key
--   users     -> readable, exposing email + password_hash
--   agents    -> readable, exposing email + invite_token
--   bookings  -> readable, exposing customer_phone
--   payments / subscriptions / conversations / messages -> readable
--   UPDATE on tenants -> returned 200 (writes were authorized too)
--
-- The service role BYPASSES RLS entirely, so these policies were never needed
-- for the API routes to work. Dropping them restores default-deny for anon
-- while leaving all server-side code unaffected.
--
-- Blast radius: the only client-side Supabase consumer is
-- src/lib/hooks/use-realtime.ts, which is currently imported nowhere.
--
-- Every statement is guarded by to_regclass, so this runs to completion even
-- if some tables are absent — a security fix must never abort halfway because
-- one table is missing.
--
-- Safe to re-run.
-- =============================================

BEGIN;

-- --- 1. Drop every permissive "anyone" policy, wherever it exists ---------
-- Removes ALL policies on the listed tables. None of them are role-scoped, so
-- none are load-bearing: service_role bypasses RLS regardless.

DO $$
DECLARE
  t    text;
  pol  record;
  tables text[] := ARRAY[
    'tenants', 'agents', 'conversations', 'messages', 'flow_states',
    'analytics_events', 'scheduled_messages', 'bookings', 'lead_scores',
    'subscription_plans', 'subscriptions', 'payments', 'users',
    'voice_agents', 'voice_calls', 'scheduled_calls',
    'properties', 'widget_usage', 'widget_rate_buckets',
    'demo_bookings', 'demo_calls', 'voice_callbacks',
    'fiq_support_calls', 'fiq_support_config'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF to_regclass('public.' || quote_ident(t)) IS NULL THEN
      RAISE NOTICE 'skipping %, table not present', t;
      CONTINUE;
    END IF;

    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
    END LOOP;

    -- Enable RLS. Without it, Supabase's default grants let anon read the
    -- table outright (this is how `properties` — which holds widget_key —
    -- was exposed to key enumeration).
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- --- 2. Catch anything not in the list above ------------------------------
-- Any remaining RLS-less table in `public` is enabled too, so a table added
-- later without RLS cannot silently reopen this hole.

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relrowsecurity = false
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.relname);
  END LOOP;
END $$;

-- --- 3. Belt and braces: remove direct grants from anon -------------------
-- RLS governs row visibility, but revoking the grants means a future
-- accidental permissive policy still cannot expose data to anon.

REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;

COMMIT;

-- =============================================
-- VERIFY
--   query 1 -> should return NO rows (no permissive policies left)
--   query 2 -> should return NO rows (every table has RLS on)
-- Then re-run the anon-key probe from outside to confirm.
-- =============================================
SELECT tablename, policyname, roles
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;

SELECT c.relname AS table_without_rls
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity = false
ORDER BY 1;
