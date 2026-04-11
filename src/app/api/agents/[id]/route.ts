import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { requireSession, AuthError } from "@/lib/auth/session";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = await request.json();
    const allowedFields = ["name", "email", "role", "is_online", "max_concurrent_chats", "active_chats"];
    const sanitized: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in body) sanitized[key] = body[key];
    }
    if (Object.keys(sanitized).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }
    const { data, error } = await getSupabaseAdmin()
      .from("agents")
      .update(sanitized)
      .eq("id", id)
      .eq("tenant_id", session.tenantId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Agent not found or update failed" }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[API] Error updating agent:", error);
    return NextResponse.json({ error: "Failed to update agent" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const { error } = await getSupabaseAdmin()
      .from("agents")
      .delete()
      .eq("id", id)
      .eq("tenant_id", session.tenantId);

    if (error) {
      return NextResponse.json({ error: "Failed to delete agent" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[API] Error deleting agent:", error);
    return NextResponse.json({ error: "Failed to delete agent" }, { status: 500 });
  }
}
