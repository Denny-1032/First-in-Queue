-- =============================================
-- 017: Reconcile subscription_plans with the application
-- ---------------------------------------------
-- 003_subscriptions_payments.sql seeds subscription_plans with
--   free, starter, growth, enterprise
-- but src/lib/lipila/plans.ts (and the live database) use
--   free, basic, business, enterprise
--
-- The live table was corrected by hand via scripts/sync-plans-to-frontend.sql,
-- outside the migration files. Because subscriptions.plan_id carries
-- REFERENCES subscription_plans(id), rebuilding this schema from
-- supabase/migrations/ produces a database where every 'basic' and 'business'
-- subscription violates the foreign key. Latent in production, fatal for any
-- new environment, local contributor, or disaster recovery.
--
-- 003 is deliberately NOT edited: it is already applied in production, and
-- rewriting an applied migration is worse than reconciling forward.
--
-- This migration is the forward reconciliation. It must reach the same end
-- state on a fresh rebuild (where 003 has just seeded starter/growth) and on
-- the live database (where the console edit already landed), so every step is
-- idempotent.
--
-- Enterprise allowances are also brought down off the 999999 sentinel to the
-- capped values introduced in the same change to plans.ts. See
-- docs/pricing-model-v2.md §2 and §7 item 1: Enterprise breaks even at 1,425
-- voice minutes/month while advertising unlimited voice.
--
-- 'pro' and 'institution' are NOT added here - those belong to Phase 4 of
-- docs/v2-implementation-plan.md, after Meta publishes Rest-of-Africa rates on
-- 1 September 2026.
--
-- Safe to re-run.
-- =============================================

BEGIN;

-- --- 1. Create the plans the application actually references ---------------
-- Carries over features/sort_order from the old row when it is still present
-- (fresh rebuild); does nothing when the row already exists (live database).

INSERT INTO subscription_plans (id, name, price_zmw, messages_per_month, whatsapp_numbers, features, is_active, sort_order)
SELECT 'basic', 'Basic', 499, 1000, 1, features, true, sort_order
FROM subscription_plans WHERE id = 'starter'
ON CONFLICT (id) DO NOTHING;

INSERT INTO subscription_plans (id, name, price_zmw, messages_per_month, whatsapp_numbers, features, is_active, sort_order)
SELECT 'business', 'Business', 1699, 5000, 2, features, true, sort_order
FROM subscription_plans WHERE id = 'growth'
ON CONFLICT (id) DO NOTHING;

-- Belt and braces: if neither the old row nor the new one exists (a database
-- built from some other starting point), seed from scratch.
INSERT INTO subscription_plans (id, name, price_zmw, messages_per_month, whatsapp_numbers, features, is_active, sort_order) VALUES
  ('basic', 'Basic', 499, 1000, 1, '["Everything in Free","Multi-language support (40+)","Conversation flows","Priority email support"]'::jsonb, true, 1),
  ('business', 'Business', 1699, 5000, 2, '["Everything in Basic","Advanced analytics","Human handoff","Dedicated onboarding","Phone support"]'::jsonb, true, 2)
ON CONFLICT (id) DO NOTHING;

-- --- 2. Move any subscriptions off the retired plan ids ---------------------
-- Must happen before the DELETE below: the FK forbids orphaning them.
-- No-op on the live database.

UPDATE subscriptions SET plan_id = 'basic'    WHERE plan_id = 'starter';
UPDATE subscriptions SET plan_id = 'business' WHERE plan_id = 'growth';

-- --- 3. Retire the drifted plan ids -----------------------------------------

DELETE FROM subscription_plans WHERE id IN ('starter', 'growth');

-- --- 4. Align the surviving rows with src/lib/lipila/plans.ts ---------------

UPDATE subscription_plans
SET name              = 'Free',
    price_zmw         = 0,
    messages_per_month = 5,
    whatsapp_numbers  = 1,
    sort_order        = 0
WHERE id = 'free';

UPDATE subscription_plans
SET name               = 'Basic',
    price_zmw          = 499,
    messages_per_month = 1000,
    whatsapp_numbers   = 1,
    sort_order         = 1
WHERE id = 'basic';

UPDATE subscription_plans
SET name               = 'Business',
    price_zmw          = 1699,
    messages_per_month = 5000,
    whatsapp_numbers   = 2,
    sort_order         = 2
WHERE id = 'business';

-- Enterprise: 999999 was an "unlimited" sentinel. Replaced with the allowance
-- Enterprise was actually costed on (pricing-model-v2 §2: K2,727 COGS at
-- 5k messages / 500 voice minutes, 45% margin). Overage is contracted, not
-- published, so no rate is set here.
UPDATE subscription_plans
SET name               = 'Enterprise',
    price_zmw          = 5000,
    messages_per_month = 5000,
    whatsapp_numbers   = 10,
    sort_order         = 3
WHERE id = 'enterprise';

-- --- 5. Assert the repo and the database now agree --------------------------
-- Fails the migration on any future drift, instead of failing the next rebuild.

DO $$
DECLARE
  v_orphans INTEGER;
  v_missing TEXT;
BEGIN
  SELECT count(*) INTO v_orphans
  FROM subscriptions s
  WHERE NOT EXISTS (SELECT 1 FROM subscription_plans p WHERE p.id = s.plan_id);

  IF v_orphans > 0 THEN
    RAISE EXCEPTION '017: % subscription(s) reference a plan_id with no subscription_plans row', v_orphans;
  END IF;

  SELECT string_agg(expected, ', ') INTO v_missing
  FROM unnest(ARRAY['free', 'basic', 'business', 'enterprise']) AS expected
  WHERE NOT EXISTS (SELECT 1 FROM subscription_plans p WHERE p.id = expected);

  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION '017: subscription_plans is missing the plan id(s): %', v_missing;
  END IF;
END $$;

COMMIT;
