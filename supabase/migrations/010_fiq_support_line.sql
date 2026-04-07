-- FiQ Support Line Configuration
-- Stores the dedicated phone number and voice agent for FiQ customer support

CREATE TABLE IF NOT EXISTS fiq_support_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  support_phone_number text UNIQUE, -- E.164 format: +260xxxxxxxxx
  voice_agent_id uuid REFERENCES voice_agents(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Call logs for FiQ support line
CREATE TABLE IF NOT EXISTS fiq_support_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id text NOT NULL,
  status text,
  caller_number text,
  recording_url text,
  transcript text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_fiq_support_phone ON fiq_support_config(support_phone_number);
CREATE INDEX IF NOT EXISTS idx_fiq_support_calls_id ON fiq_support_calls(call_id);
CREATE INDEX IF NOT EXISTS idx_fiq_support_calls_created ON fiq_support_calls(created_at DESC);

-- Insert default inactive config
INSERT INTO fiq_support_config (support_phone_number, is_active)
VALUES (NULL, false)
ON CONFLICT DO NOTHING;
