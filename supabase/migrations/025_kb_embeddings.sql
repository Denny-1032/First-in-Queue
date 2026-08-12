-- =============================================
-- 025: Knowledge base embeddings (chat retrieval)
-- ---------------------------------------------
-- buildSystemPrompt() concatenates EVERY knowledge entry into the system prompt
-- on every single message - there is no selection step - so a tenant with 171
-- entries pays ~17k tokens per reply regardless of what was asked, and the
-- knowledge base can never grow past what fits in a prompt.
--
-- This table is a derived SEARCH INDEX, not storage. `tenants.config.knowledge_base`
-- remains the source of truth: the dashboard, the JSON upload and every existing
-- save path keep writing there untouched, and src/lib/ai/kb-index.ts mirrors the
-- entries here with their embeddings. A row here can always be rebuilt from config;
-- config can never be rebuilt from here.
--
-- RLS is enabled with NO policy, deliberately. Every read and write goes through
-- the service role (server-side only), which bypasses RLS. Adding a permissive
-- `USING (true)` policy would hand the public anon key every tenant's knowledge
-- base - the exact shape of exposure migration 016 had to undo. Do not add one.
--
-- Safe to re-run.
-- =============================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS kb_entries (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  -- The id of the entry inside config.knowledge_base. Lets the sync diff by
  -- entry rather than dropping and re-embedding the whole base on every save.
  entry_id    text NOT NULL,
  topic       text NOT NULL DEFAULT '',
  content     text NOT NULL,
  -- sha256 of topic+content. Unchanged hash => skip the embedding call.
  content_hash text NOT NULL,
  embedding   vector(1536) NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT kb_entries_tenant_entry_unique UNIQUE (tenant_id, entry_id)
);

CREATE INDEX IF NOT EXISTS kb_entries_tenant_idx ON kb_entries (tenant_id);

-- HNSW over cosine distance. The embeddings are normalised by OpenAI, so cosine
-- and inner product rank identically; cosine keeps the similarity readable.
CREATE INDEX IF NOT EXISTS kb_entries_embedding_idx
  ON kb_entries USING hnsw (embedding vector_cosine_ops);

ALTER TABLE kb_entries ENABLE ROW LEVEL SECURITY;

-- Nearest neighbours for one tenant. Scoped by tenant_id inside the function so
-- a caller cannot read across tenants by omitting a filter.
CREATE OR REPLACE FUNCTION match_kb_entries(
  p_tenant_id uuid,
  p_query     vector(1536),
  p_limit     int DEFAULT 8
)
RETURNS TABLE (
  entry_id   text,
  topic      text,
  content    text,
  similarity float
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    e.entry_id,
    e.topic,
    e.content,
    1 - (e.embedding <=> p_query) AS similarity
  FROM kb_entries e
  WHERE e.tenant_id = p_tenant_id
  ORDER BY e.embedding <=> p_query
  LIMIT GREATEST(p_limit, 1);
$$;

COMMIT;
