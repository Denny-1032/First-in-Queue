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
    max_call_duration_ms: (params.maxDurationSeconds || 600) * 1000,
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
