import { NextRequest, NextResponse } from "next/server";
import { requireSession, AuthError } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { mergeTenantConfig } from "@/lib/onboarding/state";
import { cleanFaqs, cleanKnowledge, FREE_KB_CAP_BYTES } from "@/lib/onboarding/knowledge-input";
import { syncTenantKbIndexSafe } from "@/lib/ai/kb-index";

// =============================================
// Commit the reviewed FAQs + knowledge base into the tenant config (§7 step 5).
// ---------------------------------------------
// This is the gate: crawl results are staged in onboarding.crawl and only the
// entries the user KEEPS (after edit/delete) land in config.knowledge_base /
// config.faqs — which is what the AI engine actually reads (buildSystemPrompt).
// Dashboard-authenticated; tenant_id comes from the session.
//
// Validation and the free-tier KB byte cap live in
// src/lib/onboarding/knowledge-input.ts so they are unit-testable.
// =============================================

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = (await request.json().catch(() => null)) as {
      faqs?: unknown;
      knowledge_base?: unknown;
    } | null;

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const faqs = cleanFaqs(body.faqs);
    const { kept: knowledge_base, dropped } = cleanKnowledge(body.knowledge_base);

    await mergeTenantConfig(getSupabaseAdmin(), session.tenantId, { faqs, knowledge_base });

    // Keep the retrieval index in step with what was just committed. Non-fatal:
    // retrieval falls back to the whole base if the index is missing or stale.
    await syncTenantKbIndexSafe({ tenantId: session.tenantId, entries: knowledge_base });

    return NextResponse.json({
      committed: { faqs: faqs.length, knowledge_base: knowledge_base.length },
      dropped_for_cap: dropped,
      kb_cap_bytes: FREE_KB_CAP_BYTES,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[API/onboarding/knowledge] error:", error);
    return NextResponse.json({ error: "Failed to save knowledge" }, { status: 500 });
  }
}
