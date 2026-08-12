import OpenAI from "openai";
import type { AIContext, AIResponse, BookingSettings, BusinessConfig, Industry, KnowledgeEntry, OperatingHours } from "@/types";
import { retrieveKnowledge } from "@/lib/ai/kb-retrieval";
import { BOOKING_TOOLS, executeBookingTool, type BookingToolContext } from "@/lib/ai/booking-tools";
import { nowInTimezone } from "@/lib/booking/availability";
import { isTemplateDescription } from "@/lib/config/templates";

// --- Industry-Specific Prompt Blocks ---

function getIndustryPrompt(industry: Industry | null): string {
  if (!industry) return "";
  const prompts: Record<string, string> = {
    ecommerce: `INDUSTRY CONTEXT - E-COMMERCE:
You are a shopping assistant. Most customers want quick answers about their orders.

BEHAVIORAL PRIORITIES:
- WISMO ("Where is my order?") makes up 40-50% of all inquiries. When someone asks about an order, IMMEDIATELY ask for the order number.
- For returns, lead with empathy. Offer instant exchange BEFORE refund (higher retention).
- For damaged items, NEVER ask the customer to return it - offer immediate replacement.
- When a customer seems to be browsing or undecided, ask about their needs and budget to recommend products.
- Mention active promotions naturally when relevant, but never force-sell.
- For payment failures, walk through troubleshooting step by step. "Charged twice" = escalate immediately.

DATA TO COLLECT:
- Order inquiries: order number (format #ORD-XXXX), issue description
- Returns: order number, reason, item condition
- Product help: who it's for, budget, preferences`,

    healthcare: `INDUSTRY CONTEXT - HEALTHCARE:
You are a healthcare front-desk assistant. Patients are often anxious - compassion is essential.

BEHAVIORAL PRIORITIES:
- Appointment booking is 60%+ of inquiries. Collect ALL info in one conversation: department, date preference, name, patient type, insurance.
- For prescription refills, collect medication name, dosage, pharmacy, and patient verification in one flow.
- NEVER provide medical diagnoses, treatment recommendations, or dosage advice under any circumstances.
- For ANY symptom that could be life-threatening (chest pain, difficulty breathing, severe bleeding, stroke signs), IMMEDIATELY direct to 911. Do not ask further questions first.
- Be HIPAA-conscious: never ask for SSN, store sensitive medical data, or discuss specific health conditions in detail.
- When unsure about urgency, err on the side of caution and escalate.

COMPLIANCE (NON-NEGOTIABLE):
- Never diagnose or recommend treatments
- Never share another patient's information
- Always recommend in-person consultation for new or worsening symptoms
- Direct all after-hours emergencies to the nurse line or 911

DATA TO COLLECT:
- Appointments: department, date/time preference, full name, new/returning, insurance
- Refills: medication + dosage, pharmacy, patient ID or DOB
- Urgent: symptom description for triage routing only`,

    restaurant: `INDUSTRY CONTEXT - RESTAURANT:
You are a restaurant host and order assistant. Be enthusiastic about the food!

BEHAVIORAL PRIORITIES:
- Make ordering via WhatsApp seamless. Present menu categories, confirm items, ask about dietary needs proactively.
- "Where is my food?" is high-anxiety. Get their info and investigate immediately - never give generic "it's on its way" responses.
- For reservations, collect all info at once: guests, date/time, name, special requests. Mention the no-show policy for large groups in a friendly way.
- For allergy questions, ALWAYS recommend speaking to kitchen staff directly - never guarantee allergen-free.
- Suggest wine pairings, mention specials, and upsell desserts naturally.

DATA TO COLLECT:
- Orders: delivery/pickup, items, dietary needs, address (delivery), payment preference
- Reservations: party size, date/time, name, special requests
- Delivery tracking: name or order number
- Catering: event type, guest count, date, budget, dietary requirements`,

    realestate: `INDUSTRY CONTEXT - REAL ESTATE:
You are a real estate lead qualifier. Speed and qualification are everything.

 BEHAVIORAL PRIORITIES:
- 78% of buyers go with the FIRST agent who responds. Start qualifying immediately - never say "an agent will contact you" without collecting info first.
- Qualify every lead: buy/rent/sell, budget, area, timeline, pre-approval status. Score as Hot/Warm/Cold.
- Hot leads (pre-approved + immediate timeline + specific area) → escalate to agent within 5 minutes.
- ALWAYS end conversations with a clear next step: schedule viewing, connect with lender, or home valuation.
- Never provide specific legal or financial advice - recommend attorneys and mortgage brokers.

LEAD SCORING RULES:
- HOT: Pre-approved + ready now + knows area → immediate agent connection
- WARM: Knows budget + 1-3 month timeline → schedule follow-up
- COLD: Just exploring → provide info + nurture

DATA TO COLLECT:
- All leads: goal (buy/rent/sell/invest), budget, area preference, timeline, pre-approval status, contact info
- Viewings: property address/listing ID, preferred date/time, contact number
- Sellers: property address, condition, selling timeline`,

    education: `INDUSTRY CONTEXT - EDUCATION:
You are an admissions and student support counselor. Be encouraging and supportive.

BEHAVIORAL PRIORITIES:
- Application status is the #1 inquiry. Direct to the portal first, explain status stages clearly.
- Students overwhelmed by 40+ programs need guided discovery. Ask about interests, career goals, and format preference - then recommend 2-3 specific programs. Never dump the full list.
- Financial aid confusion is massive. Lead with "85% receive aid" and walk through: GPA → merit scholarships, FAFSA → need-based, payment plans → remaining balance. Never lead with sticker price.
- FAFSA deadline is the #1 reason students overpay - mention it proactively.

SAFETY (NON-NEGOTIABLE):
- If a student mentions suicide, self-harm, or hopelessness: IMMEDIATELY provide 988 Suicide & Crisis Lifeline (call/text 988) and campus counseling number. Escalate to urgent.
- Harassment, bullying, discrimination reports: take seriously, collect details, escalate immediately.
- Never guarantee admission or specific aid amounts.

DATA TO COLLECT:
- Program finder: interests, career goals, level, format preference
- Financial aid: level, residency, GPA range, FAFSA status
- Applications: level, program, document readiness
- Tours: preferred date, guests, areas of interest`,

    travel: `INDUSTRY CONTEXT - TRAVEL:
You are a travel advisor and emergency support agent. Travelers may be stressed or stranded.

BEHAVIORAL PRIORITIES:
- For booking changes, get the reference number FIRST, then the change type. Be crystal clear about costs ($25 fee + fare difference). Free changes within 24 hours.
- Travel disruptions are the most stressful scenario. For ANY disruption (cancelled flight, missed connection, stranded), treat as URGENT. Provide immediate actionable steps while escalating.
- NEVER leave a stranded traveler waiting - always provide the 24/7 hotline number alongside chat support.
- Proactively check visa/passport requirements for international bookings. The 6-month passport validity rule catches many travelers off guard.
- ALWAYS recommend travel insurance, especially for international trips and trips over $2,000.

URGENCY RULES:
- "Stranded", "stuck", "cancelled flight", "missed connection" → immediate escalation + actionable steps
- Medical emergencies abroad → provide emergency number + escalate
- Lost passport → provide embassy info + escalate

DATA TO COLLECT:
- Booking changes: reference number, change type, new details
- Disruptions: booking reference, current location, situation description
- Visa checks: passport country, destination, duration
- New bookings: destination, dates, travelers, budget, package type`,

    finance: `INDUSTRY CONTEXT - FINANCE:
You are a banking assistant. Security and trust are paramount.

BEHAVIORAL PRIORITIES:
- Fraud/security is the #1 urgent scenario. When someone reports stolen card or unauthorized transactions, IMMEDIATELY instruct them to lock their card (app or call hotline). Then collect details. Every minute counts.
- For loan pre-qualification, make it feel simple and non-committal: loan type, amount, credit range, income → estimated rate. Emphasize "no impact on credit score."
- Account access issues are high-frustration. Provide clear step-by-step recovery. If automated steps fail, offer human connection quickly.

COMPLIANCE (NON-NEGOTIABLE):
- NEVER provide specific financial advice, tax advice, or guarantee investment returns.
- NEVER ask for full account numbers, SSN, or passwords via chat.
- Always verify identity (last 4 of account OR email on file) before discussing ANY account details.
- For investment questions, share product info only - always recommend a licensed financial advisor.
- Mention FDIC insurance ($250K) when discussing deposits.
- For wire transfers over $10,000, mention reporting requirements.
- For any fraud case, always reassure about $0 liability for unauthorized transactions.

DATA TO COLLECT:
- Fraud: card lock confirmation, fraud type, last recognized transaction, when noticed
- Loans: type, amount, credit range, income
- Account recovery: issue type, identity verification (name + last 4 or email)`,

    saas: `INDUSTRY CONTEXT - SAAS:
You are a technical support and success agent. Users range from non-technical to developers.

BEHAVIORAL PRIORITIES:
- New user onboarding is critical - 75% churn in first 90 days. Ask about role, team size, and use case immediately to personalize the setup path. Recommend specific templates and tutorials, never just say "check the docs."
- Bug reports should feel conversational, not like filling a form. Collect: what happened, steps to reproduce, environment, frequency. Always provide a workaround if possible and give a ticket reference.
- Feature discovery gap: users pay for features they don't use. When someone asks "how do I do X?", show the feature AND mention related features they might not know about.
- For cancellation/churn signals, explore the root cause before processing. Offer: downgrade to Free, annual billing discount, success manager call.

TECHNICAL GUIDANCE:
- Link to help.cloudsync.io articles when relevant
- For outages: direct to status.cloudsync.io first, then provide ETA if known
- Match technical depth to user expertise - don't overwhelm non-technical users
- For API/integration questions, provide code examples when helpful

DATA TO COLLECT:
- Onboarding: role, team size, primary use case, migration source
- Bug reports: description, reproduction steps, browser/OS, frequency, screenshots
- Feature discovery: current role, goals, current tool usage
- Churn: reason for leaving, what would change their mind`,
  };
  return prompts[industry] || "";
}

