-- Voice Callbacks Table
-- Tracks voice calls initiated from WhatsApp "Call me" requests

CREATE TABLE IF NOT EXISTS voice_callbacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES conversations(id) ON DELETE SET NULL,
  customer_phone text NOT NULL,
  voice_agent_id uuid REFERENCES voice_agents(id) ON DELETE SET NULL,
  retell_call_id text,
  twilio_call_id text,
  status text DEFAULT 'initiated',
  initiated_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  duration_seconds integer,
  recording_url text,
  transcript text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_voice_callbacks_tenant ON voice_callbacks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_voice_callbacks_conversation ON voice_callbacks(conversation_id);
CREATE INDEX IF NOT EXISTS idx_voice_callbacks_phone ON voice_callbacks(customer_phone);
CREATE INDEX IF NOT EXISTS idx_voice_callbacks_status ON voice_callbacks(status);

-- Add comment
COMMENT ON TABLE voice_callbacks IS 'Voice calls initiated from WhatsApp "Call me" requests';
