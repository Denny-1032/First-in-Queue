// Give every tenant with a voice agent its own Retell LLM, carrying that
// tenant's prompt and knowledge base, and re-point the tenant's existing agents
// at it.
//
//   node scripts/provision-tenant-llms.mjs            # all tenants with agents
//   node scripts/provision-tenant-llms.mjs ZRA Pacra  # only these tenants
//   node scripts/provision-tenant-llms.mjs --dry-run
//
// Why this exists: every agent used to point at one shared LLM (RETELL_LLM_ID).
// In Retell the LLM holds `general_prompt` AND the attached knowledge bases, so
// a shared LLM meant one prompt for everyone and every tenant's knowledge
// readable by every other tenant's agent. The prompt was additionally being sent
// on the agent object, which Retell silently drops - so the shared LLM's prompt
// was empty and voice ran ungrounded.
//
// Idempotent: a tenant that already has retell_llm_id keeps it, and its prompt
// and knowledge base are refreshed in place.
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import Retell from "retell-sdk";

for (const name of [".env.local", ".env"]) {
  const p = path.join(process.cwd(), name);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RETELL_API_KEY } = process.env;
if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !RETELL_API_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or RETELL_API_KEY");
  process.exit(1);
}

const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const only = args.filter((a) => !a.startsWith("--"));

// The landing-page demo and the FiQ support line run on this agent and still
// depend on the shared LLM. Re-pointing it here would change what the public
// demo says, so it is skipped until verified on its own.
const DEMO_AGENT_ID = process.env.RETELL_DEMO_AGENT_ID || "";

const db = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const retell = new Retell({ apiKey: RETELL_API_KEY });

const MAX_KB_TEXTS = 45;
const MAX_TEXT_CHARS = 20000;

/** Mirrors packBlocksIntoTexts() in src/lib/voice/retell-client.ts. */
function packBlocks(blocks) {
  const perText = Math.max(1, Math.ceil(blocks.length / MAX_KB_TEXTS));
  const texts = [];
  let current = [];
  const flush = () => {
    if (!current.length) return;
    texts.push({ title: `Knowledge ${texts.length + 1}`, text: current.join("\n\n") });
    current = [];
  };
  for (const b of blocks) {
    const chars = current.reduce((n, x) => n + x.length + 2, 0) + b.length;
    if (current.length >= perText || (current.length && chars > MAX_TEXT_CHARS)) flush();
    current.push(b);
  }
  flush();
  return texts;
}

function buildBlocks(config) {
  const blocks = [];
  if (config.description) blocks.push(`## Business Overview\n${config.description}`);
  for (const e of config.knowledge_base || []) {
    if (!e.content) continue;
    const kw = e.keywords?.length ? `\nKeywords: ${e.keywords.join(", ")}` : "";
    blocks.push(`## ${(e.topic || "General Information").slice(0, 100)}\n${e.content}${kw}`);
  }
  for (const f of config.faqs || []) {
    if (!f.question || !f.answer) continue;
    blocks.push(`## FAQ: ${f.question.slice(0, 90)}\nQuestion: ${f.question}\nAnswer: ${f.answer}`);
  }
  return blocks;
}

const { data: agents, error: agentsError } = await db
  .from("voice_agents")
  .select("id, name, tenant_id, retell_agent_id, retell_kb_id, is_active")
  .eq("is_active", true);
if (agentsError) {
  console.error(`Could not read voice_agents: ${agentsError.message}`);
  process.exit(1);
}

const { data: tenants, error: tenantsError } = await db
  .from("tenants")
  .select("id, name, config, retell_llm_id");
if (tenantsError) {
  // Most likely cause: migration 026 has not been applied, so retell_llm_id
  // does not exist yet. Exiting loudly beats printing "done" and changing
  // nothing, which is exactly what this script did before this check existed.
  console.error(`Could not read tenants: ${tenantsError.message}`);
  console.error("If this mentions retell_llm_id, apply supabase/migrations/026_tenant_retell_llm.sql first.");
  process.exit(1);
}
const tenantById = Object.fromEntries((tenants || []).map((t) => [t.id, t]));

const byTenant = new Map();
for (const a of agents || []) {
  if (!byTenant.has(a.tenant_id)) byTenant.set(a.tenant_id, []);
  byTenant.get(a.tenant_id).push(a);
}

for (const [tenantId, tenantAgents] of byTenant) {
  const tenant = tenantById[tenantId];
  if (!tenant) continue;
  if (only.length && !only.includes(tenant.name)) continue;

  console.log(`\n=== ${tenant.name} ===`);
  const config = tenant.config || {};

  // 1. The tenant's own LLM.
  let llmId = tenant.retell_llm_id;
  if (llmId) {
    console.log(`  llm            : reusing ${llmId}`);
  } else if (DRY) {
    console.log("  llm            : would create");
  } else {
    const llm = await retell.llm.create({});
    llmId = llm.llm_id;
    const { error } = await db.from("tenants").update({ retell_llm_id: llmId }).eq("id", tenantId);
    if (error) {
      console.error(`  FAILED to save llm id: ${error.message}`);
      continue;
    }
    console.log(`  llm            : created ${llmId}`);
  }

  // 2. Prompt onto the LLM - the step that was never happening.
  const prompt = tenantAgents[0]?.system_prompt || null;
  const { data: agentRow } = await db
    .from("voice_agents")
    .select("system_prompt")
    .eq("id", tenantAgents[0].id)
    .single();
  const systemPrompt = agentRow?.system_prompt || prompt;
  if (!systemPrompt) {
    console.log("  prompt         : SKIPPED - no stored system_prompt; save the agent in the dashboard");
  } else if (DRY) {
    console.log(`  prompt         : would push ${systemPrompt.length} chars`);
  } else {
    await retell.llm.update(llmId, { general_prompt: systemPrompt });
    console.log(`  prompt         : pushed ${systemPrompt.length} chars`);
  }

  // 3. Knowledge base, packed under Retell's 50-text limit.
  const blocks = buildBlocks(config);
  if (blocks.length === 0) {
    console.log("  knowledge base : none to sync");
  } else {
    const texts = packBlocks(blocks);
    if (DRY) {
      console.log(`  knowledge base : would create ${texts.length} texts from ${blocks.length} entries`);
    } else {
      const kb = await retell.knowledgeBase.create({
        knowledge_base_name: (tenant.name || "FiQ").slice(0, 40),
        knowledge_base_texts: texts,
      });
      // REPLACE - the LLM is this tenant's alone.
      await retell.llm.update(llmId, { knowledge_base_ids: [kb.knowledge_base_id] });
      for (const a of tenantAgents) {
        await db.from("voice_agents").update({ retell_kb_id: kb.knowledge_base_id }).eq("id", a.id);
      }
      console.log(`  knowledge base : ${kb.knowledge_base_id} (${texts.length} texts / ${blocks.length} entries)`);
    }
  }

  // 4. Point the tenant's agents at their own LLM.
  for (const a of tenantAgents) {
    if (DEMO_AGENT_ID && a.retell_agent_id === DEMO_AGENT_ID) {
      console.log(`  agent ${a.name}: SKIPPED (landing-page demo / support line)`);
      continue;
    }
    if (DRY) {
      console.log(`  agent ${a.name}: would re-point to ${llmId}`);
      continue;
    }
    await retell.agent.update(a.retell_agent_id, {
      response_engine: { type: "retell-llm", llm_id: llmId },
    });
    console.log(`  agent ${a.name}: -> ${llmId}`);
  }
}

console.log(DRY ? "\ndry run complete - nothing changed" : "\ndone");
