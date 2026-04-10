import Retell from "retell-sdk";
import type { BusinessConfig } from "@/types";

// =============================================
// Retell AI Voice Agent Client
// =============================================

let retellClient: Retell | null = null;

// Map short language codes to Retell-compatible locale codes
const RETELL_LANGUAGE_MAP: Record<string, string> = {
  en: "en-US",
  "en-GB": "en-GB",
  "en-US": "en-US",
  "en-IN": "en-IN",
  "en-AU": "en-AU",
  "en-NZ": "en-NZ",
  fr: "fr-FR",
  "fr-FR": "fr-FR",
  es: "es-ES",
  "es-ES": "es-ES",
  pt: "pt-PT",
  "pt-BR": "pt-BR",
  sw: "sw-KE",
  "sw-KE": "sw-KE",
  zu: "multi",
  ny: "multi",
  bem: "multi",
  de: "de-DE",
  "de-DE": "de-DE",
  ja: "ja-JP",
  "ja-JP": "ja-JP",
  "zh-CN": "zh-CN",
  multi: "multi",
};

function normalizeLanguage(lang: string): string {
  return RETELL_LANGUAGE_MAP[lang] || "en-US";
}

function getRetellClient(): Retell {
  if (!retellClient) {
    const apiKey = process.env.RETELL_API_KEY;
    if (!apiKey) {
      throw new Error("[Retell] RETELL_API_KEY is not configured");
    }
    retellClient = new Retell({ apiKey });
  }
  return retellClient;
}

/**
 * Build a voice-optimised system prompt from BusinessConfig.
 * Similar to the WhatsApp AI prompt but adapted for phone conversations.
 */
export function buildVoiceSystemPrompt(config: BusinessConfig): string {
  const personality = config.personality;
  const toneMap: Record<string, string> = {
    professional: "Maintain a professional, polished tone at all times.",
    friendly: "Be warm, approachable, and conversational.",
    casual: "Keep it relaxed and casual, like chatting with a friend.",
    formal: "Use formal language with proper etiquette.",
  };
  const styleMap: Record<string, string> = {
    concise: "Keep responses short and to the point. Maximum 2-3 sentences per turn.",
    detailed: "Provide thorough, detailed responses with all relevant information.",
    balanced: "Balance brevity with helpfulness. Be informative but not verbose.",
  };

  const knowledgeBlock = config.knowledge_base.length > 0
    ? `\n\nBUSINESS KNOWLEDGE BASE:\n${config.knowledge_base.map((k) => `- ${k.topic}: ${k.content}`).join("\n")}`
    : "";

  const faqBlock = config.faqs.length > 0
    ? `\n\nFREQUENTLY ASKED QUESTIONS:\n${config.faqs.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n")}`
    : "";

  return `You are ${personality.name}, the AI phone assistant for ${config.business_name}.

ROLE: You are a dedicated customer care representative handling phone calls. Your ONLY purpose is to help customers of ${config.business_name} with their questions, issues, and needs.

BUSINESS DESCRIPTION: ${config.description}

PERSONALITY & STYLE:
- ${toneMap[personality.tone] || toneMap.friendly}
- ${styleMap[personality.response_style] || styleMap.balanced}
- Speak naturally as if having a phone conversation. Use short sentences.
- Avoid jargon and spell out numbers clearly.

LANGUAGES: You can communicate in: ${config.languages.join(", ")}. Default: ${config.default_language}.
IMPORTANT: Always respond in the same language the caller is speaking. If they switch languages, switch with them.

${config.custom_instructions ? `SPECIAL INSTRUCTIONS:\n${config.custom_instructions}\n` : ""}
${knowledgeBlock}
${faqBlock}

PHONE CONVERSATION RULES:
1. Greet the caller warmly and introduce yourself as "${personality.name} from ${config.business_name}".
2. Listen carefully and confirm understanding before responding.
3. NEVER make up information about products, prices, policies, or services.
4. If you don't know the answer, say so honestly and offer to transfer to a human agent.
5. If the caller seems frustrated or requests a human, offer to transfer immediately.
6. Keep responses concise — callers prefer quick answers on the phone.
7. Confirm important details by repeating them back (phone numbers, names, dates).
8. End calls politely: summarise what was discussed and ask if there's anything else.`;
}

/**
 * Create a new voice agent in Retell AI.
 */
export async function createRetellAgent(params: {
  name: string;
  systemPrompt: string;
  voiceId?: string;
  language?: string;
  greeting?: string;
  maxDurationSeconds?: number;
  transferNumber?: string;
}) {
  const client = getRetellClient();

  const llmId = process.env.RETELL_LLM_ID;
  if (!llmId) {
    throw new Error("[Retell] RETELL_LLM_ID is not configured. Create an LLM in the Retell dashboard first.");
  }

  // The Retell REST API accepts fields like begin_message and general_prompt
  // that the SDK type definitions don't expose, so we cast to any.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createParams: any = {
    response_engine: {
      type: "retell-llm",
      llm_id: llmId,
    },
    voice_id: params.voiceId || "11labs-Adrian",
    agent_name: params.name,
    language: normalizeLanguage(params.language || "en-US"),
    begin_message: params.greeting || "Hello, thank you for calling. How can I help you today?",
    general_prompt: params.systemPrompt,
    max_call_duration_ms: (params.maxDurationSeconds || 300) * 1000,
    enable_backchannel: true,
  };

  const agentResponse = await client.agent.create(createParams);
  return agentResponse;
}

