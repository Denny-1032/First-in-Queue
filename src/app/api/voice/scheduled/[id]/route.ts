import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

// =============================================
// Scheduled Call by ID
// GET:    Get a single scheduled call
// PATCH:  Update (reschedule / cancel)
// DELETE: Remove a scheduled call
// =============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("scheduled_calls")
      .select("*, voice_agents(name)")
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Scheduled call not found" }, { status: 404 });
    }

    return NextResponse.json({ scheduledCall: data });
  } catch (error) {
    console.error("[Scheduled Call] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { scheduledAt, customerPhone, customerName, purpose, status } = body;

    const supabase = getSupabaseAdmin();

    // Only allow updates to pending calls
    const { data: existing } = await supabase
      .from("scheduled_calls")
      .select("status")
      .eq("id", id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Scheduled call not found" }, { status: 404 });
    }

    if (existing.status !== "pending") {
      return NextResponse.json(
        { error: "Can only modify pending scheduled calls" },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (scheduledAt) updates.scheduled_at = scheduledAt;
    if (customerPhone) updates.customer_phone = customerPhone;
    if (customerName !== undefined) updates.customer_name = customerName;
    if (purpose !== undefined) updates.purpose = purpose;
    if (status === "cancelled") updates.status = "cancelled";

    const { data, error } = await supabase
      .from("scheduled_calls")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to update scheduled call" }, { status: 500 });
    }

    return NextResponse.json({ scheduledCall: data });
  } catch (error) {
    console.error("[Scheduled Call] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from("scheduled_calls")
      .delete()
      .eq("id", id)
      .in("status", ["pending", "cancelled"]);

    if (error) {
      return NextResponse.json({ error: "Failed to delete scheduled call" }, { status: 500 });
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("[Scheduled Call] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
