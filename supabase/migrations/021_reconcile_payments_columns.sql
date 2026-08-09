-- =============================================
-- 021: Reconcile the payments table with the code
-- ---------------------------------------------
-- Same drift class as 017. These three columns are read and written by the
-- payment routes but appear in no migration file, so a schema rebuilt from
-- supabase/migrations/ does not have them:
--
--   payment_method   - written by /api/payments/initiate, read by
--                      /api/payments/confirm to pick Lipila vs Lenco
--   lenco_reference  - written by the Lenco confirm, verify and webhook paths
--   completed_at     - written by the same three
--
-- /api/payments/initiate already carries a PGRST204 fallback for the missing
-- payment_method column, which is the tell: it was added by hand in the
-- console, exactly like the subscription_plans drift.
--
-- It also fixes a live defect. 003 constrains payment_type to the Lipila
-- vocabulary:
--
--   CHECK (payment_type IN ('AirtelMoney','MtnMoney','ZamtelKwacha','Card'))
--
-- but the Lenco card path writes lencoStatus.type, which is one of
-- 'card' | 'mobile-money' | 'bank-account'. Every one of those violates the
-- constraint, so the UPDATE in /api/payments/confirm throws for card payments
-- and the payment is never marked successful - the customer is charged and the
-- subscription is not activated. The constraint is widened to accept both
-- vocabularies rather than dropped, so the column still cannot take arbitrary
-- values.
--
-- Safe to re-run.
-- =============================================

BEGIN;

-- --- 1. The three drifted columns ------------------------------------------

ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_method  TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS lenco_reference TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS completed_at    TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_payment_method_check') THEN
    ALTER TABLE payments
      ADD CONSTRAINT payments_payment_method_check
      CHECK (payment_method IS NULL OR payment_method IN ('mobile_money', 'card'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_payments_lenco_reference
  ON payments(lenco_reference)
  WHERE lenco_reference IS NOT NULL;

-- --- 2. Let payment_type hold what Lenco actually returns -------------------
-- Both providers write this column. Widened, not dropped.

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_type_check;

ALTER TABLE payments
  ADD CONSTRAINT payments_payment_type_check
  CHECK (
    payment_type IS NULL OR payment_type IN (
      -- Lipila
      'AirtelMoney', 'MtnMoney', 'ZamtelKwacha', 'Card',
      -- Lenco
      'card', 'mobile-money', 'bank-account'
    )
  );

-- --- 3. Assert the columns the code depends on are all present --------------

DO $$
DECLARE
  v_missing TEXT;
BEGIN
  SELECT string_agg(expected, ', ') INTO v_missing
  FROM unnest(ARRAY[
    'payment_method', 'lenco_reference', 'completed_at',
    'purpose', 'plan_id', 'billing_interval'
  ]) AS expected
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = expected
  );

  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION '021: payments is missing the column(s): % (run migrations 019 and 020 first)', v_missing;
  END IF;
END $$;

COMMIT;
