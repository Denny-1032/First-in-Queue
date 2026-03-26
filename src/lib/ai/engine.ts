import OpenAI from "openai";
import type { AIContext, AIResponse, BusinessConfig } from "@/types";

function buildSystemPrompt(config: BusinessConfig): string {
  const personality = config.personality;
  const toneMap = {
    professional: "Maintain a professional, polished tone at all times.",
    friendly: "Be warm, approachable, and conversational.",
    casual: "Keep it relaxed and casual, like chatting with a friend.",
    formal: "Use formal language with proper etiquette.",
  };
  const emojiMap = {
    none: "Never use emojis.",
    minimal: "Use emojis sparingly — only when they genuinely add warmth.",
    moderate: "Use emojis naturally throughout your responses.",
    heavy: "Use emojis liberally to make conversations fun and engaging.",
  };
  const styleMap = {
    concise: "Keep responses short and to the point. Maximum 2-3 sentences.",
    detailed: "Provide thorough, detailed responses with all relevant information.",
    balanced: "Balance brevity with helpfulness. Be informative but not verbose.",
  };

  const knowledgeBlock = config.knowledge_base.length > 0
    ? `\n\nBUSINESS KNOWLEDGE BASE:\n${config.knowledge_base.map((k) => `- ${k.topic}: ${k.content}`).join("\n")}`
    : "";

  const faqBlock = config.faqs.length > 0
    ? `\n\nFREQUENTLY ASKED QUESTIONS:\n${config.faqs.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n")}`
    : "";

  const escalationKeywords = config.escalation_rules
    .filter((r) => r.trigger === "keyword")
    .map((r) => r.value);

  return `You are ${personality.name}, the AI customer care assistant for ${config.business_name}.

ROLE: You are a dedicated customer care representative. Your ONLY purpose is to help customers of ${config.business_name} with their questions, issues, and needs.

BUSINESS DESCRIPTION: ${config.description}

PERSONALITY & STYLE:
- ${toneMap[personality.tone]}
- ${emojiMap[personality.emoji_usage]}
- ${styleMap[personality.response_style]}

LANGUAGES: You can communicate in: ${config.languages.join(", ")}. Default: ${config.default_language}. 
IMPORTANT: Always respond in the same language the customer is writing in. If they switch languages, switch with them.

${config.custom_instructions ? `SPECIAL INSTRUCTIONS:\n${config.custom_instructions}\n` : ""}
${knowledgeBlock}
${faqBlock}

CRITICAL RULES:
1. NEVER reveal that you are an AI or chatbot unless directly asked. Present yourself as "${personality.name} from ${config.business_name}".
2. NEVER make up information about products, prices, policies, or services that isn't in your knowledge base.
3. If you don't know the answer, say so honestly and offer to connect the customer with a human agent.
4. NEVER discuss topics unrelated to ${config.business_name} or its services.
5. If the customer seems frustrated, angry, or requests a human agent, recommend escalation.
6. Keep responses within WhatsApp's character limits and format for mobile readability.
7. Use line breaks for readability. Avoid walls of text.
${escalationKeywords.length > 0 ? `8. If the customer mentions any of these keywords, recommend escalation: ${escalationKeywords.join(", ")}` : ""}

RESPONSE FORMAT:
Respond with a JSON object:
{
  "text": "Your response message to the customer",
  "should_escalate": false,
  "escalation_reason": null,
  "detected_intent": "greeting|inquiry|complaint|order_status|support|feedback|other",
  "sentiment": "positive|neutral|negative",
  "confidence": 0.95,
  "suggested_actions": []
}

For suggested_actions, you can include:
- { "type": "quick_reply", "label": "Button text", "value": "button_id" } (max 3 buttons)
- { "type": "escalate", "label": "Talk to human", "value": "escalate" }
- { "type": "flow", "label": "Start process", "value": "flow_name" }`;
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

  async generateResponse(context: AIContext): Promise<AIResponse> {
    const systemPrompt = buildSystemPrompt(context.tenant_config);

    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
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

    try {
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages,
        temperature: 0.7,
        max_tokens: 1000,
        response_format: { type: "json_object" },
      });

      const responseText = completion.choices[0]?.message?.content || "";
      const parsed = JSON.parse(responseText) as AIResponse;

      return {
        text: parsed.text || "I'm sorry, I couldn't process that. Could you please try again?",
        should_escalate: parsed.should_escalate || false,
        escalation_reason: parsed.escalation_reason || undefined,
        detected_intent: parsed.detected_intent || "other",
        sentiment: parsed.sentiment || "neutral",
        confidence: parsed.confidence || 0.5,
        suggested_actions: parsed.suggested_actions || [],
      };
    } catch (error) {
      console.error("[AIEngine] Error generating response:", error);
      return {
        text: "I'm experiencing a brief technical issue. Please try again in a moment, or I can connect you with a team member.",
        should_escalate: false,
        detected_intent: "other",
        sentiment: "neutral",
        confidence: 0,
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
