import { createHash } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { embedTexts, getEmbeddingClient } from "@/lib/ai/embeddings";
import type { KnowledgeEntry } from "@/types";

// =============================================
// Mirror config.knowledge_base into the kb_entries search index.
// ---------------------------------------------
// `tenants.config.knowledge_base` stays the source of truth; this table is a
// derived index that retrieval reads. Every config save calls this, so it has to
// be cheap on the common path: entries are diffed by content hash and only the
// ones that actually changed get embedded.
// =============================================

function hashEntry(topic: string, content: string): string {
  return createHash("sha256").update(`${topic}\n${content}`).digest("hex");
}

/** What retrieval matches against - topic carries real signal ("Rent", "Dividends"). */
function embeddableText(entry: KnowledgeEntry): string {
  const keywords = entry.keywords?.length ? `\nKeywords: ${entry.keywords.join(", ")}` : "";
  return `${entry.topic}\n${entry.content}${keywords}`;
}

export interface KbIndexResult {
  embedded: number;
  unchanged: number;
  removed: number;
}

/**
 * Bring the index in line with the tenant's current knowledge base.
 *
 * Throws on failure. Callers in a request path should catch and log rather than
 * failing the save - a stale index degrades retrieval, but a failed save loses
 * the user's work. Retrieval falls back to sending everything, so a tenant whose
 * index never built still gets correct answers.
 */
export async function syncTenantKbIndex(params: {
  tenantId: string;
  entries: KnowledgeEntry[];
  apiKey?: string;
}): Promise<KbIndexResult> {
  const { tenantId, entries, apiKey } = params;
  const db = getSupabaseAdmin();

  const { data: existingRows, error: readError } = await db
    .from("kb_entries")
    .select("entry_id, content_hash")
    .eq("tenant_id", tenantId);
  if (readError) throw new Error(`kb index read failed: ${readError.message}`);

  const existing = new Map((existingRows || []).map((r) => [r.entry_id as string, r.content_hash as string]));

  const wanted = entries.filter((e) => e.id && e.content?.trim());
  const stale = wanted.filter((e) => existing.get(e.id) !== hashEntry(e.topic || "", e.content));

  // Anything indexed that is no longer in the config - deleted or re-uploaded
  // with fresh ids - has to go, or retrieval keeps serving withdrawn material.
  const wantedIds = new Set(wanted.map((e) => e.id));
  const orphaned = [...existing.keys()].filter((id) => !wantedIds.has(id));

  if (orphaned.length > 0) {
    const { error } = await db
      .from("kb_entries")
      .delete()
      .eq("tenant_id", tenantId)
      .in("entry_id", orphaned);
    if (error) throw new Error(`kb index delete failed: ${error.message}`);
  }

  if (stale.length > 0) {
    const openai = getEmbeddingClient(apiKey);
    // Batched so a 200-entry base is a handful of requests, not 200.
    const BATCH = 96;
    for (let i = 0; i < stale.length; i += BATCH) {
      const slice = stale.slice(i, i + BATCH);
      const vectors = await embedTexts(openai, slice.map(embeddableText));
      const rows = slice.map((entry, n) => ({
        tenant_id: tenantId,
        entry_id: entry.id,
        topic: entry.topic || "",
        content: entry.content,
        content_hash: hashEntry(entry.topic || "", entry.content),
        embedding: JSON.stringify(vectors[n]),
        updated_at: new Date().toISOString(),
      }));
      const { error } = await db
        .from("kb_entries")
        .upsert(rows, { onConflict: "tenant_id,entry_id" });
      if (error) throw new Error(`kb index upsert failed: ${error.message}`);
    }
  }

  return {
    embedded: stale.length,
    unchanged: wanted.length - stale.length,
    removed: orphaned.length,
  };
}

/**
 * Fire-and-forget wrapper for request paths. Never rejects.
 */
export async function syncTenantKbIndexSafe(params: {
  tenantId: string;
  entries: KnowledgeEntry[];
  apiKey?: string;
}): Promise<void> {
  try {
    const result = await syncTenantKbIndex(params);
    console.log(
      `[KB Index] tenant ${params.tenantId}: embedded ${result.embedded}, unchanged ${result.unchanged}, removed ${result.removed}`
    );
  } catch (error) {
    console.error("[KB Index] sync failed (non-fatal, retrieval will fall back):", error);
  }
}
