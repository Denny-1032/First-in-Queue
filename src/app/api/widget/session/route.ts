import { NextRequest, NextResponse } from "next/server";
import { resolveByKey, widgetJson, corsHeaders, checkBurst } from "@/lib/properties/guard";
import { issueVisitorToken, generateVisitorId } from "@/lib/properties/visitor-token";
import { getOrCreateConversation } from "@/lib/db/operations";
import { getSupabaseAdmin } from "@/lib/supabase/server";

// Create or resume a visitor session.
// Returns a signed token carrying the conversation id — every subsequent
// request derives its identity from that token, never from the request body.
// See docs/phase1-spec-widget-and-onboarding.md §6.

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request.headers.get("origin")) });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      key?: string;
      visitor_id?: string;
      name?: string;
    };

    const guard = await resolveByKey(request, body.key ?? null);
    if (!guard.ok) return guard.response;
    const { property, origin } = guard;

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    // New sessions are the expensive path (they create rows) - keep it tight.
    if (!(await checkBurst(`sess:ip:${ip}`, 30, 300))) {
      return widgetJson({ error: "Too many sessions from this address" }, origin, { status: 429 });
    }

    // Reuse the caller's visitor id when it looks like ours, so a page reload
    // resumes the same conversation instead of starting a new one.
    const visitorId =
      typeof body.visitor_id === "string" && /^v_[A-Za-z0-9_-]{10,64}$/.test(body.visitor_id)
        ? body.visitor_id
        : generateVisitorId();

    const { conversation } = await getOrCreateConversation(
      property.tenant_id,
      "web",
      visitorId,
      typeof body.name === "string" ? body.name.slice(0, 120) : undefined
    );

    // Tag the conversation with its originating property (nullable on WhatsApp).
    if (!("property_id" in conversation) || !conversation.property_id) {
      await getSupabaseAdmin()
        .from("conversations")
        .update({ property_id: property.id })
        .eq("id", conversation.id);
    }

    const token = issueVisitorToken({
      propertyId: property.id,
      tenantId: property.tenant_id,
      conversationId: conversation.id,
      visitorId,
      widgetKey: property.widget_key,
    });

    return widgetJson(
      { token, visitor_id: visitorId, conversation_id: conversation.id },
      origin
    );
  } catch (error) {
    console.error("[Widget/session] error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
