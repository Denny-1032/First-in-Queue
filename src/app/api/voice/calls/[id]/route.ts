import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

// =============================================
// Voice Call Detail API
// GET: Get a single voice call with full details
// =============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("voice_calls")
      .select("*, voice_agents(name)")
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Voice call not found" }, { status: 404 });
    }

    return NextResponse.json({ call: data });
  } catch (error) {
    console.error("[Voice Call Detail] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
