-- =============================================
-- USERS (Business owners / dashboard users)
-- =============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Trigger
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Service role full access'
  ) THEN
    CREATE POLICY "Service role full access" ON users FOR ALL USING (true);
  END IF;
END $$;

-- =============================================
-- ATOMIC MESSAGE COUNTER (for plan limit enforcement)
-- =============================================
CREATE OR REPLACE FUNCTION increment_messages_used(p_tenant_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE subscriptions
  SET messages_used = messages_used + 1
  WHERE tenant_id = p_tenant_id
    AND status IN ('active', 'trialing');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
