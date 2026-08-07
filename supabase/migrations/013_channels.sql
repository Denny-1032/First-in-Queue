-- =============================================
-- 013: Channel abstraction (WhatsApp + Web chat)
-- ---------------------------------------------
-- Makes tenants/conversations/messages channel-aware so a web-chat-only tenant
-- (no WhatsApp credentials, visitors with no phone number) is representable.
-- Purely additive + constraint-relaxing; existing WhatsApp rows are backfilled
-- to channel='whatsapp'. See docs/phase1-spec-widget-and-onboarding.md §2 (A5).
--
-- Safe to re-run: every statement is guarded. Wrapped in a transaction so a
-- partial failure rolls back cleanly rather than leaving a half-migrated schema.
-- =============================================

BEGIN;

-- --- 1.1: web-only tenants have no WhatsApp credentials ---
ALTER TABLE tenants ALTER COLUMN whatsapp_phone_number_id DROP NOT NULL;
ALTER TABLE tenants ALTER COLUMN whatsapp_access_token   DROP NOT NULL;

-- --- 1.2: conversations become channel-aware ---
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'whatsapp';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'conversations_channel_check'
  ) THEN
    ALTER TABLE conversations
      ADD CONSTRAINT conversations_channel_check
      CHECK (channel IN ('whatsapp', 'web'));
  END IF;
END $$;

-- Generic customer reference: phone number (WhatsApp) or visitor id (web).
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS customer_ref TEXT;
UPDATE conversations SET customer_ref = customer_phone WHERE customer_ref IS NULL;
ALTER TABLE conversations ALTER COLUMN customer_ref SET NOT NULL;

-- customer_phone is retained (dashboard/exports/analytics read it) but no longer
-- required, since web visitors have no phone.
ALTER TABLE conversations ALTER COLUMN customer_phone DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_channel_ref
  ON conversations(tenant_id, channel, customer_ref);

-- --- messages: generic external id alongside the WhatsApp-specific one ---
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'whatsapp';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'messages_channel_check'
  ) THEN
    ALTER TABLE messages
      ADD CONSTRAINT messages_channel_check
      CHECK (channel IN ('whatsapp', 'web'));
  END IF;
END $$;

ALTER TABLE messages ADD COLUMN IF NOT EXISTS external_message_id TEXT;
UPDATE messages
  SET external_message_id = whatsapp_message_id
  WHERE external_message_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_messages_external_id ON messages(external_message_id);

COMMIT;
