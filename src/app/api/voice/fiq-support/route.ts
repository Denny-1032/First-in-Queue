import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import Retell from "retell-sdk";

// =============================================
// FiQ Support Line - SIP Trunk Handler
// Handles inbound calls from local telecom via SIP trunk
// =============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { from_number, to_number, call_id } = body;

    console.log(`[FiQ Support] Incoming call from ${from_number} to ${to_number}`);

    // Get the FiQ support agent configuration
    const supabase = getSupabaseAdmin();
    const { data: config } = await supabase
      .from("fiq_support_config")
      .select("voice_agent_id, support_phone_number")
      .eq("is_active", true)
      .single();

    if (!config?.voice_agent_id) {
      return NextResponse.json({
        error: "FiQ support not configured",
        message: "Please configure a voice agent for FiQ support",
      }, { status: 503 });
    }

    // Get the voice agent details
    const { data: agent } = await supabase
      .from("voice_agents")
      .select("retell_agent_id, name")
      .eq("id", config.voice_agent_id)
      .eq("is_active", true)
      .single();

    if (!agent) {
      return NextResponse.json({
        error: "Voice agent not found",
        message: "The configured FiQ support agent is not active",
      }, { status: 503 });
    }

    // Return the agent configuration for Retell AI
    const response = {
      agent_id: agent.retell_agent_id,
      metadata: {
        caller_number: from_number,
        support_line: to_number,
        call_id: call_id,
        call_type: "fiq_support",
      },
      begin_message: `Hello, thank you for calling First in Queue support. I'm ${agent.name}, how can I help you today?`,
    };

    console.log(`[FiQ Support] Routing to agent ${agent.retell_agent_id}`);
    return NextResponse.json(response);

  } catch (error) {
    console.error("[FiQ Support] Error:", error);
    return NextResponse.json({
      error: "Internal server error",
      message: "Failed to route FiQ support call",
    }, { status: 500 });
  }
}

// Webhook handler for call status updates
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { call_id, status, recording_url, transcript } = body;

    // Log the call for analytics/support review
    const supabase = getSupabaseAdmin();
    await supabase.from("fiq_support_calls").insert({
      call_id,
      status,
      recording_url,
      transcript,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[FiQ Support] Status update error:", error);
    return NextResponse.json({ error: "Failed to log call" }, { status: 500 });
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    status: "active",
    service: "FiQ Support Line",
    timestamp: new Date().toISOString(),
  });
}
