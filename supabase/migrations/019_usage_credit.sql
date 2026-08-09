-- =============================================
-- 019: Usage credit and overage billing
-- ---------------------------------------------
-- From 1 October 2026 Meta charges per service message, and Retell already
-- charges per voice minute. Today there is no mechanism to recover either:
-- plan allowances simply stop the channel. This adds the prepaid credit that
-- funds usage past the allowance.
--
-- Money is held in NGWEE (integer). Never floating point - a rounding error in
-- a balance is a rounding error in someone's money. K1.70 is 170; K200 is
-- 20,000.
--
-- The LEDGER is the audit trail; the balance on usage_credits is a cache of it.
-- Every movement writes a credit_transactions row carrying the balance it
-- produced, so the balance can always be re-derived and reconciled.
--
-- Draw-downs are idempotent on (tenant, source, reference_id). Webhooks retry -
-- Retell's call_ended in particular - and charging a customer twice for one
-- call is the failure mode that costs trust rather than money.
--
-- Rates and pack sizes live in src/lib/credit/rates.ts, deliberately not here:
-- the WhatsApp rate is provisional until Meta publishes Rest-of-Africa pricing
-- on 1 September 2026 (docs/v2-implementation-plan.md §1.4), and a rate change
-- should not require a migration.
--
-- Safe to re-run.
-- =============================================

BEGIN;

-- --- Distinguish a credit top-up from a subscription payment ---------------
-- /api/payments/confirm activates a SUBSCRIPTION for every successful payment
-- and derives the plan from the amount. Without this column a K500 top-up
-- would be read as a plan purchase and silently change the tenant's plan.

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS purpose TEXT NOT NULL DEFAULT 'subscription';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payments_purpose_check'
  ) THEN
    ALTER TABLE payments
      ADD CONSTRAINT payments_purpose_check
      CHECK (purpose IN ('subscription', 'credit_topup'));
  END IF;
END $$;

-- --- Balance ---------------------------------------------------------------
-- One row per tenant. A cache of the ledger, kept correct by the RPCs below.

CREATE TABLE IF NOT EXISTS usage_credits (
  tenant_id                  UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  balance_ngwee              BIGINT NOT NULL DEFAULT 0 CHECK (balance_ngwee >= 0),
  auto_topup_enabled         BOOLEAN NOT NULL DEFAULT false,
  auto_topup_pack_ngwee      BIGINT,
  auto_topup_threshold_ngwee BIGINT NOT NULL DEFAULT 0,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --- Ledger ----------------------------------------------------------------
-- Immutable. amount_ngwee is signed: positive tops up, negative draws down.

CREATE TABLE IF NOT EXISTS credit_transactions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  amount_ngwee        BIGINT NOT NULL,
  balance_after_ngwee BIGINT NOT NULL,
  source              TEXT NOT NULL CHECK (source IN ('whatsapp_reply', 'voice_minute', 'topup', 'adjustment')),
  reference_type      TEXT,
  reference_id        TEXT,
  quantity            INTEGER,
  unit_price_ngwee    BIGINT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_tx_tenant_time
  ON credit_transactions(tenant_id, created_at DESC);

-- Idempotency key. A retried webhook or a replayed payment callback collides
-- here instead of charging or crediting twice.
CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_tx_reference
  ON credit_transactions(tenant_id, source, reference_id)
  WHERE reference_id IS NOT NULL;

-- The ledger is append-only. Corrections are made by writing an 'adjustment'
-- row, never by editing history.
CREATE OR REPLACE FUNCTION credit_transactions_immutable() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'credit_transactions is append-only; write an adjustment row instead';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS credit_transactions_no_update ON credit_transactions;
CREATE TRIGGER credit_transactions_no_update
  BEFORE UPDATE OR DELETE ON credit_transactions
  FOR EACH ROW EXECUTE FUNCTION credit_transactions_immutable();

-- --- RLS -------------------------------------------------------------------

ALTER TABLE usage_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'usage_credits' AND policyname = 'Service role full access') THEN
    CREATE POLICY "Service role full access" ON usage_credits FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'credit_transactions' AND policyname = 'Service role full access') THEN
    CREATE POLICY "Service role full access" ON credit_transactions FOR ALL USING (true);
  END IF;
END $$;

-- =============================================
-- Atomically draw down credit.
--
-- Returns one row:
--   allowed         - TRUE if the balance covered it (or it was already paid)
--   balance_ngwee   - balance after this call
--   already_charged - TRUE when this reference was charged by an earlier call
--
-- FAILS CLOSED: an insufficient balance returns FALSE and spends nothing. An
-- unrecoverable third-party bill is worse than a temporarily quiet channel.
-- Must be called BEFORE incurring the cost, except where the cost is only
-- known afterwards (voice minutes, which Retell reports on call_ended).
-- =============================================
CREATE OR REPLACE FUNCTION consume_credit(
  p_tenant_id        UUID,
  p_source           TEXT,
  p_amount_ngwee     BIGINT,
  p_reference_type   TEXT DEFAULT NULL,
  p_reference_id     TEXT DEFAULT NULL,
  p_quantity         INTEGER DEFAULT NULL,
  p_unit_price_ngwee BIGINT DEFAULT NULL
) RETURNS TABLE (allowed BOOLEAN, balance_ngwee BIGINT, already_charged BOOLEAN) AS $$
DECLARE
  v_balance BIGINT;
