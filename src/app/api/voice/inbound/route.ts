import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

// =============================================
// Inbound Call Routing API
// This endpoint is called by Retell AI when an inbound call arrives
// It determines which voice agent should handle the call based on the phone number
// =============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to_number, from_number, call_id } = body;

    if (!to_number) {
      return NextResponse.json({ error: "to_number is required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Find the tenant that owns this phone number
    const { data: tenant } = await supabase
      .from("tenants")
      .select("id, whatsapp_phone_number_id, config")
      .eq("whatsapp_phone_number_id", to_number.replace(/^\+/, ""))
      .single();

    if (!tenant) {
      console.warn(`[Inbound Call] No tenant found for phone number: ${to_number}`);
      return NextResponse.json({ 
        error: "Phone number not configured",
        message: "This phone number is not associated with any business account"
      }, { status: 404 });
    }

    // Find an active voice agent for this tenant
    const { data: voiceAgent } = await supabase
      .from("voice_agents")
      .select("retell_agent_id, name")
      .eq("tenant_id", tenant.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!voiceAgent) {
      console.warn(`[Inbound Call] No active voice agent found for tenant: ${tenant.id}`);
      return NextResponse.json({ 
        error: "No voice agent configured",
        message: "This business has not set up voice call handling"
      }, { status: 404 });
    }

    // Return the agent configuration for Retell AI
    const response = {
      agent_id: voiceAgent.retell_agent_id,
      metadata: {
        tenant_id: tenant.id,
        business_name: tenant.config?.business_name || "Business",
        inbound_number: to_number,
        caller_number: from_number,
        call_id: call_id,
      },
      // Optional: Override greeting for inbound calls
      begin_message: `Hello, thank you for calling ${tenant.config?.business_name || "us"}. I'm ${voiceAgent.name}, how can I help you today?`,
    };

    console.log(`[Inbound Call] Routing call from ${from_number} to ${to_number} -> Agent: ${voiceAgent.retell_agent_id}`);

    return NextResponse.json(response);
  } catch (error) {
    console.error("[Inbound Call] Error:", error);
    return NextResponse.json({ 
      error: "Internal server error",
      message: "Failed to route inbound call"
    }, { status: 500 });
  }
}

// Handle GET requests for testing/health check
export async function GET() {
  return NextResponse.json({ 
    status: "active",
    message: "Inbound call routing endpoint is operational",
    timestamp: new Date().toISOString()
  });
}