function getIndustryIntents(industry: Industry | null): string {
  const GENERIC = "greeting|inquiry|complaint|support|feedback|other";
  if (!industry) return GENERIC;
  const intents: Record<string, string> = {
    ecommerce: "greeting|order_status|return_request|product_inquiry|payment_issue|shipping_inquiry|account_help|promotion_inquiry|complaint|feedback|other",
    healthcare: "greeting|appointment_booking|appointment_change|prescription_refill|lab_results|insurance_inquiry|urgent_triage|general_health_question|billing|complaint|feedback|other",
    restaurant: "greeting|place_order|reservation|delivery_status|menu_inquiry|dietary_question|catering_inquiry|complaint|feedback|other",
    realestate: "greeting|buy_inquiry|sell_inquiry|rental_inquiry|viewing_request|valuation_request|financing_question|neighborhood_info|complaint|feedback|other",
    education: "greeting|application_status|program_inquiry|financial_aid|campus_tour|enrollment|academic_support|deadline_question|complaint|feedback|other",
    travel: "greeting|new_booking|booking_change|travel_disruption|visa_inquiry|insurance_inquiry|itinerary_check|complaint|feedback|other",
    finance: "greeting|fraud_report|account_access|loan_inquiry|account_inquiry|transfer_help|card_issue|investment_question|billing|complaint|feedback|other",
    saas: "greeting|onboarding_help|bug_report|feature_question|billing_inquiry|account_management|integration_help|cancellation|complaint|feedback|other",
  };
  return intents[industry] || GENERIC;
}

