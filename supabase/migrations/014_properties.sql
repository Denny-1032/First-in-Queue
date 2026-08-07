-- =============================================
-- 014: Properties (the public installable surface)
-- ---------------------------------------------
-- A property = one installable website. It owns the public widget_key, branding,
-- and the allowed_domains security allowlist. A tenant owns one or more.
-- See docs/phase1-spec-widget-and-onboarding.md §3.
--
-- Safe to re-run. Requires 013 to have been applied first.
-- =============================================

BEGIN;

CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,

  -- Public identifier that sits in the customer's page source, e.g.
  -- 'fiq_live_a1b2c3...'. Rotatable; the old key is revoked with a grace window.
  widget_key TEXT UNIQUE NOT NULL,

  site_url TEXT,

  -- Security control, NOT a preference. Enforced server-side against the Origin
  -- header on every widget request. Empty array = deny all (never allow all).
  allowed_domains TEXT[] NOT NULL DEFAULT '{}',

  branding JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Install verification lifecycle (§5). 'stale' when last_seen_at ages out.
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

-- Link conversations to the property they originated from (web channel).
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES properties(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_property ON conversations(property_id);

COMMIT;
