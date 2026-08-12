import Retell from "retell-sdk";
import type { BusinessConfig } from "@/types";
import { nowInTimezone } from "@/lib/booking/availability";
import { isTemplateDescription } from "@/lib/config/templates";

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
 * Spoken before anything else on every call, inbound or outbound.
 *
 * Recording disclosure is a legal requirement in most of the jurisdictions we
 * operate in, and it only counts if the caller hears it before they say
 * anything. It therefore belongs in begin_message - not in the system prompt,
 * where the model may paraphrase it, bury it, or skip it entirely.
 */
export const RECORDING_NOTICE = "Please note that this call may be recorded for quality purposes.";

/** Prefix a greeting with the recording notice, without doubling it up. */
export function withRecordingNotice(greeting: string): string {
  const trimmed = greeting.trim();
  if (trimmed.toLowerCase().startsWith(RECORDING_NOTICE.slice(0, 30).toLowerCase())) {
    return trimmed;
  }
  return `${RECORDING_NOTICE} ${trimmed}`;
}

/**
 * Build a voice-optimised system prompt from BusinessConfig.
 * Similar to the WhatsApp AI prompt but adapted for phone conversations.
 */
export function buildVoiceSystemPrompt(config: BusinessConfig, transferNumber?: string | null): string {
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

  // The knowledge base is NOT inlined here. It is uploaded to Retell as a native
  // Knowledge Base (syncKnowledgeBaseToRetell) and attached to the LLM, so Retell
  // retrieves the relevant part per turn instead of us shipping every entry in a
  // static prompt - which does not fit once a tenant has a few hundred entries.
  //
  // Consequence worth remembering: if that sync fails, the agent has no knowledge
  // at all rather than a large prompt. The callers surface sync failures as
  // warnings for exactly that reason.
  const knowledgeBlock = config.knowledge_base.length > 0
    ? `\n\nKNOWLEDGE BASE: You have an attached knowledge base covering this organisation's services, fees and requirements. Search it before answering any factual question, and answer only from what it returns.`
    : "";

  // Drop a description the tenant never wrote. The seed sentence from the
  // industry template outranked the knowledge base in practice - the agent read
  // "an online store selling quality products" and answered as one, for a
  // companies registry whose entire knowledge base said otherwise.
  const descriptionBlock = isTemplateDescription(config.description)
    ? ""
    : `\n\nBUSINESS DESCRIPTION: ${config.description}`;

  const faqBlock = config.faqs.length > 0
    ? `\n\nFREQUENTLY ASKED QUESTIONS:\n${config.faqs.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n")}`
    : "";

  const bookingBlock = buildVoiceBookingPrompt(config);

  return `You are ${personality.name}, the AI phone assistant for ${config.business_name}.

ROLE: You are a dedicated customer care representative handling phone calls. Your ONLY purpose is to help customers of ${config.business_name} with their questions, issues, and needs.

GROUNDING: Everything you say about ${config.business_name} - what it does, what it charges, what it requires, how long it takes - must come from your attached knowledge base and the FAQs below. They are the only description of this organisation you have. Never infer what kind of business this is from its name or from anything else you know; if you cannot find the answer, say you do not have it and offer to put the caller through.${descriptionBlock}

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
6. Keep responses concise - callers prefer quick answers on the phone.
7. Confirm important details by repeating them back (phone numbers, names, dates).
8. End calls politely: summarise what was discussed and ask if there's anything else.
${transferNumber ? `9. When a caller needs urgent human assistance or explicitly asks to speak to a person: say "I'm going to transfer you to a team member now - please hold" and then trigger the transfer to ${transferNumber}.` : "9. If a caller needs to speak to a human, let them know a team member will contact them and collect their callback number."}${bookingBlock}`;
}

/**
 * Booking guidance appended to the voice prompt when the tenant has booking enabled.
 * Mirrors buildBookingPrompt in the chat engine but tuned for phone: relative dates
 * are resolved against "today" in the tenant timezone, and web callers (no caller ID)
 * are asked for a callback number before booking.
 */
function buildVoiceBookingPrompt(config: BusinessConfig): string {
  if (!config.booking_settings?.enabled) return "";

  const tz = config.operating_hours?.timezone;
  const now = nowInTimezone(tz);
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const weekday = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][now.getDay()];

  return `

APPOINTMENT BOOKING:
You can book, look up, reschedule, and cancel appointments for callers using your tools.
- Today is ${weekday}, ${todayStr}${tz ? ` (${tz})` : ""}. Resolve relative dates like "tomorrow" or "next Friday" to a concrete date yourself.
- ALWAYS call check_availability for the requested date before offering or confirming a time. Offer the caller real open slots - never invent availability.
- Only call create_booking AFTER the caller has agreed to a specific date and time you confirmed was available.
- Collect the caller's name for the booking. If this is a web/online call with no phone number, politely ask for a callback phone number and pass it as customer_phone - do not create the booking without one.
- To change or cancel, use find_my_bookings first to get the booking, then reschedule_booking or cancel_booking.
- After booking, read the date and time back to confirm, and let them know it's saved.`;
}

// =============================================
// Retell Booking Tools (custom functions)
// Registered once on the shared LLM; the /api/voice/tools endpoint does
// per-tenant resolution + gating, so a single registration serves all tenants.
// =============================================

