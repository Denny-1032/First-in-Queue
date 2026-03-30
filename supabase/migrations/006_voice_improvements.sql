-- =============================================
-- 006: Voice Improvements
-- Atomic voice minute increment, updated_at on voice_calls
-- =============================================

-- Atomic increment function for voice minutes (prevents race conditions)
CREATE OR REPLACE FUNCTION increment_voice_minutes(p_tenant_id UUID, p_minutes INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE subscriptions
  SET voice_minutes_used = COALESCE(voice_minutes_used, 0) + p_minutes
  WHERE id = (
    SELECT id FROM subscriptions
    WHERE tenant_id = p_tenant_id
      AND status IN ('active', 'trialing')
    ORDER BY created_at DESC
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add updated_at to voice_calls for state change tracking
ALTER TABLE voice_calls ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
