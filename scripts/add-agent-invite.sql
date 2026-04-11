-- Run this in Supabase SQL Editor to add invite support to agents table
ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS invite_token TEXT,
  ADD COLUMN IF NOT EXISTS invite_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invite_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS user_id TEXT;

CREATE INDEX IF NOT EXISTS idx_agents_invite_token ON agents(invite_token);
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id);
