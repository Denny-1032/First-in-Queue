-- Multi-tenancy: Allow users to belong to multiple tenants
-- Run this in Supabase SQL Editor BEFORE deploying the new code.

-- 1. Create the junction table
CREATE TABLE IF NOT EXISTS user_tenants (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'agent',  -- 'owner' | 'admin' | 'agent'
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_user_tenants_user   ON user_tenants(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tenants_tenant ON user_tenants(tenant_id);

-- 2. Migrate existing data: copy every users row into user_tenants
INSERT INTO user_tenants (user_id, tenant_id, role)
SELECT id, tenant_id, COALESCE(role, 'agent')
FROM users
WHERE tenant_id IS NOT NULL
ON CONFLICT (user_id, tenant_id) DO NOTHING;

-- 3. Keep users.tenant_id and users.role columns for now (backward compat).
--    They will be treated as the "last used" tenant going forward.
--    A future migration can drop them once the new code is stable:
--    ALTER TABLE users DROP COLUMN IF EXISTS tenant_id;
--    ALTER TABLE users DROP COLUMN IF EXISTS role;
