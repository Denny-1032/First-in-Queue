import OpenAI from "openai";
import type { FAQ, KnowledgeEntry } from "@/types";

// =============================================
// Turn crawled knowledge into customer-facing FAQs (§7 step 5).
// ---------------------------------------------
// Uses gpt-4o-mini (the free-tier model decision) in JSON mode. Answers are
// grounded ONLY in the supplied crawl content — the prompt forbids invention,
// because a wrong "fact" shown on the trust screen is worse than a missing one.
// Best-effort: any failure returns [] so onboarding never blocks on it.
// =============================================

const MAX_FAQS = 8;
const MODEL = process.env.ONBOARDING_FAQ_MODEL || "gpt-4o-mini";
// Cap the content we send so a large crawl can't blow the context or the bill.
const MAX_INPUT_CHARS = 12_000;

interface RawFaq {
  question?: unknown;
  answer?: unknown;
}

/**
 * Generate up to {@link MAX_FAQS} grounded FAQs from crawl entries. Returns []
 * on empty input, a missing key, or any API/parse error — callers treat FAQs as
 * optional and let the user add their own.
 */
export async function generateFaqs(
  entries: KnowledgeEntry[],
  opts: { apiKey?: string } = {}
): Promise<FAQ[]> {
  const apiKey = opts.apiKey || process.env.OPENAI_API_KEY;
  if (!apiKey || entries.length === 0) return [];

  const corpus = entries
    .map((e) => `# ${e.topic}\n${e.content}`)
    .join("\n\n")
    .slice(0, MAX_INPUT_CHARS);

  const system = `You write FAQs for a small business's customer-support assistant.
From the SOURCE CONTENT below, extract up to ${MAX_FAQS} frequently-asked questions a real customer would ask, each with a short, direct answer.

STRICT RULES:
- Use ONLY facts present in the SOURCE CONTENT. Never invent prices, hours, policies, contact details, or claims.
- If the content doesn't support a good FAQ, return fewer — quality over quantity.
- Questions are what a customer types ("Do you deliver?", "What are your hours?"). Answers are 1-3 sentences.
- No marketing fluff. Plain, factual, helpful.

Respond as JSON: {"faqs":[{"question":"...","answer":"..."}]}`;

  try {
    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0.3,
      max_tokens: 1200,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: `SOURCE CONTENT:\n\n${corpus}` },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) return [];

    const parsed = JSON.parse(raw) as { faqs?: RawFaq[] };
    const list = Array.isArray(parsed.faqs) ? parsed.faqs : [];

    const faqs: FAQ[] = [];
    for (const item of list) {
      const question = typeof item.question === "string" ? item.question.trim() : "";
      const answer = typeof item.answer === "string" ? item.answer.trim() : "";
      if (!question || !answer) continue;
      faqs.push({
        id: `faq_${Date.now()}_${faqs.length}`,
        question: question.slice(0, 300),
        answer: answer.slice(0, 1000),
      });
      if (faqs.length >= MAX_FAQS) break;
    }
    return faqs;
  } catch (err) {
    console.warn("[FAQ] generation failed:", err instanceof Error ? err.message : err);
    return [];
  }
}