BEGIN
  IF p_amount_ngwee <= 0 THEN
    SELECT uc.balance_ngwee INTO v_balance FROM usage_credits uc WHERE uc.tenant_id = p_tenant_id;
    RETURN QUERY SELECT TRUE, COALESCE(v_balance, 0::BIGINT), FALSE;
    RETURN;
  END IF;

  -- Already charged for this reference: report success without spending again.
  IF p_reference_id IS NOT NULL THEN
    SELECT ct.balance_after_ngwee INTO v_balance
    FROM credit_transactions ct
    WHERE ct.tenant_id = p_tenant_id AND ct.source = p_source AND ct.reference_id = p_reference_id
    LIMIT 1;

    IF FOUND THEN
      RETURN QUERY SELECT TRUE, v_balance, TRUE;
      RETURN;
    END IF;
  END IF;

  INSERT INTO usage_credits (tenant_id) VALUES (p_tenant_id)
  ON CONFLICT (tenant_id) DO NOTHING;

  -- The balance guard lives in the WHERE, so two concurrent draw-downs cannot
  -- both pass a check that only one of them should.
  UPDATE usage_credits uc
  SET balance_ngwee = uc.balance_ngwee - p_amount_ngwee,
      updated_at    = now()
  WHERE uc.tenant_id = p_tenant_id
    AND uc.balance_ngwee >= p_amount_ngwee
  RETURNING uc.balance_ngwee INTO v_balance;

  IF NOT FOUND THEN
    SELECT uc.balance_ngwee INTO v_balance FROM usage_credits uc WHERE uc.tenant_id = p_tenant_id;
    RETURN QUERY SELECT FALSE, COALESCE(v_balance, 0::BIGINT), FALSE;
    RETURN;
  END IF;

  BEGIN
    INSERT INTO credit_transactions (
      tenant_id, amount_ngwee, balance_after_ngwee, source,
      reference_type, reference_id, quantity, unit_price_ngwee
    ) VALUES (
      p_tenant_id, -p_amount_ngwee, v_balance, p_source,
      p_reference_type, p_reference_id, p_quantity, p_unit_price_ngwee
    );
  EXCEPTION WHEN unique_violation THEN
    -- A concurrent call charged this same reference between our check and our
    -- insert. Give the money back and report the earlier charge.
    UPDATE usage_credits uc
    SET balance_ngwee = uc.balance_ngwee + p_amount_ngwee,
        updated_at    = now()
    WHERE uc.tenant_id = p_tenant_id
    RETURNING uc.balance_ngwee INTO v_balance;

    RETURN QUERY SELECT TRUE, v_balance, TRUE;
    RETURN;
  END;

  RETURN QUERY SELECT TRUE, v_balance, FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Add credit. Idempotent on (tenant, source, reference_id) so a replayed
-- payment callback cannot credit the same payment twice.
-- =============================================
CREATE OR REPLACE FUNCTION add_credit(
  p_tenant_id      UUID,
  p_amount_ngwee   BIGINT,
  p_source         TEXT DEFAULT 'topup',
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id   TEXT DEFAULT NULL
) RETURNS TABLE (balance_ngwee BIGINT, already_credited BOOLEAN) AS $$
DECLARE
  v_balance BIGINT;
BEGIN
  IF p_reference_id IS NOT NULL THEN
    SELECT ct.balance_after_ngwee INTO v_balance
    FROM credit_transactions ct
    WHERE ct.tenant_id = p_tenant_id AND ct.source = p_source AND ct.reference_id = p_reference_id
    LIMIT 1;

    IF FOUND THEN
      RETURN QUERY SELECT v_balance, TRUE;
      RETURN;
    END IF;
  END IF;

  INSERT INTO usage_credits (tenant_id, balance_ngwee)
  VALUES (p_tenant_id, GREATEST(p_amount_ngwee, 0))
  ON CONFLICT (tenant_id) DO UPDATE
    SET balance_ngwee = GREATEST(usage_credits.balance_ngwee + p_amount_ngwee, 0),
        updated_at    = now()
  RETURNING usage_credits.balance_ngwee INTO v_balance;

  BEGIN
    INSERT INTO credit_transactions (
      tenant_id, amount_ngwee, balance_after_ngwee, source, reference_type, reference_id
    ) VALUES (
      p_tenant_id, p_amount_ngwee, v_balance, p_source, p_reference_type, p_reference_id
    );
  EXCEPTION WHEN unique_violation THEN
    UPDATE usage_credits uc
    SET balance_ngwee = GREATEST(uc.balance_ngwee - p_amount_ngwee, 0),
        updated_at    = now()
    WHERE uc.tenant_id = p_tenant_id
    RETURNING uc.balance_ngwee INTO v_balance;

    RETURN QUERY SELECT v_balance, TRUE;
    RETURN;
  END;

  RETURN QUERY SELECT v_balance, FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