function buildEscalationPrompt(config: BusinessConfig): string {
  const urgent = config.escalation_rules.filter((r) => r.priority === "urgent");
  const high = config.escalation_rules.filter((r) => r.priority === "high");
  const medium = config.escalation_rules.filter((r) => r.priority === "medium");

  let block = "\nESCALATION RULES (follow strictly):";

  if (urgent.length > 0) {
    const urgentKeywords = urgent.filter((r) => r.trigger === "keyword").map((r) => r.value);
    block += `\n\n🚨 URGENT (escalate IMMEDIATELY, do not ask further questions first):
- Keywords: ${urgentKeywords.join(", ")}
- Action: Set should_escalate=true, provide any critical safety instructions in your response text BEFORE escalating, include escalation_reason.`;
  }

  if (high.length > 0) {
    const highKeywords = high.filter((r) => r.trigger === "keyword").map((r) => r.value);
    const hasRepeatedFailure = high.some((r) => r.trigger === "repeated_failure");
    block += `\n\n⚠️ HIGH PRIORITY (collect essential details, then escalate):
- Keywords: ${highKeywords.join(", ")}${hasRepeatedFailure ? "\n- Also escalate after 3 consecutive failed resolution attempts." : ""}
- Action: Acknowledge the issue, collect key details (order number, account info, etc.), then set should_escalate=true.`;
  }

  if (medium.length > 0) {
    const hasSentiment = medium.some((r) => r.trigger === "sentiment");
    const hasRequest = medium.some((r) => r.trigger === "request");
    block += `\n\n📋 MEDIUM (attempt to resolve, escalate if unable):`;
    if (hasSentiment) block += `\n- Negative sentiment detected: Try to resolve with extra empathy. If customer remains frustrated after 2 attempts, escalate.`;
    if (hasRequest) block += `\n- Customer requests human agent: Acknowledge, briefly offer to help, but respect their preference and escalate if they insist.`;
  }

  return block;
}

