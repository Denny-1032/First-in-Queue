import type { FAQ, KnowledgeEntry } from "@/types";

// =============================================
// Validation for the reviewed FAQs + knowledge base committed at wizard step 5.
// Pure, no I/O — POST /api/onboarding/knowledge parses every request body
// through here so the rules are testable without a database.
//
// The KB byte cap is a cost control, not tidiness: knowledge-base size is the
// dominant driver of per-reply token spend (pricing-model-v2 §1), so a free
// property must not be able to carry an unbounded one.
// =============================================

export const FREE_KB_CAP_BYTES = 4096;
export const MAX_FAQS = 30;
export const MAX_KB_ENTRIES = 50;

function byteLen(s: string): number {
  return Buffer.byteLength(s, "utf8");
}

/** Drop malformed entries, trim field lengths, cap the count. */
export function cleanFaqs(raw: unknown): FAQ[] {
  if (!Array.isArray(raw)) return [];
  const out: FAQ[] = [];
  for (const item of raw) {
    if (out.length >= MAX_FAQS) break;
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const question = typeof r.question === "string" ? r.question.trim() : "";
    const answer = typeof r.answer === "string" ? r.answer.trim() : "";
    if (!question || !answer) continue;
    out.push({
      id: typeof r.id === "string" && r.id ? r.id : `faq_${Date.now()}_${out.length}`,
      question: question.slice(0, 300),
      answer: answer.slice(0, 1000),
      ...(typeof r.category === "string" && r.category ? { category: r.category.slice(0, 60) } : {}),
    });
  }
  return out;
}

/**
 * Keep entries in order until the cumulative content byte budget is spent.
 *
 * The first valid entry is always kept even if it alone exceeds the cap —
 * returning an empty knowledge base because the user's one big entry was
 * oversized would look like data loss.
 */
export function cleanKnowledge(raw: unknown): { kept: KnowledgeEntry[]; dropped: number } {
  if (!Array.isArray(raw)) return { kept: [], dropped: 0 };
  const kept: KnowledgeEntry[] = [];
  let bytes = 0;
  let dropped = 0;

  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const topic = typeof r.topic === "string" ? r.topic.trim() : "";
    const content = typeof r.content === "string" ? r.content.trim() : "";
    if (!topic || !content) continue;

    if (kept.length >= MAX_KB_ENTRIES) {
      dropped++;
      continue;
    }

    const size = byteLen(topic) + byteLen(content);
    if (bytes + size > FREE_KB_CAP_BYTES && kept.length > 0) {
      dropped++;
      continue;
    }

    bytes += size;
    kept.push({
      id: typeof r.id === "string" && r.id ? r.id : `kb_${Date.now()}_${kept.length}`,
      topic: topic.slice(0, 150),
      content,
      keywords: Array.isArray(r.keywords)
        ? (r.keywords as unknown[]).filter((k): k is string => typeof k === "string").slice(0, 12)
        : [],
    });
  }

  return { kept, dropped };
}
