-- =============================================
-- 023: Saved payment methods
-- ---------------------------------------------
-- Lets a tenant pay again without retyping their details.
--
-- WHAT THIS TABLE DOES NOT HOLD: card numbers, expiry dates, CVVs, or any
-- token that could be replayed to charge a card. Lipila's collections API has
-- no vault endpoint — the card is entered on their hosted checkout every time,
-- and the only thing they key a collection off is the payer's contact details.
-- So what is saved here is exactly what the checkout form asks for: the method,
-- the phone number, the email and the name on the receipt. Anything more would
-- put us in PCI scope for no gain.
--
-- Practically that means:
--   * mobile money  -> one tap re-sends the prompt to the same number
--   * card          -> the form is prefilled, the card is still entered on the
--                      bank's page
--
-- Safe to re-run.
-- =============================================

BEGIN;

CREATE TABLE IF NOT EXISTS saved_payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  method TEXT NOT NULL CHECK (method IN ('mobile_money', 'card')),
  -- What Lipila resolved the number to, when we know it (AirtelMoney /
  -- MtnMoney / ZamtelKwacha). Null until a payment on this method succeeds.
  payment_type TEXT CHECK (payment_type IN ('AirtelMoney', 'MtnMoney', 'ZamtelKwacha', 'Card')),
  phone_number TEXT NOT NULL,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per (tenant, method, number): saving the same details twice should
-- update the existing entry, not litter the picker with duplicates. This is the
-- conflict target the API's upsert relies on.
CREATE UNIQUE INDEX IF NOT EXISTS idx_saved_pm_unique
  ON saved_payment_methods(tenant_id, method, phone_number);

CREATE INDEX IF NOT EXISTS idx_saved_pm_tenant
  ON saved_payment_methods(tenant_id, last_used_at DESC NULLS LAST);

-- At most one default per tenant.
CREATE UNIQUE INDEX IF NOT EXISTS idx_saved_pm_one_default
  ON saved_payment_methods(tenant_id) WHERE is_default;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_saved_payment_methods_updated_at'
  ) THEN
    CREATE TRIGGER update_saved_payment_methods_updated_at
      BEFORE UPDATE ON saved_payment_methods
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- RLS on with NO policies: default-deny for anon/authenticated. The API routes
-- use the service role, which bypasses RLS. Do not add a `USING (true)` policy
-- here — that is what migration 016 had to clean up across every other table.
ALTER TABLE saved_payment_methods ENABLE ROW LEVEL SECURITY;

COMMIT;
