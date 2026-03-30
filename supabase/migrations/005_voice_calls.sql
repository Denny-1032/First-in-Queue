-- =============================================
-- 005: Voice Calls, Voice Agents, Scheduled Calls
-- =============================================

-- Voice agents (Retell AI agents linked to tenants)
CREATE TABLE IF NOT EXISTS voice_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  retell_agent_id TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT 'Default Voice Agent',
  voice_id TEXT,
  greeting_message TEXT DEFAULT 'Hello, thank you for calling. How can I help you today?',
  system_prompt TEXT,
  language TEXT DEFAULT 'en',
  max_call_duration_seconds INTEGER DEFAULT 600,
  transfer_phone_number TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_voice_agents_tenant ON voice_agents(tenant_id);
CREATE UNIQUE INDEX idx_voice_agents_retell ON voice_agents(retell_agent_id);

-- Voice calls log
CREATE TABLE IF NOT EXISTS voice_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  voice_agent_id UUID REFERENCES voice_agents(id) ON DELETE SET NULL,
  retell_call_id TEXT UNIQUE,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  caller_phone TEXT,
  callee_phone TEXT,
  status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'ongoing', 'ended', 'error')),
  duration_seconds INTEGER DEFAULT 0,
  recording_url TEXT,
  transcript TEXT,
  transcript_object JSONB,
  call_analysis JSONB,
  disconnection_reason TEXT,
  cost_cents INTEGER DEFAULT 0,
  latency_ms JSONB,
  metadata JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_voice_calls_tenant ON voice_calls(tenant_id);
CREATE INDEX idx_voice_calls_status ON voice_calls(tenant_id, status);
CREATE INDEX idx_voice_calls_created ON voice_calls(tenant_id, created_at DESC);
CREATE INDEX idx_voice_calls_retell ON voice_calls(retell_call_id);

-- Scheduled calls
CREATE TABLE IF NOT EXISTS scheduled_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  voice_agent_id UUID NOT NULL REFERENCES voice_agents(id) ON DELETE CASCADE,
  customer_phone TEXT NOT NULL,
  customer_name TEXT,
  purpose TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'calling', 'completed', 'failed', 'cancelled')),
  retell_call_id TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 2,
  result_summary TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_scheduled_calls_tenant ON scheduled_calls(tenant_id);
CREATE INDEX idx_scheduled_calls_due ON scheduled_calls(status, scheduled_at) WHERE status = 'pending';

-- Voice minutes tracking (per subscription period)
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS voice_minutes_used INTEGER DEFAULT 0;

-- RLS policies
ALTER TABLE voice_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can manage their voice agents"
  ON voice_agents FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY "Tenants can view their voice calls"
  ON voice_calls FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY "Tenants can manage their scheduled calls"
  ON scheduled_calls FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Service role bypass
CREATE POLICY "Service role full access to voice_agents"
  ON voice_agents FOR ALL
  USING (current_setting('role', true) = 'service_role');

CREATE POLICY "Service role full access to voice_calls"
  ON voice_calls FOR ALL
  USING (current_setting('role', true) = 'service_role');

CREATE POLICY "Service role full access to scheduled_calls"
  ON scheduled_calls FOR ALL
  USING (current_setting('role', true) = 'service_role');
