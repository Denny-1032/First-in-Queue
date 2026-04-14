import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import Retell from "retell-sdk";

// =============================================
// Public FiQ Support Web Call
// No auth required — this is for the website support widget.
// Uses fiq_support_config to find the FiQ support voice agent.
// =============================================

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    // 1. Get FiQ support config
    const { data: config } = await supabase
      .from("fiq_support_config")
      .select("voice_agent_id")
      .eq("is_active", true)
      .single();

    if (!config?.voice_agent_id) {
      return NextResponse.json(
        { error: "FiQ support is not configured" },
        { status: 503 }
      );
    }

    // 2. Get the voice agent
    const { data: agent } = await supabase
      .from("voice_agents")
      .select("id, retell_agent_id, name, greeting_message, tenant_id")
      .eq("id", config.voice_agent_id)
      .eq("is_active", true)
      .single();

    if (!agent) {
      return NextResponse.json(
        { error: "Support agent is currently unavailable" },
        { status: 503 }
      );
    }

    // 3. Create a Retell web call
    const apiKey = process.env.RETELL_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Voice service not configured" },
        { status: 500 }
      );
    }

    const retell = new Retell({ apiKey });
    const webCallResponse = await retell.call.createWebCall({
      agent_id: agent.retell_agent_id,
      metadata: {
        call_type: "fiq_website_support",
        source: "public_widget",
      },
    });

    // 4. Log the call
    await supabase.from("voice_calls").insert({
      tenant_id: agent.tenant_id,
      voice_agent_id: agent.id,
      direction: "inbound",
      caller_phone: "website-visitor",
      callee_phone: "web-client",
      status: "registered",
      retell_call_id: webCallResponse.call_id,
      metadata: {
        call_type: "fiq_website_support",
        telephony_provider: "web",
      },
    });

    return NextResponse.json({
      success: true,
      access_token: webCallResponse.access_token,
      agent_name: agent.name,
      greeting: agent.greeting_message,
    });
  } catch (error) {
    console.error("[FiQ Support WebCall] Error:", error);
    return NextResponse.json(
      { error: "Failed to start support call" },
      { status: 500 }
    );
  }
}
