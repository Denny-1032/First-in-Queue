-- =============================================
-- 026: One Retell LLM per tenant
-- ---------------------------------------------
-- In Retell, the LLM - not the agent - carries the system prompt
-- (`general_prompt`) and the attached knowledge bases. The agent holds only
-- voice, language, greeting and transfer settings.
--
-- Every agent used to point at one shared LLM from RETELL_LLM_ID, which meant:
--
--   * one prompt for every tenant, and
--   * `syncKnowledgeBaseToRetell` accumulating each tenant's knowledge base onto
--     the same LLM - so a companies registry's agent could retrieve a tax
--     authority's material.
--
-- The prompt was also being sent on the AGENT object, where Retell silently
-- drops it (agents have no `general_prompt` field), so the shared LLM's prompt
-- was empty and every voice agent ran ungrounded.
--
-- The LLM is therefore per tenant: it is the thing that holds what the tenant
-- knows and how it speaks, and sharing it shares both.
--
-- Safe to re-run.
-- =============================================

BEGIN;

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS retell_llm_id text;

COMMENT ON COLUMN tenants.retell_llm_id IS
  'Retell LLM dedicated to this tenant. Holds the voice system prompt and the tenant''s knowledge base. Provisioned by ensureTenantLlm(); never shared between tenants.';

COMMIT;
