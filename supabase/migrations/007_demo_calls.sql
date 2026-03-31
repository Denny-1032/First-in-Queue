-- Track demo calls for rate limiting and analytics
CREATE TABLE IF NOT EXISTS demo_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'initiated', -- initiated, completed, failed
  twilio_call_sid TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for rate limiting
CREATE INDEX IF NOT EXISTS idx_demo_calls_ip_created ON demo_calls(ip_address, created_at);

-- Index for phone number lookups
CREATE INDEX IF NOT EXISTS idx_demo_calls_phone ON demo_calls(phone_number);

-- RLS (not strictly necessary for demo calls, but good practice)
ALTER TABLE demo_calls ENABLE ROW LEVEL SECURITY;

-- No policies needed - demo calls are anonymous
