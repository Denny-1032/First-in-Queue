import { NextRequest, NextResponse } from "next/server";
import { getAgents } from "@/lib/db/operations";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { requireSession, AuthError } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const tenantId = session.tenantId;
    const agents = await getAgents(tenantId);
    return NextResponse.json(agents);
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[API] Error fetching agents:", error);
    return NextResponse.json({ error: "Failed to fetch agents" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const session = await requireSession();
    const tenantId = session.tenantId;
    const { data, error } = await getSupabaseAdmin()
      .from("agents")
      .insert({
        tenant_id: tenantId,
        name: body.name || "New Agent",
        email: body.email || "",
        role: body.role || "agent",
        is_online: body.is_online ?? false,
        max_concurrent_chats: body.max_concurrent_chats ?? 5,
      })
      .select()
      .single();

    if (error) {
      console.error("[API] Error creating agent:", error);
      return NextResponse.json({ error: "Failed to create agent" }, { status: 500 });
    }
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[API] Error creating agent:", error);
    return NextResponse.json({ error: "Failed to create agent" }, { status: 500 });
  }
}
