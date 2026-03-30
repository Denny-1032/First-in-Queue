import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

// =============================================
// Voice Call History API
// GET: List voice calls for a tenant
// =============================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");
    const direction = searchParams.get("direction");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    if (!tenantId) {
      return NextResponse.json({ error: "tenantId is required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    let query = supabase
      .from("voice_calls")
      .select("*, voice_agents(name)", { count: "exact" })
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (direction) query = query.eq("direction", direction);
    if (status) query = query.eq("status", status);

    const { data, error, count } = await query;

    if (error) {
      console.error("[Voice Calls] Fetch error:", error);
      return NextResponse.json({ error: "Failed to fetch voice calls" }, { status: 500 });
    }

    return NextResponse.json({
      calls: data || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error("[Voice Calls] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