/**
 * Update an existing Retell AI agent.
 */
export async function updateRetellAgent(
  agentId: string,
  params: {
    name?: string;
    systemPrompt?: string;
    voiceId?: string;
    language?: string;
    greeting?: string;
    maxDurationSeconds?: number;
  }
) {
  const client = getRetellClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updatePayload: any = {};
  if (params.name) updatePayload.agent_name = params.name;
  if (params.systemPrompt) updatePayload.general_prompt = params.systemPrompt;
  if (params.voiceId) updatePayload.voice_id = params.voiceId;
  if (params.language) updatePayload.language = normalizeLanguage(params.language);
  if (params.greeting) updatePayload.begin_message = params.greeting;
  if (params.maxDurationSeconds) updatePayload.max_call_duration_ms = params.maxDurationSeconds * 1000;

  console.log(`[Retell] Updating agent ${agentId} with payload:`, {
    ...updatePayload,
    general_prompt: updatePayload.general_prompt ? `${updatePayload.general_prompt.slice(0, 100)}... (${updatePayload.general_prompt.length} chars)` : undefined
  });

  try {
    const agentResponse = await client.agent.update(agentId, updatePayload);
    console.log(`[Retell] Update successful for agent ${agentId}`);
    return agentResponse;
  } catch (error) {
    console.error(`[Retell] Update failed for agent ${agentId}:`, error);
    throw error;
  }
}

/**
 * Delete a Retell AI agent.
 */
export async function deleteRetellAgent(agentId: string) {
  const client = getRetellClient();
  await client.agent.delete(agentId);
}

/**
 * Get a Retell AI agent by ID.
 */
export async function getRetellAgent(agentId: string) {
  const client = getRetellClient();
  return await client.agent.retrieve(agentId);
}

/**
 * Make an outbound phone call via Retell AI.
 */
export async function makeOutboundCall(params: {
  fromNumber: string;
  toNumber: string;
  agentId?: string;
  metadata?: Record<string, string>;
  dynamicVariables?: Record<string, string>;
}) {
  const client = getRetellClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const callPayload: any = {
    from_number: params.fromNumber,
    to_number: params.toNumber,
  };

  if (params.agentId) {
    callPayload.override_agent_id = params.agentId;
  }
  if (params.metadata) {
    callPayload.metadata = params.metadata;
  }
  if (params.dynamicVariables) {
    callPayload.retell_llm_dynamic_variables = params.dynamicVariables;
  }

  const callResponse = await client.call.createPhoneCall(callPayload);
  return callResponse;
}

/**
 * Get call details from Retell AI.
 */
export async function getCallDetails(callId: string) {
  const client = getRetellClient();
  return await client.call.retrieve(callId);
}

/**
 * List calls from Retell AI with optional filters.
 */
export async function listRetellCalls(params?: {
  agentId?: string;
  limit?: number;
}) {
  const client = getRetellClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const listParams: any = {};
  if (params?.agentId) listParams.filter_criteria = { agent_id: [params.agentId] };
  if (params?.limit) listParams.limit = params.limit;

  return await client.call.list(listParams);
}

/**
 * List available voices from Retell AI.
 */
export async function listVoices() {
  const client = getRetellClient();
  return await client.voice.list();
}

// =============================================
// Retell Knowledge Base Management
// =============================================

/**
 * Create a Retell Knowledge Base from FiQ knowledge entries and FAQs.
 * Returns the knowledge_base_id which can then be attached to an LLM.
 */
export async function createRetellKnowledgeBase(params: {
  name: string;
  knowledgeBase: BusinessConfig["knowledge_base"];
  faqs: BusinessConfig["faqs"];
  businessDescription?: string;
}) {
  const client = getRetellClient();

  // Convert FiQ knowledge entries to Retell text items
  const texts: { title: string; text: string }[] = [];

  // Add business description as first entry if available
  if (params.businessDescription) {
    texts.push({
      title: "Business Overview",
      text: params.businessDescription,
    });
  }

  // Add knowledge base entries
  for (const entry of params.knowledgeBase) {
    if (!entry.content) continue;
    const title = (entry.topic || "General Information").slice(0, 100);
    const keywords = entry.keywords?.length ? `\nKeywords: ${entry.keywords.join(", ")}` : "";
    texts.push({
      title,
      text: `${entry.content}${keywords}`,
    });
  }

  // Add FAQs as text entries
  for (const faq of params.faqs) {
    if (!faq.question || !faq.answer) continue;
    texts.push({
      title: `FAQ: ${faq.question.slice(0, 90)}`,
      text: `Question: ${faq.question}\nAnswer: ${faq.answer}`,
    });
  }

  if (texts.length === 0) {
    throw new Error("No knowledge base content to sync. Add knowledge entries or FAQs first.");
  }

  // Retell KB name limit is 40 chars
  const kbName = params.name.slice(0, 40);

  console.log(`[Retell KB] Creating knowledge base "${kbName}" with ${texts.length} text entries`);

  const kbResponse = await client.knowledgeBase.create({
    knowledge_base_name: kbName,
    knowledge_base_texts: texts,
  });

  console.log(`[Retell KB] Created: ${kbResponse.knowledge_base_id} (status: ${kbResponse.status})`);
  return kbResponse;
}

