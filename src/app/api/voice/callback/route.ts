import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { makeOutboundCallViaTwilio } from "@/lib/voice/twilio-client";

// =============================================
// Voice Callback API
// Initiates an outbound voice call to a WhatsApp user's phone number
// Triggered when user requests "Call me" in WhatsApp chat
// =============================================

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const tenantId = session.tenantId;
    
    const body = await request.json();
    const { customerPhone, conversationId, agentId: requestedAgentId } = body;

    if (!customerPhone) {
      return NextResponse.json({ error: "customerPhone is required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Get tenant config
    const { data: tenant } = await supabase
      .from("tenants")
      .select("config, whatsapp_phone_number_id")
      .eq("id", tenantId)
      .single();

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Check if voice callback is enabled
    if (!tenant.config?.voice_callback_enabled) {
      return NextResponse.json({ 
        error: "Voice callback not enabled",
        message: "Please enable voice callback in AI Configuration settings"
      }, { status: 403 });
    }

    // Determine which voice agent to use
    let voiceAgentId: string | null = null;
    let retellAgentId: string | null = null;
    let fromNumber: string | null = null;

    // 1. Try requested agent ID first
    if (requestedAgentId) {
      const { data: agent } = await supabase
        .from("voice_agents")
        .select("id, retell_agent_id")
        .eq("id", requestedAgentId)
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .single();
      
      if (agent) {
        voiceAgentId = agent.id;
        retellAgentId = agent.retell_agent_id;
      }
    }

    // 2. Try configured callback agent
    if (!retellAgentId && tenant.config.voice_callback_agent_id) {
      const { data: agent } = await supabase
        .from("voice_agents")
        .select("id, retell_agent_id")
        .eq("id", tenant.config.voice_callback_agent_id)
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .single();
      
      if (agent) {
        voiceAgentId = agent.id;
        retellAgentId = agent.retell_agent_id;
      }
    }

    // 3. Fallback to first active agent
    if (!retellAgentId) {
      const { data: agent } = await supabase
        .from("voice_agents")
        .select("id, retell_agent_id")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      
      if (agent) {
        voiceAgentId = agent.id;
        retellAgentId = agent.retell_agent_id;
      }
    }

    if (!retellAgentId) {
      return NextResponse.json({ 
        error: "No voice agent available",
        message: "Please create a voice agent first in Voice Agent settings"
      }, { status: 400 });
    }

    // Get the Twilio/Twilio voice number
    fromNumber = process.env.TWILIO_VOICE_NUMBER || tenant.whatsapp_phone_number_id;
    if (!fromNumber?.startsWith("+")) {
      fromNumber = "+" + fromNumber;
    }

    // Ensure customer number has + prefix
    const toNumber = customerPhone.startsWith("+") ? customerPhone : "+" + customerPhone;

    console.log(`[VoiceCallback] Initiating call from ${fromNumber} to ${toNumber}`);

    // Initiate the call via Twilio
    const callResult = await makeOutboundCallViaTwilio({
      fromNumber,
      toNumber,
      retellAgentId,
      metadata: {
        tenant_id: tenantId,
        conversation_id: conversationId || "",
        call_type: "whatsapp_callback",
        customer_phone: customerPhone,
      },
      dynamicVariables: {
        customer_phone: customerPhone,
        conversation_id: conversationId || "",
      },
    });

    // Log the callback
    await supabase.from("voice_callbacks").insert({
      tenant_id: tenantId,
      conversation_id: conversationId,
      customer_phone: customerPhone,
      voice_agent_id: voiceAgentId,
      retell_call_id: callResult.retell_call_id,
      twilio_call_id: callResult.call_id,
      status: "initiated",
      initiated_at: new Date().toISOString(),
    });

    console.log(`[VoiceCallback] Call initiated: ${callResult.call_id}`);

    return NextResponse.json({
      success: true,
      message: "Voice callback initiated successfully",
      call_id: callResult.call_id,
      retell_call_id: callResult.retell_call_id,
    });

  } catch (error) {
    console.error("[VoiceCallback] Error:", error);
    
    if (error instanceof Error && error.message.includes("credentials")) {
      return NextResponse.json({ 
        error: "Twilio credentials not configured",
        message: "Please configure Twilio in Telephony settings"
      }, { status: 500 });
    }

    return NextResponse.json({ 
      error: "Failed to initiate voice callback",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

// Get callback history for a conversation
export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const tenantId = session.tenantId;
    
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json({ error: "conversationId is required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data: callbacks, error } = await supabase
      .from("voice_callbacks")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("conversation_id", conversationId)
      .order("initiated_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "Failed to fetch callbacks" }, { status: 500 });
    }

    return NextResponse.json({ callbacks: callbacks || [] });

  } catch (error) {
    console.error("[VoiceCallback] GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