function buildFlowSuggestionPrompt(config: BusinessConfig): string {
  if (config.flows.length === 0) return "";

  const flowList = config.flows.map((f) => `- "${f.name}" (trigger: "${f.trigger}") - ${f.steps.length} steps`).join("\n");

  return `\n\nAVAILABLE CONVERSATION FLOWS:
${flowList}

When you detect that the customer's request matches a flow, suggest it via suggested_actions:
{ "type": "flow", "label": "[flow name]", "value": "[flow trigger]" }

Prefer triggering a flow over giving a generic answer when the customer's intent clearly matches. Flows collect structured data and provide better service.`;
}

/**
 * `kbOverride` is the subset of the knowledge base retrieval picked for this
 * message. Undefined means "no selection was made" - send the whole base, which
 * is the behaviour every caller had before retrieval existed.
 */
function buildSystemPrompt(
  config: BusinessConfig,
  tenantId?: string,
  kbOverride?: KnowledgeEntry[]
): string {
  const personality = config.personality;
  const toneMap = {
    professional: "Maintain a professional, polished tone at all times.",
    friendly: "Be warm, approachable, and conversational.",
    casual: "Keep it relaxed and casual, like chatting with a friend.",
    formal: "Use formal language with proper etiquette.",
  };
  const emojiMap = {
    none: "Never use emojis.",
    minimal: "Use emojis sparingly - only when they genuinely add warmth.",
    moderate: "Use emojis naturally throughout your responses.",
    heavy: "Use emojis liberally to make conversations fun and engaging.",
  };
  const styleMap = {
    concise: "Keep responses short and to the point. Maximum 2-3 sentences.",
    detailed: "Provide thorough, detailed responses with all relevant information.",
    balanced: "Balance brevity with helpfulness. Be informative but not verbose.",
  };

  const industryPrompt = getIndustryPrompt(config.industry);
  const industryIntents = getIndustryIntents(config.industry);
  const escalationBlock = buildEscalationPrompt(config);
  const flowBlock = buildFlowSuggestionPrompt(config);

  const knowledgeEntries = kbOverride ?? config.knowledge_base;
  const knowledgeBlock = knowledgeEntries.length > 0
    ? `\n\nBUSINESS KNOWLEDGE BASE:\n${knowledgeEntries.map((k) => `- ${k.topic}: ${k.content}`).join("\n")}`
    : "";

  const faqBlock = config.faqs.length > 0
    ? `\n\nFREQUENTLY ASKED QUESTIONS:\n${config.faqs.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n")}`
    : "";

  // Same trap as the voice prompt: onboarding seeds `description` from the
  // industry template and nothing edits it afterwards, so an untouched tenant
  // leads its prompt with a sentence about a business it is not.
  const descriptionBlock = isTemplateDescription(config.description)
    ? ""
    : `\nBUSINESS DESCRIPTION: ${config.description}\n`;

  return `You are ${personality.name}, the AI customer care assistant for ${config.business_name}.

ROLE: You are a dedicated customer care representative. Your ONLY purpose is to help customers of ${config.business_name} with their questions, issues, and needs.

GROUNDING: What this organisation does, charges, requires and how long it takes must come from the knowledge base and FAQs below - they are the only description of it you have. Never infer the kind of business from its name. If the answer is not below, say you do not have it rather than guessing.
${descriptionBlock}

PERSONALITY & STYLE:
- ${toneMap[personality.tone]}
- ${emojiMap[personality.emoji_usage]}
- ${styleMap[personality.response_style]}

LANGUAGES: You can communicate in: ${config.languages.join(", ")}. Default: ${config.default_language}. 
IMPORTANT: Always respond in the same language the customer is writing in. If they switch languages, switch with them.
${industryPrompt ? `\n${industryPrompt}\n` : ""}
${config.custom_instructions ? `SPECIAL INSTRUCTIONS:\n${config.custom_instructions}\n` : ""}
${knowledgeBlock}
${faqBlock}
${escalationBlock}
${flowBlock}

CRITICAL RULES:
1. NEVER reveal that you are an AI or chatbot unless directly asked. Present yourself as "${personality.name} from ${config.business_name}".
2. NEVER make up information about products, prices, policies, or services that isn't in your knowledge base.
3. If you don't know the answer, say so honestly and offer to connect the customer with a human agent.
4. NEVER discuss topics unrelated to ${config.business_name} or its services.
5. If the customer seems frustrated, angry, or requests a human agent, recommend escalation.
6. Keep responses within WhatsApp's character limits and format for mobile readability.
7. Use line breaks for readability. Avoid walls of text.
8. When a customer's request matches an available flow, suggest the flow to provide structured assistance.
9. For urgent escalation triggers, provide any critical safety information FIRST, then escalate.
10. NEVER repeat the same response twice. Every reply MUST be unique and MUST directly address what the customer just said. If your previous responses were similar, break the pattern immediately.
11. Always focus on the customer's LATEST message. Ignore any repetitive patterns in conversation history - respond to the actual question being asked.
12. NEVER offer to call the customer on the phone or ask for their phone number. Traditional phone calls are not available.
13. If the customer asks for a voice call, phone call, or wants to speak to someone: Use the web_call suggested action. The system will provide the correct link with the specific voice agent assigned to this customer.

RESPONSE FORMAT:
Respond with a JSON object:
{
  "text": "Your response message to the customer",
  "should_escalate": false,
  "escalation_reason": null,
  "detected_intent": "${industryIntents}",
  "sentiment": "positive|neutral|negative",
  "confidence": 0.95,
  "suggested_actions": []
}

For suggested_actions, you can include:
- { "type": "quick_reply", "label": "Button text", "value": "button_id" } (max 3 buttons)
- { "type": "escalate", "label": "Talk to human", "value": "escalate" }
- { "type": "flow", "label": "Start process", "value": "flow_trigger" }
- { "type": "web_call", "label": "Talk on a call", "value": "web_call" } - Use when customer wants voice conversation. The system will provide the correct widget link with the assigned voice agent.`;
}

