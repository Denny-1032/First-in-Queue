-- =============================================
-- 020: v2 plan structure - Free / Pro / Institution
-- ---------------------------------------------
-- Replaces the volume ladder (Free/Basic/Business/Enterprise, each bundling
-- WhatsApp conversations and voice minutes) with the v2 model, where WhatsApp
-- and voice are metered prepaid credit and the subscription sells capability:
-- branding removed, channels unlocked, unlimited properties and agents.
-- See docs/pricing-model-v2.md §4 and docs/v2-implementation-plan.md §6.
--
-- Basic and Business are NOT deleted. They are marked inactive and kept as
-- legacy rows so the subscriptions already paid for keep their allowances to
-- the end of their period - the foreign key on subscriptions.plan_id requires
-- the rows to exist, and honouring what someone paid for requires their
-- allowances to stay put. They are dropped once no subscription references
-- them.
--
-- Enterprise IS remapped to Institution: no live subscription uses it
-- (v2 plan §1.2 - four active rows, three free and one business).
--
-- Also adds payments.plan_id and payments.billing_interval. resolvePlanFromAmount
-- currently infers the plan from the amount paid with `amount >= price` sorted
-- descending, which silently assigns the wrong plan the moment prices change or
-- a partial payment arrives. Carrying the plan explicitly through the payment
-- removes the guess.
--
-- Safe to re-run.
-- =============================================

BEGIN;

-- --- 1. The plans now for sale ---------------------------------------------

INSERT INTO subscription_plans (id, name, price_zmw, messages_per_month, whatsapp_numbers, features, is_active, sort_order) VALUES
  ('pro', 'Pro', 499, 0, 2,
   '["Everything in Free","FiQ branding removed","WhatsApp, voice and automated actions unlocked","Unlimited websites and team agents","5,000 web AI replies a month","WhatsApp and voice paid from prepaid credit"]'::jsonb,
   true, 1),
  ('institution', 'Institution', 5000, 5000, 10,
   '["Everything in Pro","5,000 WhatsApp conversations/month","500 AI voice call minutes/month","99.9% uptime SLA","SSO, audit log and data residency","Dedicated customer success manager","Custom integrations","On-site onboarding & training"]'::jsonb,
   true, 2)
ON CONFLICT (id) DO UPDATE
  SET name               = EXCLUDED.name,
      price_zmw          = EXCLUDED.price_zmw,
      messages_per_month = EXCLUDED.messages_per_month,
      whatsapp_numbers   = EXCLUDED.whatsapp_numbers,
      features           = EXCLUDED.features,
      is_active          = true,
      sort_order         = EXCLUDED.sort_order;

-- Free stays, but is now web-only: WhatsApp is a paid capability under v2.
UPDATE subscription_plans
SET name               = 'Free',
    price_zmw          = 0,
    messages_per_month = 0,
    whatsapp_numbers   = 0,
    sort_order         = 0,
    is_active          = true
WHERE id = 'free';

-- --- 2. Retire Enterprise into Institution ---------------------------------
-- Order matters: move the subscriptions before deactivating the plan.

UPDATE subscriptions SET plan_id = 'institution' WHERE plan_id = 'enterprise';
UPDATE subscription_plans SET is_active = false WHERE id = 'enterprise';

-- --- 3. Keep Basic and Business alive but unsellable ------------------------
-- Allowances are deliberately left untouched. A tenant part-way through a
-- K1,699 month keeps the 5,000 conversations and 120 minutes they bought; the
-- move to Pro happens when they renew, not underneath them.

UPDATE subscription_plans
SET name      = 'Basic (legacy)',
    is_active = false
WHERE id = 'basic';

UPDATE subscription_plans
SET name      = 'Business (legacy)',
    is_active = false
WHERE id = 'business';

-- --- 4. Carry the plan explicitly through the payment ----------------------

ALTER TABLE payments ADD COLUMN IF NOT EXISTS plan_id TEXT REFERENCES subscription_plans(id);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS billing_interval TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_billing_interval_check') THEN
    ALTER TABLE payments
      ADD CONSTRAINT payments_billing_interval_check
      CHECK (billing_interval IS NULL OR billing_interval IN ('monthly', 'yearly'));
  END IF;
END $$;

-- --- 5. Assert the result --------------------------------------------------

DO $$
DECLARE
  v_orphans INTEGER;
  v_missing TEXT;
BEGIN
  SELECT count(*) INTO v_orphans
  FROM subscriptions s
  WHERE NOT EXISTS (SELECT 1 FROM subscription_plans p WHERE p.id = s.plan_id);

  IF v_orphans > 0 THEN
    RAISE EXCEPTION '020: % subscription(s) reference a plan_id with no subscription_plans row', v_orphans;
  END IF;

  SELECT string_agg(expected, ', ') INTO v_missing
  FROM unnest(ARRAY['free', 'pro', 'institution']) AS expected
  WHERE NOT EXISTS (SELECT 1 FROM subscription_plans p WHERE p.id = expected);

  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION '020: subscription_plans is missing the plan id(s): %', v_missing;
  END IF;

  IF EXISTS (SELECT 1 FROM subscriptions WHERE plan_id = 'enterprise') THEN
    RAISE EXCEPTION '020: subscriptions still reference the retired enterprise plan';
  END IF;
END $$;

COMMIT;
