import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import Retell from "retell-sdk";

// =============================================
// Web Call Registration API
// Creates a Retell web call and returns websocket URL for browser connection
// =============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId } = body;

    if (!agentId) {
      return NextResponse.json({ error: "agentId is required" }, { status: 400 });
    }

    const apiKey = process.env.RETELL_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "RETELL_API_KEY not configured" }, { status: 500 });
    }

    const retell = new Retell({ apiKey });

    // Create a web call with Retell
    // This returns an access_token for Retell's client SDK
    const response = await retell.call.createWebCall({
      agent_id: agentId,
    });

    console.log(`[WebCall] Created call: ${response.call_id}`);

    return NextResponse.json({
      accessToken: response.access_token,
      access_token: response.access_token,
      callId: response.call_id,
      call_id: response.call_id,
      agent_id: agentId,
    });

  } catch (error) {
    console.error("[WebCall] Registration error:", error);
    
    // Handle specific Retell errors
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
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    
    // Get active voice agents
    const { data: agents, error } = await supabase
      .from("voice_agents")
      .select("id, name, retell_agent_id, greeting_message")
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
