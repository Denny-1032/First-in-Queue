-- =============================================
-- FIX: message counter must target ONE subscription row
-- =============================================
-- A tenant can accumulate more than one active/trialing subscription row
-- (e.g. an expired paid plan lazily-marked plus a new free row). The old
-- increment_messages_used() updated EVERY active/trialing row for the tenant,
-- while the read path (checkMessageUsage / /api/subscriptions) reads only the
-- newest row. That mismatch let counters drift and, combined with a bare
-- .single() on the read side, surfaced as a bogus "0 messages" plan limit.
-- Target the single newest subscription row instead.

CREATE OR REPLACE FUNCTION increment_messages_used(p_tenant_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE subscriptions
  SET messages_used = messages_used + 1
  WHERE id = (
    SELECT id FROM subscriptions
    WHERE tenant_id = p_tenant_id
      AND status IN ('active', 'trialing')
    ORDER BY created_at DESC
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
