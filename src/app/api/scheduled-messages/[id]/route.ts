import { NextRequest, NextResponse } from "next/server";
import { updateScheduledMessage, cancelScheduledMessage } from "@/lib/db/operations";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { data } = await getSupabaseAdmin()
      .from("scheduled_messages")
      .select("*")
      .eq("id", id)
      .single();

    if (!data) {
      return NextResponse.json({ error: "Scheduled message not found" }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error("[API] Error fetching scheduled message:", error);
    return NextResponse.json({ error: "Failed to fetch scheduled message" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (body.status === "cancelled") {
      await cancelScheduledMessage(id);
      return NextResponse.json({ success: true, status: "cancelled" });
    }

    const updated = await updateScheduledMessage(id, body);
    if (!updated) {
      return NextResponse.json({ error: "Scheduled message not found" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    console.error("[API] Error updating scheduled message:", error);
    return NextResponse.json({ error: "Failed to update scheduled message" }, { status: 500 });
  }
}