const BOOKING_TYPE_ENUM = [
  "appointment", "reservation", "viewing", "consultation",
  "tour", "callback", "service", "custom",
];

function buildVoiceBookingToolDefs(url: string) {
  // Retell "custom" general_tools - mirror BOOKING_TOOLS in src/lib/ai/booking-tools.ts.
  const base = { type: "custom" as const, url, speak_during_execution: true, speak_after_execution: true };
  return [
    {
      ...base,
      name: "check_availability",
      description: "Get available appointment slots for a date. Always call this before proposing or confirming a time.",
      parameters: {
        type: "object",
        properties: { date: { type: "string", description: "Date to check, format YYYY-MM-DD" } },
        required: ["date"],
      },
    },
    {
      ...base,
      name: "create_booking",
      description: "Create an appointment after check_availability confirmed the slot is free and the caller agreed.",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "YYYY-MM-DD" },
          time: { type: "string", description: "24h HH:MM slot start time from check_availability" },
          customer_name: { type: "string", description: "Caller's name" },
          customer_phone: { type: "string", description: "Callback phone number - REQUIRED on web calls that have no caller ID" },
          booking_type: { type: "string", enum: BOOKING_TYPE_ENUM },
          notes: { type: "string", description: "Anything the business should know" },
        },
        required: ["date", "time"],
      },
    },
    {
      ...base,
      name: "find_my_bookings",
      description: "List the caller's upcoming bookings (needed to get a booking_id before rescheduling or cancelling).",
      parameters: {
        type: "object",
        properties: { customer_phone: { type: "string", description: "Callback number on web calls with no caller ID" } },
        required: [],
      },
    },
    {
      ...base,
      name: "reschedule_booking",
      description: "Move an existing booking to a new date/time. Get booking_id from find_my_bookings and confirm the new slot with check_availability first.",
      parameters: {
        type: "object",
        properties: {
          booking_id: { type: "string" },
          date: { type: "string", description: "New date YYYY-MM-DD" },
          time: { type: "string", description: "New time HH:MM" },
        },
        required: ["booking_id", "date", "time"],
      },
    },
    {
      ...base,
      name: "cancel_booking",
      description: "Cancel an existing booking. Get booking_id from find_my_bookings.",
      parameters: {
        type: "object",
        properties: { booking_id: { type: "string" }, reason: { type: "string" } },
        required: ["booking_id"],
      },
    },
  ];
}

/**
 * Register (or refresh) the booking custom functions on a Retell LLM. Idempotent -
 * llm.update patches only general_tools, leaving knowledge_base_ids etc. untouched.
 * No-op (logs a warning) if the tool endpoint secret/app URL are not configured.
 */
export async function registerBookingToolsOnLLM(llmId: string): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const secret = process.env.RETELL_FUNCTION_SECRET;
  if (!appUrl || !secret) {
    console.warn("[Retell Tools] NEXT_PUBLIC_APP_URL or RETELL_FUNCTION_SECRET not set - skipping booking tool registration");
    return;
  }
  const url = `${appUrl.replace(/\/$/, "")}/api/voice/tools?secret=${encodeURIComponent(secret)}`;
  const client = getRetellClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await client.llm.update(llmId, { general_tools: buildVoiceBookingToolDefs(url) } as any);
  console.log(`[Retell Tools] Registered ${buildVoiceBookingToolDefs(url).length} booking tools on LLM ${llmId}`);
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
    begin_message: withRecordingNotice(
      params.greeting || "Hello, thank you for calling. How can I help you today?"
    ),
    general_prompt: params.systemPrompt,
    max_call_duration_ms: (params.maxDurationSeconds || 300) * 1000,
    enable_backchannel: true,
    ...(params.transferNumber ? { transfer_list: { default: { number: params.transferNumber } } } : {}),
  };

  const agentResponse = await client.agent.create(createParams);

  // Ensure the shared LLM has the booking custom functions (idempotent, non-fatal).
  try {
    await registerBookingToolsOnLLM(llmId);
  } catch (err) {
    console.warn("[Retell] Booking tool registration failed (non-fatal):", err);
  }

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
    transferNumber?: string | null;
  }
) {
  const client = getRetellClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updatePayload: any = {};
  if (params.name) updatePayload.agent_name = params.name;
  if (params.systemPrompt) updatePayload.general_prompt = params.systemPrompt;
  if (params.voiceId) updatePayload.voice_id = params.voiceId;
  if (params.language) updatePayload.language = normalizeLanguage(params.language);
  if (params.greeting) updatePayload.begin_message = withRecordingNotice(params.greeting);
  if (params.maxDurationSeconds) updatePayload.max_call_duration_ms = params.maxDurationSeconds * 1000;
  if (params.transferNumber !== undefined) {
    updatePayload.transfer_list = params.transferNumber
      ? { default: { number: params.transferNumber } }
      : {};
  }

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

  // Keep booking custom functions registered whenever we sync (idempotent, non-fatal).
  try {
    await registerBookingToolsOnLLM(llmId);
  } catch (err) {
    console.warn(`[Retell KB Sync] Booking tool registration failed (non-fatal):`, err);
  }

  return { knowledgeBaseId: kbResponse.knowledge_base_id };
}