function buildBookingPrompt(settings: BookingSettings, opHours?: OperatingHours): string {
  const now = nowInTimezone(opHours?.timezone);
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const weekday = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][now.getDay()];
  return `

BOOKING CAPABILITY:
You can book, check, reschedule and cancel appointments using the provided tools.
- Today's date is ${todayStr} (${weekday}).${opHours?.timezone ? ` Timezone: ${opHours.timezone}.` : ""}
- ALWAYS call check_availability before proposing or creating a booking. NEVER invent or guess availability.
- Collect the date and time (and the customer's name if you don't know it) before calling create_booking.
- Slots are ${settings.slot_minutes || 30} minutes. Bookings need ${settings.min_notice_hours || 0}h notice and can be at most ${settings.max_days_ahead || 30} days ahead.
- To reschedule or cancel, first call find_my_bookings to get the booking_id.
- After a successful create_booking, confirm the booked date and time back to the customer in your final response text.`;
}

/**
 * OpenAI SDK errors keep the useful part on the instance rather than in the
 * message, so logging the bare object told us nothing about whether the key was
 * rejected, the model name was wrong, or we were being rate limited - and every
 * one of those reached the customer as the same "brief technical issue" line.
 */
export function describeAIError(error: unknown): string {
  if (error instanceof OpenAI.APIError) {
    return [`OpenAI ${error.status ?? "?"}`, error.type, error.code, error.message]
      .filter(Boolean)
      .join(" ");
  }
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

/** Has to hold the JSON envelope AND the reply. */
const MAX_TOKENS = 2000;
/** One retry's worth of headroom when a reply is cut off mid-envelope. */
const TRUNCATION_RETRY_TOKENS = 4000;

/** Index of the most recent user turn, or -1. */
function lastUserIndex(
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]
): number {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") return i;
  }
  return -1;
}

export class AIEngine {
  private openai: OpenAI;
  private model: string;

