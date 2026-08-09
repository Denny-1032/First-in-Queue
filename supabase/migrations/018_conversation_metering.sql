-- =============================================
-- 018: Meter conversations, not messages
-- ---------------------------------------------
-- Plans advertise "1,000 WhatsApp conversations/month", but the meter behind
-- that number - increment_messages_used() - fires once per inbound MESSAGE.
-- A customer who buys 1,000 conversations is cut off after 1,000 messages.
-- Production traffic averages well above one reply per conversation
-- (docs/v2-implementation-plan.md §1.5), so the meter is materially stingier
-- than the label.
--
-- The conversation window is aligned to WhatsApp's own 24-hour customer-service
-- window. That is the unit Meta bills against from 1 October 2026, so the meter
-- and the cost driver end up the same shape. A conversation is counted once
-- when its window opens; every further message inside that window is free.
--
-- messages_used keeps incrementing in parallel. It is no longer the gate, but
-- running both meters over at least one billing cycle is how §1.5 gets an
-- honest replies-per-conversation figure from real traffic.
--
-- Pattern follows 015_widget_usage_and_limits.sql: one atomic RPC, fails
-- closed, rolls back its own increment when it lands over the cap.
--
-- Safe to re-run.
-- =============================================

BEGIN;

-- --- The meter -------------------------------------------------------------
-- Lives alongside messages_used on the subscription, so it shares the billing
-- period lifecycle already in place (a new period row starts at zero).

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS conversations_used INTEGER NOT NULL DEFAULT 0;

-- --- Open windows ----------------------------------------------------------
-- One row per (tenant, channel, customer). The row is overwritten each time a
-- new window opens; no history is kept here because the count itself lives on
-- the subscription. `channel` is part of the key so a customer who uses both
-- the web widget and WhatsApp does not have one channel suppress the other.

CREATE TABLE IF NOT EXISTS conversation_windows (
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  channel      TEXT NOT NULL,
  customer_ref TEXT NOT NULL,
  opened_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, channel, customer_ref)
);

CREATE INDEX IF NOT EXISTS idx_conversation_windows_expiry
  ON conversation_windows(expires_at);

ALTER TABLE conversation_windows ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'conversation_windows' AND policyname = 'Service role full access'
  ) THEN
    CREATE POLICY "Service role full access" ON conversation_windows FOR ALL USING (true);
  END IF;
END $$;

-- =============================================
-- Atomically consume one conversation against the tenant's monthly allowance.
--
-- Returns one row:
--   allowed      - TRUE if the message may be answered
--   used         - conversations_used after this call
--   window_open  - TRUE when an existing 24h window absorbed this message,
--                  i.e. nothing was charged
--
-- Must be called BEFORE sending, never after.
--
-- The window is NOT extended by later messages. It runs 24 hours from the
-- moment it opened, matching how Meta bills a customer-service window: one
-- charge per window, regardless of how many messages travel inside it.
-- =============================================
CREATE OR REPLACE FUNCTION consume_conversation(
  p_tenant_id     UUID,
  p_channel       TEXT,
  p_customer_ref  TEXT,
  p_limit         INTEGER,
  p_window_hours  INTEGER DEFAULT 24
) RETURNS TABLE (allowed BOOLEAN, used INTEGER, window_open BOOLEAN) AS $$
DECLARE
  v_opened BOOLEAN := FALSE;
  v_sub_id UUID;
  v_used   INTEGER;
BEGIN
  -- Open a window, but only if there is not already a live one. The WHERE on
  -- the DO UPDATE is what makes this atomic: when the existing row is still
  -- live the update is suppressed and no row comes back, which is precisely
  -- the "inside an existing window" signal. Two concurrent inbound messages
  -- can therefore never both open a window and double-charge.
  INSERT INTO conversation_windows (tenant_id, channel, customer_ref, opened_at, expires_at)
  VALUES (p_tenant_id, p_channel, p_customer_ref, now(), now() + make_interval(hours => p_window_hours))
  ON CONFLICT (tenant_id, channel, customer_ref) DO UPDATE
    SET opened_at  = now(),
        expires_at = now() + make_interval(hours => p_window_hours)
    WHERE conversation_windows.expires_at <= now()
  RETURNING TRUE INTO v_opened;

  -- Newest active/trialing row, matching the targeting fixed in migration 012.
  SELECT id, conversations_used INTO v_sub_id, v_used
  FROM subscriptions
  WHERE tenant_id = p_tenant_id
    AND status IN ('active', 'trialing')
  ORDER BY created_at DESC
  LIMIT 1;

  -- No subscription at all: fail closed. The caller provisions Free and retries.
  IF v_sub_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, FALSE;
    RETURN;
  END IF;

  -- Inside a live window - free, and the allowance is untouched.
  IF NOT COALESCE(v_opened, FALSE) THEN
    RETURN QUERY SELECT TRUE, v_used, TRUE;
    RETURN;
  END IF;

  UPDATE subscriptions
  SET conversations_used = conversations_used + 1
  WHERE id = v_sub_id
  RETURNING conversations_used INTO v_used;

  IF v_used > p_limit THEN
    -- Over the cap: undo both halves of this call. The window row is pushed
    -- back into the past rather than deleted, which is the same end state as
    -- before (it was either absent or already expired) and keeps the row
    -- available for reuse.
    UPDATE subscriptions
    SET conversations_used = conversations_used - 1
    WHERE id = v_sub_id
    RETURNING conversations_used INTO v_used;

    UPDATE conversation_windows
    SET expires_at = now() - interval '1 second'
    WHERE tenant_id = p_tenant_id AND channel = p_channel AND customer_ref = p_customer_ref;

    RETURN QUERY SELECT FALSE, v_used, FALSE;
    RETURN;
  END IF;

  RETURN QUERY SELECT TRUE, v_used, FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Housekeeping: drop windows that closed long ago. Nothing depends on them
-- once they are expired - the count lives on the subscription.
CREATE OR REPLACE FUNCTION purge_conversation_windows() RETURNS void AS $$
  DELETE FROM conversation_windows WHERE expires_at < now() - interval '7 days';
$$ LANGUAGE sql;

COMMIT;
