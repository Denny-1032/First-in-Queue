import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/server";

// =============================================
// FiQ Support Line Admin API
// GET: Retrieve FiQ support configuration
// POST: Update FiQ support configuration  
// =============================================

export async function GET() {
  try {
    await requireSession();
    
    const supabase = getSupabaseAdmin();
    
    // Get FiQ support config
    const { data: config } = await supabase
      .from("fiq_support_config")
      .select("*, voice_agents(id, name, retell_agent_id)")
      .single();

    // Get available voice agents
    const { data: agents } = await supabase
      .from("voice_agents")
      .select("id, name, is_active")
      .eq("is_active", true);

    // Get recent support calls
    const { data: recentCalls } = await supabase
      .from("fiq_support_calls")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    return NextResponse.json({
      config: config || null,
      availableAgents: agents || [],
      recentCalls: recentCalls || [],
    });
  } catch (error) {
    console.error("[FiQ Support Admin] GET error:", error);
    return NextResponse.json({ error: "Failed to load configuration" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireSession();
    const body = await request.json();
    const { supportPhoneNumber, voiceAgentId, isActive } = body;

    // Validate phone number format (E.164)
    if (supportPhoneNumber && !supportPhoneNumber.match(/^\+\d{10,15}$/)) {
      return NextResponse.json({
        error: "Invalid phone number format. Use E.164 format: +260xxxxxxxxx"
      }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Update or insert config
    const { data: config, error } = await supabase
      .from("fiq_support_config")
      .upsert({
        id: body.id, // If updating existing
        support_phone_number: supportPhoneNumber,
        voice_agent_id: voiceAgentId,
        is_active: isActive ?? true,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("[FiQ Support Admin] Save error:", error);
      return NextResponse.json({ error: "Failed to save configuration" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      config,
      message: "FiQ support line configured successfully",
    });
  } catch (error) {
    console.error("[FiQ Support Admin] POST error:", error);
    return NextResponse.json({ error: "Failed to save configuration" }, { status: 500 });
  }
}
