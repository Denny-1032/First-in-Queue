-- =============================================
-- WAVELY - Phase 4: Scheduled Messages, Bookings, Lead Scores
-- =============================================

-- =============================================
-- SCHEDULED MESSAGES (reminders, follow-ups, campaigns)
-- =============================================
CREATE TABLE scheduled_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  customer_phone TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'template', 'interactive')),
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  category TEXT NOT NULL DEFAULT 'reminder' CHECK (category IN (
    'reminder',
    'follow_up',
    'appointment_reminder',
    'delivery_update',
    'booking_confirmation',
    'payment_reminder',
    'campaign',
    'reengagement',
    'custom'
  )),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_scheduled_pending ON scheduled_messages(status, scheduled_at)
  WHERE status = 'pending';
CREATE INDEX idx_scheduled_tenant ON scheduled_messages(tenant_id, status);
CREATE INDEX idx_scheduled_conversation ON scheduled_messages(conversation_id);
CREATE INDEX idx_scheduled_phone ON scheduled_messages(customer_phone, status);

-- =============================================
-- BOOKINGS (appointments, reservations, viewings)
-- =============================================
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  customer_phone TEXT NOT NULL,
  customer_name TEXT,
  booking_type TEXT NOT NULL CHECK (booking_type IN (
    'appointment',
    'reservation',
    'viewing',
    'consultation',
    'tour',
    'callback',
    'service',
    'custom'
  )),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'confirmed',
    'cancelled',
    'completed',
    'no_show',
    'rescheduled'
  )),
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  duration_minutes INTEGER,
  location TEXT,
  notes TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  reminder_sent BOOLEAN NOT NULL DEFAULT false,
  confirmed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bookings_tenant ON bookings(tenant_id, status);
CREATE INDEX idx_bookings_phone ON bookings(customer_phone);
CREATE INDEX idx_bookings_date ON bookings(tenant_id, scheduled_date, status);
CREATE INDEX idx_bookings_conversation ON bookings(conversation_id);
CREATE INDEX idx_bookings_upcoming ON bookings(tenant_id, scheduled_date, scheduled_time)
  WHERE status IN ('pending', 'confirmed');

-- =============================================
-- LEAD SCORES (real estate, sales qualification)
-- =============================================
CREATE TABLE lead_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  customer_phone TEXT NOT NULL,
  customer_name TEXT,
  score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  temperature TEXT NOT NULL DEFAULT 'cold' CHECK (temperature IN ('hot', 'warm', 'cold')),
  qualification_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  intent TEXT,
  budget_range TEXT,
  timeline TEXT,
  source TEXT,
  assigned_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  last_interaction_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  next_follow_up_at TIMESTAMPTZ,
  follow_up_count INTEGER NOT NULL DEFAULT 0,
  converted BOOLEAN NOT NULL DEFAULT false,
  converted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_leads_tenant ON lead_scores(tenant_id, temperature);
CREATE INDEX idx_leads_conversation ON lead_scores(conversation_id);
CREATE INDEX idx_leads_phone ON lead_scores(customer_phone);
CREATE INDEX idx_leads_hot ON lead_scores(tenant_id, score DESC)
  WHERE temperature = 'hot' AND converted = false;
CREATE INDEX idx_leads_follow_up ON lead_scores(tenant_id, next_follow_up_at)
  WHERE next_follow_up_at IS NOT NULL AND converted = false;

-- =============================================
-- TRIGGERS
-- =============================================
CREATE TRIGGER update_scheduled_messages_updated_at BEFORE UPDATE ON scheduled_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lead_scores_updated_at BEFORE UPDATE ON lead_scores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE scheduled_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON scheduled_messages FOR ALL USING (true);
CREATE POLICY "Service role full access" ON bookings FOR ALL USING (true);
CREATE POLICY "Service role full access" ON lead_scores FOR ALL USING (true);
