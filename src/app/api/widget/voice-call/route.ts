import { NextRequest, NextResponse } from "next/server";
import { resolveByToken, widgetJson, corsHeaders, checkBurst } from "@/lib/properties/guard";
import { resolveWidgetVoice } from "@/lib/voice/widget-voice";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import Retell from "retell-sdk";

// Start a browser voice call from the chat widget.
//
// SECURITY: authorization is the signed visitor token only — tenant and
// conversation come from its claims, never from the body. /api/voice/web-call
// accepts a tenantId + agentId pair from any caller, which is fine behind the
// dashboard session but would be a free Retell meter if the widget used it.
//
// COST: every gate in resolveWidgetVoice() runs before the Retell call is
// created, and the rate limits below bound how often a single visitor can
// re-dial. Minutes are metered on the way out by the Retell `call_ended`
// webhook (src/app/api/voice/webhook/route.ts), which is the single source of
// truth for duration.

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request.headers.get("origin")) });
}

export async function POST(request: NextRequest) {
  try {
    const guard = await resolveByToken(request);
    if (!guard.ok) return guard.response;
    const { property, origin, token } = guard;

    // A call is far more expensive than a message — keep both windows tight.
    if (!(await checkBurst(`voice:visitor:${token.visitorId}`, 5, 900))) {
      return widgetJson({ error: "Too many call attempts. Please try again later." }, origin, {
        status: 429,
      });
    }
    if (!(await checkBurst(`voice:prop:${property.id}`, 60, 3600))) {
      return widgetJson({ error: "Calls are busy right now. Please chat instead." }, origin, {
        status: 429,
      });
    }

    const voice = await resolveWidgetVoice(property.tenant_id, property.branding);
    if (!voice.enabled || !voice.retellAgentId) {
      console.warn(
        `[Widget/voice] refused property=${property.id} reason=${voice.reason}`
      );
      return widgetJson({ error: "Voice calling is not available", reason: "unavailable" }, origin, {
        status: 403,
      });
    }

    const apiKey = process.env.RETELL_API_KEY;
    if (!apiKey) {
      console.error("[Widget/voice] RETELL_API_KEY not configured");
      return widgetJson({ error: "Voice calling is not available" }, origin, { status: 503 });
    }

    const supabase = getSupabaseAdmin();

    // Record the attempt first, so a Retell failure still leaves a trace and the
    // webhook has a row to join onto by retell_call_id.
    const { data: callRecord, error: insertError } = await supabase
      .from("voice_calls")
      .insert({
        tenant_id: property.tenant_id,
        voice_agent_id: voice.agentId,
        direction: "inbound",
        caller_phone: "widget-visitor",
        callee_phone: "web-client",
        status: "registered",
        metadata: {
          telephony_provider: "web",
          call_type: "widget_chat",
          property_id: property.id,
          conversation_id: token.conversationId,
          visitor_id: token.visitorId,
        },
      })
      .select("id, metadata")
      .single();

    if (insertError || !callRecord) {
      console.error("[Widget/voice] failed to create call record:", insertError);
      return widgetJson({ error: "Could not start the call" }, origin, { status: 500 });
    }

    let webCall;
    try {
      webCall = await new Retell({ apiKey }).call.createWebCall({
        agent_id: voice.retellAgentId,
        metadata: {
          fiq_call_id: callRecord.id,
          tenant_id: property.tenant_id,
          property_id: property.id,
          conversation_id: token.conversationId,
          call_type: "widget_chat",
        },
      });
    } catch (e) {
      await supabase.from("voice_calls").update({ status: "error" }).eq("id", callRecord.id);
      console.error("[Widget/voice] Retell createWebCall failed:", e);
      return widgetJson({ error: "Could not start the call" }, origin, { status: 502 });
    }

    await supabase
      .from("voice_calls")
      .update({
        retell_call_id: webCall.call_id,
        metadata: { ...callRecord.metadata, retell_web_call_id: webCall.call_id },
      })
      .eq("id", callRecord.id);

    // access_token is a short-lived Retell credential scoped to this one call.
    // retellAgentId is deliberately NOT returned.
    return widgetJson(
      {
        access_token: webCall.access_token,
        call_id: callRecord.id,
        remaining_minutes: voice.remainingMinutes,
      },
      origin
    );
  } catch (error) {
    console.error("[Widget/voice] error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