/**
 * Delete a Retell Knowledge Base by ID.
 */
export async function deleteRetellKnowledgeBase(knowledgeBaseId: string) {
  const client = getRetellClient();
  console.log(`[Retell KB] Deleting knowledge base ${knowledgeBaseId}`);
  await client.knowledgeBase.delete(knowledgeBaseId);
}

/**
 * List all Retell Knowledge Bases.
 */
export async function listRetellKnowledgeBases() {
  const client = getRetellClient();
  return await client.knowledgeBase.list();
}

/**
 * Get a Retell Knowledge Base by ID.
 */
export async function getRetellKnowledgeBase(knowledgeBaseId: string) {
  const client = getRetellClient();
  return await client.knowledgeBase.retrieve(knowledgeBaseId);
}

/**
 * Attach knowledge base IDs to a Retell LLM so the agent can use RAG retrieval.
 */
export async function updateRetellLLMKnowledgeBase(llmId: string, knowledgeBaseIds: string[]) {
  const client = getRetellClient();
  console.log(`[Retell KB] Attaching KB IDs [${knowledgeBaseIds.join(", ")}] to LLM ${llmId}`);
  const response = await client.llm.update(llmId, {
    knowledge_base_ids: knowledgeBaseIds,
  });
  console.log(`[Retell KB] LLM updated successfully`);
  return response;
}

/**
 * Full sync: Create a new Retell KB from FiQ config, delete old one if it exists,
 * and attach the new KB to the Retell LLM.
 */
export async function syncKnowledgeBaseToRetell(params: {
  config: BusinessConfig;
  tenantName: string;
  existingKbId?: string | null;
}): Promise<{ knowledgeBaseId: string }> {
  const llmId = process.env.RETELL_LLM_ID;
  console.log(`[Retell KB Sync] Starting sync. LLM_ID: ${llmId ? 'set' : 'NOT SET'}`);
  
  if (!llmId) {
    throw new Error("RETELL_LLM_ID is not configured. Set it in your .env file.");
  }

  // Delete old KB if it exists
  if (params.existingKbId) {
    console.log(`[Retell KB Sync] Deleting old KB: ${params.existingKbId}`);
    try {
      await deleteRetellKnowledgeBase(params.existingKbId);
      console.log(`[Retell KB Sync] Old KB deleted successfully`);
    } catch (err) {
      console.warn(`[Retell KB Sync] Failed to delete old KB ${params.existingKbId}:`, err);
    }
  }

  // Create new KB with current FiQ content
  console.log(`[Retell KB Sync] Creating new KB for tenant: ${params.tenantName}`);
  let kbResponse;
  try {
    kbResponse = await createRetellKnowledgeBase({
      name: params.tenantName,
      knowledgeBase: params.config.knowledge_base,
      faqs: params.config.faqs,
      businessDescription: params.config.description,
    });
    console.log(`[Retell KB Sync] KB created: ${kbResponse.knowledge_base_id}`);
  } catch (err) {
    console.error(`[Retell KB Sync] KB creation failed:`, err);
    throw new Error(`Failed to create Knowledge Base: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Get any existing KB IDs on the LLM so we don't remove other tenants' KBs
  let existingKbIds: string[] = [];
  try {
    console.log(`[Retell KB Sync] Retrieving current LLM config: ${llmId}`);
    const llm = await getRetellClient().llm.retrieve(llmId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    existingKbIds = ((llm as any).knowledge_base_ids || []).filter(
      (id: string) => id !== params.existingKbId
    );
    console.log(`[Retell KB Sync] Current LLM has ${existingKbIds.length} other KBs`);
  } catch (err) {
    console.warn(`[Retell KB Sync] Could not retrieve LLM config:`, err);
    // If we can't retrieve, just use the new KB alone
  }

  // Attach new KB to LLM
  const allKbIds = [...existingKbIds, kbResponse.knowledge_base_id];
  console.log(`[Retell KB Sync] Attaching ${allKbIds.length} KBs to LLM: ${allKbIds.join(', ')}`);
  
  try {
    await updateRetellLLMKnowledgeBase(llmId, allKbIds);
    console.log(`[Retell KB Sync] LLM updated successfully`);
  } catch (err) {
    console.error(`[Retell KB Sync] LLM update failed:`, err);
    throw new Error(`Failed to attach KB to LLM: ${err instanceof Error ? err.message : String(err)}`);
  }

  return { knowledgeBaseId: kbResponse.knowledge_base_id };
}
