import type OpenAI from "openai";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { embedOne } from "@/lib/ai/embeddings";
import type { KnowledgeEntry } from "@/types";

// =============================================
// Pick the knowledge entries worth putting in this message's prompt.
// ---------------------------------------------
// Everything here is best-effort. The caller MUST fall back to sending the whole
// knowledge base when this returns null, because the grounding instruction
// ("if the answer is not below, say you do not have it") turns a retrieval miss
// into a confident "I don't have that" for information we do in fact hold.
// Expensive but correct beats cheap and ignorant.
// =============================================

/** How many entries to put in the prompt. */
const DEFAULT_K = Number(process.env.KB_RETRIEVAL_K || 8);

/**
 * Cosine similarity below which a match is treated as noise.
 *
 * Deliberately low. A visitor asking "how much to register a company" shares few
 * words with "Companies Form 1 - Application For Name Clearance", so a strict
 * floor drops the exact entry that answers them. Weak matches cost tokens; a
 * missing match costs the answer.
 */
const SIMILARITY_FLOOR = Number(process.env.KB_RETRIEVAL_FLOOR || 0.25);

/** Below this, retrieval is pointless - the whole base already fits comfortably. */
const MIN_ENTRIES_TO_BOTHER = 12;

interface MatchRow {
  entry_id: string;
  topic: string;
  content: string;
  similarity: number;
}

/**
 * Returns the entries to include, or null when the caller should send everything.
 *
 * null means "no opinion" - an error, an empty index, or a knowledge base small
 * enough that selecting from it saves nothing. It never means "nothing matched".
 */
export async function retrieveKnowledge(params: {
  tenantId: string;
  query: string;
  entries: KnowledgeEntry[];
  openai: OpenAI;
  k?: number;
}): Promise<KnowledgeEntry[] | null> {
  const { tenantId, query, entries, openai } = params;
  const k = params.k ?? DEFAULT_K;

  if (!query.trim()) return null;
  if (entries.length <= Math.max(MIN_ENTRIES_TO_BOTHER, k)) return null;

  try {
    const embedding = await embedOne(openai, query);

    const { data, error } = await getSupabaseAdmin().rpc("match_kb_entries", {
      p_tenant_id: tenantId,
      p_query: JSON.stringify(embedding),
      p_limit: k,
    });
    if (error) throw new Error(error.message);

    const rows = (data || []) as MatchRow[];
    if (rows.length === 0) return null; // index empty or not built yet

    // Map back to the config entries so the prompt keeps whatever the source of
    // truth says, even if the index is a save behind.
    const byId = new Map(entries.map((e) => [e.id, e]));
    const matched: KnowledgeEntry[] = [];
    for (const row of rows) {
      const entry = byId.get(row.entry_id);
      if (entry) matched.push(entry);
    }
    if (matched.length === 0) return null; // index is stale against config

    // Prefer entries over the floor, but never return fewer than a handful just
    // because every score was mediocre - that is exactly when extra context helps.
    const strong = matched.filter((_, i) => rows[i].similarity >= SIMILARITY_FLOOR);
    const selected = strong.length >= Math.min(3, matched.length) ? strong : matched;

    console.log(
      `[KB Retrieval] tenant ${tenantId}: ${selected.length}/${entries.length} entries ` +
        `(top similarity ${rows[0].similarity.toFixed(3)})`
    );
    return selected;
  } catch (error) {
    console.error("[KB Retrieval] failed, falling back to full knowledge base:", error);
    return null;
  }
}
