-- =============================================
-- SUBSCRIPTIONS & PAYMENTS (Lipila Integration)
-- =============================================

-- Subscription plans reference
CREATE TABLE subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price_zmw DECIMAL(10,2) NOT NULL DEFAULT 0,
  messages_per_month INTEGER NOT NULL DEFAULT 100,
  whatsapp_numbers INTEGER NOT NULL DEFAULT 1,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed the plans
INSERT INTO subscription_plans (id, name, price_zmw, messages_per_month, whatsapp_numbers, features, sort_order) VALUES
  ('free', 'Free', 0, 100, 1, '["AI-powered responses","Basic analytics","Email support","1 language"]'::jsonb, 0),
  ('starter', 'Starter', 499, 1000, 1, '["Everything in Free","Multi-language support (40+)","Conversation flows","Priority email support"]'::jsonb, 1),
  ('growth', 'Growth', 1299, 5000, 2, '["Everything in Starter","Advanced analytics","Human handoff","Dedicated onboarding","Phone support"]'::jsonb, 2),
  ('enterprise', 'Enterprise', 0, 999999, 99, '["Everything in Growth","Unlimited messages","Custom AI training","SLA guarantee","Dedicated account manager","Custom integrations"]'::jsonb, 3);

-- Tenant subscriptions
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trialing', 'past_due', 'cancelled', 'expired')),
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  messages_used INTEGER NOT NULL DEFAULT 0,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_subscriptions_tenant ON subscriptions(tenant_id) WHERE status IN ('active', 'trialing');
CREATE INDEX idx_subscriptions_plan ON subscriptions(plan_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_period_end ON subscriptions(current_period_end);

-- Payment transactions (Lipila)
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  lipila_reference_id TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ZMW',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'successful', 'failed', 'cancelled')),
  payment_type TEXT CHECK (payment_type IN ('AirtelMoney', 'MtnMoney', 'ZamtelKwacha', 'Card')),
  account_number TEXT,
  narration TEXT,
  lipila_identifier TEXT,
  lipila_external_id TEXT,
  callback_data JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_tenant ON payments(tenant_id);
CREATE INDEX idx_payments_reference ON payments(lipila_reference_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_subscription ON payments(subscription_id);

-- Triggers
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON subscription_plans FOR ALL USING (true);
CREATE POLICY "Service role full access" ON subscriptions FOR ALL USING (true);
CREATE POLICY "Service role full access" ON payments FOR ALL USING (true);
