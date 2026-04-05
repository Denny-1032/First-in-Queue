-- Add retell_kb_id column to voice_agents to track the Retell Knowledge Base
-- associated with each voice agent for sync purposes.
ALTER TABLE voice_agents
  ADD COLUMN IF NOT EXISTS retell_kb_id text;
