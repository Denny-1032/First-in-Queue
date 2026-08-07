-- =============================================
-- 015: Durable widget rate limits + AI usage ceiling
-- ---------------------------------------------
-- The in-memory limiter in src/lib/api/rate-limit.ts does not survive
-- serverless instance recycling, so it cannot enforce a spend ceiling. These
-- tables make both the burst limits and the per-property monthly AI cap
-- durable and atomic.
--
-- See docs/phase1-spec-widget-and-onboarding.md §6 and
--     docs/pricing-model-v2.md §4.3 (free tier = 500 AI replies/month).
--
-- Safe to re-run.
-- =============================================

BEGIN;

-- --- Short-window burst buckets (per visitor token, per IP, per property) ---
CREATE TABLE IF NOT EXISTS widget_rate_buckets (
  bucket_key  TEXT PRIMARY KEY,
  count       INTEGER NOT NULL DEFAULT 0,
  expires_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_widget_rate_buckets_expiry
  ON widget_rate_buckets(expires_at);

-- --- Monthly AI reply counter, per property ---
CREATE TABLE IF NOT EXISTS widget_usage (
  property_id  UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  ai_replies   INTEGER NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (property_id, period_start)
);

-- =============================================
-- Atomic bump-and-check for a burst bucket.
-- Returns TRUE when the request is allowed.
-- =============================================
CREATE OR REPLACE FUNCTION widget_bump_rate(
  p_key     TEXT,
  p_limit   INTEGER,
  p_window_seconds INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
BEGIN
  INSERT INTO widget_rate_buckets (bucket_key, count, expires_at)
  VALUES (p_key, 1, now() + make_interval(secs => p_window_seconds))
  ON CONFLICT (bucket_key) DO UPDATE
    SET count = CASE
          WHEN widget_rate_buckets.expires_at < now() THEN 1
          ELSE widget_rate_buckets.count + 1
        END,
        expires_at = CASE
          WHEN widget_rate_buckets.expires_at < now()
            THEN now() + make_interval(secs => p_window_seconds)
          ELSE widget_rate_buckets.expires_at
        END
  RETURNING count INTO v_count;

  RETURN v_count <= p_limit;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Atomically consume one AI reply against a property's monthly ceiling.
-- Returns TRUE if it was within the cap (and counted), FALSE if the cap is
-- already reached — in which case nothing is consumed.
--
-- Must be called BEFORE the model request, never after.
-- =============================================
CREATE OR REPLACE FUNCTION widget_consume_ai_reply(
  p_property_id UUID,
  p_limit       INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_period DATE := date_trunc('month', now())::date;
  v_count  INTEGER;
BEGIN
  INSERT INTO widget_usage (property_id, period_start, ai_replies, updated_at)
  VALUES (p_property_id, v_period, 1, now())
  ON CONFLICT (property_id, period_start) DO UPDATE
    SET ai_replies = widget_usage.ai_replies + 1,
        updated_at = now()
  RETURNING ai_replies INTO v_count;

  IF v_count > p_limit THEN
    -- Roll back this increment so a blocked request doesn't inflate the counter.
    UPDATE widget_usage
      SET ai_replies = ai_replies - 1
      WHERE property_id = p_property_id AND period_start = v_period;
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Housekeeping: drop expired buckets.
CREATE OR REPLACE FUNCTION widget_purge_rate_buckets() RETURNS void AS $$
  DELETE FROM widget_rate_buckets WHERE expires_at < now() - interval '1 hour';
$$ LANGUAGE sql;

COMMIT;