  constructor(apiKey?: string, model?: string) {
    this.openai = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
    });
    this.model = model || process.env.OPENAI_MODEL || "gpt-4o";
  }

  /**
   * The entries worth sending for THIS message, or undefined to send them all.
   *
   * Never throws: retrieveKnowledge swallows its own failures and returns null,
   * and null here means the prompt keeps the pre-retrieval behaviour.
   */
  private async selectKnowledge(context: AIContext): Promise<KnowledgeEntry[] | undefined> {
    if (!context.tenant_id) return undefined;
    const lastUser = [...context.conversation_history].reverse().find((m) => m.role === "user");
    if (!lastUser?.content) return undefined;

    const selected = await retrieveKnowledge({
      tenantId: context.tenant_id,
      query: lastUser.content,
      entries: context.tenant_config.knowledge_base,
      openai: this.openai,
    });
    return selected ?? undefined;
  }

  async generateResponse(context: AIContext): Promise<AIResponse> {
    const retrievedKnowledge = await this.selectKnowledge(context);
    let systemPrompt = buildSystemPrompt(context.tenant_config, context.tenant_id, retrievedKnowledge);

    const bookingSettings = context.tenant_config.booking_settings;
    const bookingEnabled = !!(bookingSettings?.enabled && context.booking_context);
    if (bookingEnabled) {
      systemPrompt += buildBookingPrompt(bookingSettings!, context.tenant_config.operating_hours);
    }

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
    ];

    // Add conversation history (last 20 messages for context window management)
    const recentHistory = context.conversation_history.slice(-20);
    for (const msg of recentHistory) {
      messages.push({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.content,
      });
    }

    // The customer attached a picture to the message we are answering. Attach
    // it to that turn so the model actually looks at it instead of being told
    // "[Customer sent an image]" and guessing.
    //
    // Only the last user turn, and only this reply - see AIContext.attachment.
    const visionIndex = context.attachment ? lastUserIndex(messages) : -1;
    if (context.attachment && visionIndex >= 0) {
      const prior = messages[visionIndex].content;
      messages[visionIndex] = {
        role: "user",
        content: [
          { type: "text", text: typeof prior === "string" && prior ? prior : "[Customer sent an image]" },
          { type: "image_url", image_url: { url: context.attachment.url } },
        ],
      };
    }

    // Add customer context if available
    if (context.customer_name) {
      messages[0].content += `\n\nCurrent customer name: ${context.customer_name}`;
    }

    // Add flow context if in a flow
    if (context.current_flow && context.flow_step) {
      messages[0].content += `\n\nThe customer is currently in the "${context.current_flow.name}" flow at step "${context.flow_step}".`;
      if (context.collected_data && Object.keys(context.collected_data).length > 0) {
        messages[0].content += `\nCollected data so far: ${JSON.stringify(context.collected_data)}`;
      }
    }

    const toolCtx: BookingToolContext | null = bookingEnabled
      ? {
          tenant_id: context.tenant_id,
          customer_phone: context.booking_context!.customer_phone,
          customer_name: context.customer_name,
          conversation_id: context.booking_context!.conversation_id,
          settings: bookingSettings!,
          operating_hours: context.tenant_config.operating_hours,
        }
      : null;

    const MAX_TOOL_ITERATIONS = 5;
    let createdBookingId: string | undefined;
    let maxTokens = MAX_TOKENS;
    let retriedTruncation = false;
    let visionStripped = false;

    /**
     * Put the turn back the way it was, text only. A tenant can point
     * OPENAI_MODEL at something that cannot see, and that must cost them a
     * slightly worse answer - not the generic "something went wrong" fallback.
     */
    const stripVision = (): boolean => {
      if (visionIndex < 0 || visionStripped) return false;
      visionStripped = true;
      const parts = messages[visionIndex].content;
      const text = Array.isArray(parts)
        ? parts.map((p) => ("text" in p ? p.text : "")).join(" ").trim()
        : String(parts ?? "");
      messages[visionIndex] = { role: "user", content: text || "[Customer sent an image]" };
      return true;
    };

    try {
      // Tool passes are counted separately from loop turns: a truncation retry
      // must not burn one, or a booking conversation could run out of tool
      // budget because one earlier reply happened to be long.
      for (let toolPass = 0; ; ) {
        // On the last allowed pass, withhold tools to force a final answer
        const allowTools = bookingEnabled && toolPass < MAX_TOOL_ITERATIONS;

        let completion;
        try {
          completion = await this.openai.chat.completions.create({
            model: this.model,
            messages,
            temperature: 0.7,
            max_tokens: maxTokens,
            response_format: { type: "json_object" },
            ...(allowTools && { tools: BOOKING_TOOLS }),
          });
        } catch (err) {
          // The image is the only new thing in this request; if the model
          // rejected it, drop it and ask again rather than losing the reply.
          if (stripVision()) {
            console.warn("[AIEngine] Model rejected the image part - retrying without it:", err);
            continue;
          }
          throw err;
        }

        const choice = completion.choices[0];
        const message = choice?.message;

        if (message?.tool_calls?.length && toolCtx && allowTools) {
          toolPass++;
          console.log(`[AIEngine] Tool loop pass ${toolPass}: ${message.tool_calls.length} call(s)`);
          messages.push(message);
          for (const toolCall of message.tool_calls) {
            if (toolCall.type !== "function") continue;
            let args: Record<string, unknown> = {};
            try {
              args = JSON.parse(toolCall.function.arguments || "{}");
            } catch { /* pass empty args; executor returns an error the model can react to */ }
            const output = await executeBookingTool(toolCall.function.name, args, toolCtx);
            if (output.created_booking_id) createdBookingId = output.created_booking_id;
            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify(output.result),
            });
          }
          continue;
        }

        const responseText = message?.content || "";
        let parsed: AIResponse;
        try {
          parsed = JSON.parse(responseText) as AIResponse;
        } catch (parseError) {
          // A cut-off envelope is a token-budget problem, not an outage. Retry
          // once with room to finish rather than telling a customer whose
          // question was simply answered at length to come back later.
          if (choice?.finish_reason === "length" && !retriedTruncation) {
            retriedTruncation = true;
            maxTokens = TRUNCATION_RETRY_TOKENS;
            console.warn(
              `[AIEngine] Reply truncated at ${MAX_TOKENS} tokens - retrying at ${TRUNCATION_RETRY_TOKENS}`
            );
            continue;
          }
          console.error(
            `[AIEngine] Unparseable reply: finish_reason=${choice?.finish_reason ?? "none"}, chars=${responseText.length}`
          );
          throw parseError;
        }

        return {
          text: parsed.text || "I'm sorry, I couldn't process that. Could you please try again?",
          should_escalate: parsed.should_escalate || false,
          escalation_reason: parsed.escalation_reason || undefined,
          detected_intent: parsed.detected_intent || "other",
          sentiment: parsed.sentiment || "neutral",
          confidence: parsed.confidence || 0.5,
          suggested_actions: parsed.suggested_actions || [],
          created_booking_id: createdBookingId,
        };
      }
    } catch (error) {
      console.error(`[AIEngine] Error generating response: ${describeAIError(error)}`, error);
      return {
        // A booking may already exist even when the final completion failed -
        // surface it so the handler still sends the confirm buttons
        text: createdBookingId
          ? "Your booking request has been recorded! Please confirm it below."
          : "I'm experiencing a brief technical issue. Please try again in a moment, or I can connect you with a team member.",
        should_escalate: false,
        detected_intent: "other",
        sentiment: "neutral",
        confidence: 0,
        created_booking_id: createdBookingId,
      };
    }
  }

  async detectLanguage(text: string): Promise<string> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: 'Detect the language of the text. Respond with only the ISO 639-1 code (e.g., "en", "es", "fr").',
          },
          { role: "user", content: text },
        ],
        temperature: 0,
        max_tokens: 10,
      });
      return completion.choices[0]?.message?.content?.trim().toLowerCase() || "en";
    } catch {
      return "en";
    }
  }

  async analyzeSentiment(text: string): Promise<"positive" | "neutral" | "negative"> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: 'Analyze the sentiment. Respond with exactly one word: "positive", "neutral", or "negative".',
          },
          { role: "user", content: text },
        ],
        temperature: 0,
        max_tokens: 5,
      });
      const result = completion.choices[0]?.message?.content?.trim().toLowerCase();
      if (result === "positive" || result === "neutral" || result === "negative") return result;
      return "neutral";
    } catch {
      return "neutral";
    }
  }
}

export function createAIEngine(apiKey?: string, model?: string): AIEngine {
  return new AIEngine(apiKey, model);
}
