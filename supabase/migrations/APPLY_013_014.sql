-- =====================================================================
-- RUN THIS IN THE SUPABASE SQL EDITOR (prod)
-- Combined migrations 013 + 014. Idempotent — safe to re-run.
-- Run this BEFORE deploying the channel-refactor code, or every
-- message save will fail (saveMessage now writes channel +
-- external_message_id, which do not exist until 013 lands).
-- =====================================================================

BEGIN;

-- ============ 013: channel abstraction ============

ALTER TABLE tenants ALTER COLUMN whatsapp_phone_number_id DROP NOT NULL;
ALTER TABLE tenants ALTER COLUMN whatsapp_access_token   DROP NOT NULL;

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'whatsapp';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'conversations_channel_check') THEN
    ALTER TABLE conversations
      ADD CONSTRAINT conversations_channel_check CHECK (channel IN ('whatsapp', 'web'));
  END IF;
END $$;

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS customer_ref TEXT;
UPDATE conversations SET customer_ref = customer_phone WHERE customer_ref IS NULL;
ALTER TABLE conversations ALTER COLUMN customer_ref SET NOT NULL;
ALTER TABLE conversations ALTER COLUMN customer_phone DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_channel_ref
  ON conversations(tenant_id, channel, customer_ref);

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'whatsapp';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'messages_channel_check') THEN
    ALTER TABLE messages
      ADD CONSTRAINT messages_channel_check CHECK (channel IN ('whatsapp', 'web'));
  END IF;
END $$;

ALTER TABLE messages ADD COLUMN IF NOT EXISTS external_message_id TEXT;
UPDATE messages SET external_message_id = whatsapp_message_id WHERE external_message_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_messages_external_id ON messages(external_message_id);

-- ============ 014: properties ============

CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  widget_key TEXT UNIQUE NOT NULL,
  site_url TEXT,
  allowed_domains TEXT[] NOT NULL DEFAULT '{}',
  branding JSONB NOT NULL DEFAULT '{}'::jsonb,
  install_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (install_status IN ('pending', 'verified', 'stale')),
  first_seen_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_properties_tenant ON properties(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_properties_widget_key ON properties(widget_key);

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES properties(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_property ON conversations(property_id);

COMMIT;

-- =====================================================================
-- VERIFY — run this after. Expect 6 rows, and no NULL customer_ref.
-- =====================================================================
SELECT table_name, column_name, is_nullable
FROM information_schema.columns
WHERE (table_name = 'conversations' AND column_name IN ('channel', 'customer_ref', 'customer_phone', 'property_id'))
   OR (table_name = 'messages'      AND column_name IN ('channel', 'external_message_id'))
ORDER BY table_name, column_name;

SELECT
  (SELECT count(*) FROM conversations WHERE customer_ref IS NULL) AS conversations_missing_ref,
  (SELECT count(*) FROM properties)                               AS properties_rows;
