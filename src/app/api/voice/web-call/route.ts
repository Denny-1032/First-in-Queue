import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";
import { checkVoiceMinutes } from "@/lib/voice/usage";
import Retell from "retell-sdk";

// =============================================
// Web Call Registration API
// Creates a Retell web call and returns access token for browser WebRTC connection
//
// Supports two modes:
// 1. Authenticated (dashboard): tenantId from session cookie, agentId in body
// 2. Public (widget/iframe): tenantId + agentId both in body
// =============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId: bodyTenantId, agentId, customerName, purpose } = body;

    // Resolve tenantId: prefer session (authenticated), fall back to body (public widget)
    const session = await getSession();
    const tenantId = session?.tenantId || bodyTenantId;

    if (!tenantId || !agentId) {
      return NextResponse.json({ error: "tenantId and agentId are required" }, { status: 400 });
    }

    // Check voice minute allowance
    const usage = await checkVoiceMinutes(tenantId);
    if (!usage.allowed) {
      return NextResponse.json(
        { error: "Voice minute limit reached", used: usage.used, limit: usage.limit },
        { status: 403 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Get the voice agent and validate it belongs to the tenant
    const { data: voiceAgent, error: agentError } = await supabase
      .from("voice_agents")
      .select("*")
      .eq("id", agentId)
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .limit(1)
      .single();

    if (agentError || !voiceAgent) {
      return NextResponse.json(
        { error: "Voice agent not found or not active" },
        { status: 404 }
      );
    }

    // Determine caller identity
    const isPublic = !session;
    const callerLabel = isPublic ? "widget-visitor" : session.email || "dashboard-user";

    // Create web call record in DB
    const { data: callRecord, error: insertError } = await supabase
      .from("voice_calls")
      .insert({
        tenant_id: tenantId,
        voice_agent_id: voiceAgent.id,
        direction: isPublic ? "inbound" : "outbound",
        caller_phone: callerLabel,
        callee_phone: "web-client",
        status: "registered",
        metadata: {
          customer_name: customerName || null,
          purpose: purpose || null,
          telephony_provider: "web",
          call_type: isPublic ? "widget" : "dashboard",
        },
      })
      .select()
      .single();

    if (insertError) {
      console.error("[Web Call] Failed to create call record:", insertError);
      return NextResponse.json({ error: "Failed to initiate call" }, { status: 500 });
    }

    // Create Retell web call to get access token
    const apiKey = process.env.RETELL_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "RETELL_API_KEY not configured" }, { status: 500 });
    }

    const retell = new Retell({ apiKey });
    let webCallResponse;
    try {
      webCallResponse = await retell.call.createWebCall({
        agent_id: voiceAgent.retell_agent_id,
        metadata: {
          fiq_call_id: callRecord.id,
          tenant_id: tenantId,
          call_type: isPublic ? "widget" : "dashboard",
          customer_name: customerName || "",
          purpose: purpose || "",
        },
      });
      console.log(`[Web Call] Retell web call created: call_id=${webCallResponse.call_id} type=${isPublic ? "widget" : "dashboard"}`);
    } catch (retellErr) {
      console.error("[Web Call] Retell web call creation FAILED:", retellErr);
      await supabase
        .from("voice_calls")
        .update({ status: "error" })
        .eq("id", callRecord.id);
      
      const msg = retellErr instanceof Error ? retellErr.message : String(retellErr);
      return NextResponse.json(
        { error: `Failed to create web call: ${msg}` },
        { status: 502 }
      );
    }

    // Update call record with Retell call IDs
    await supabase
      .from("voice_calls")
      .update({
        retell_call_id: webCallResponse.call_id,
        metadata: {
          ...callRecord.metadata,
          retell_web_call_id: webCallResponse.call_id,
        },
      })
      .eq("id", callRecord.id);

    return NextResponse.json({
      success: true,
      callId: callRecord.id,
      retellCallId: webCallResponse.call_id,
      accessToken: webCallResponse.access_token,
      access_token: webCallResponse.access_token,
      agent_id: voiceAgent.id,
      status: "registered",
      remainingMinutes: usage.remaining,
    });

  } catch (error) {
    console.error("[WebCall] Registration error:", error);
    
    if (error instanceof Error) {
      if (error.message.includes("agent_id")) {
        return NextResponse.json({ error: "Invalid agent ID" }, { status: 400 });
      }
      if (error.message.includes("authentication")) {
        return NextResponse.json({ error: "Retell API authentication failed" }, { status: 500 });
      }
    }

    return NextResponse.json(
      { error: "Failed to register web call" },
      { status: 500 }
    );
  }
}

// Get available voice agents for web calling
// Authenticated: returns agents for the session tenant
// Public with ?tenantId=xxx: returns agents for that tenant (widget embed)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryTenantId = searchParams.get("tenantId");

    const session = await getSession();
    const tenantId = session?.tenantId || queryTenantId;

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant context required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    
    // Get active voice agents scoped to tenant
    const { data: agents, error } = await supabase
      .from("voice_agents")
      .select("id, name, retell_agent_id, greeting_message")
      .eq("tenant_id", tenantId)
      .eq("is_active", true);

    if (error) {
      console.error("[WebCall] Failed to fetch agents:", error);
      return NextResponse.json({ error: "Failed to fetch agents" }, { status: 500 });
    }

    return NextResponse.json({ agents: agents || [] });
  } catch (error) {
    console.error("[WebCall] GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
