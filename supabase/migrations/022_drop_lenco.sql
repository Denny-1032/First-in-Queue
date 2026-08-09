-- =============================================
-- 022: Remove Lenco from the payments schema
-- ---------------------------------------------
-- Lipila shipped card collections (Visa, Mastercard, American Express), so the
-- card path moved off Lenco and onto POST /api/v1/collections/card. The Lenco
-- client, its verify route and its webhook route are deleted from the codebase;
-- this drops what they left behind in the database.
--
-- Two things go:
--
--   lenco_reference  - written only by the deleted Lenco paths. Any value still
--                      in it is preserved into callback_data first, so this
--                      migration loses no data.
--   the widened payment_type CHECK from 021, which accepted the Lenco
--                      vocabulary ('card', 'mobile-money', 'bank-account')
--                      alongside Lipila's. Nothing writes those values now, so
--                      the constraint goes back to guarding a single vocabulary.
--
-- Historical rows written by the Lenco path are remapped rather than deleted:
-- 'card' is exactly Lipila's 'Card'. 'mobile-money' and 'bank-account' never
-- occurred (the Lenco path was card-only) but are mapped defensively to NULL
-- rather than guessed at, because an invented payment_type on a real payment is
-- worse than an absent one.
--
-- Safe to re-run.
-- =============================================

BEGIN;

-- --- 1. Preserve any Lenco reference before dropping the column -------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'lenco_reference'
  ) THEN
    EXECUTE $sql$
      UPDATE payments
      SET callback_data =
        COALESCE(callback_data, '{}'::jsonb)
        || jsonb_build_object('legacy_lenco_reference', lenco_reference)
      WHERE lenco_reference IS NOT NULL
    $sql$;
  END IF;
END $$;

DROP INDEX IF EXISTS idx_payments_lenco_reference;
ALTER TABLE payments DROP COLUMN IF EXISTS lenco_reference;

-- --- 2. Remap historical Lenco payment_type values --------------------------

UPDATE payments SET payment_type = 'Card'
  WHERE payment_type = 'card';

UPDATE payments SET payment_type = NULL
  WHERE payment_type IN ('mobile-money', 'bank-account');

-- --- 3. Narrow payment_type back to the Lipila vocabulary -------------------

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_type_check;

ALTER TABLE payments
  ADD CONSTRAINT payments_payment_type_check
  CHECK (
    payment_type IS NULL OR payment_type IN (
      'AirtelMoney', 'MtnMoney', 'ZamtelKwacha', 'Card'
    )
  );

-- --- 4. Assert nothing the code still writes was removed --------------------

DO $$
DECLARE
  v_missing TEXT;
BEGIN
  SELECT string_agg(expected, ', ') INTO v_missing
  FROM unnest(ARRAY[
    'payment_method', 'completed_at',
    'purpose', 'plan_id', 'billing_interval'
  ]) AS expected
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = expected
  );

  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION '022: payments is missing the column(s): % (run migrations 019-021 first)', v_missing;
  END IF;
END $$;

COMMIT;
