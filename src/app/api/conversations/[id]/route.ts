import { NextRequest, NextResponse } from "next/server";
import { getConversation, updateConversation } from "@/lib/db/operations";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const conversation = await getConversation(id);
    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }
    return NextResponse.json(conversation);
  } catch (error) {
    console.error("[API] Error fetching conversation:", error);
    return NextResponse.json({ error: "Failed to fetch conversation" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const allowedFields = ["status", "ai_enabled", "assigned_agent_id", "sentiment", "tags", "metadata"];
    const sanitized: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in body) sanitized[key] = body[key];
    }
    if (Object.keys(sanitized).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    // Before updating, fetch current conversation to check if we should decrement active_chats
    const db = getSupabaseAdmin();
    const { data: current } = await db
      .from("conversations")
      .select("status, assigned_agent_id")
      .eq("id", id)
      .single();

    const updated = await updateConversation(id, sanitized);
    if (!updated) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    // Decrement agent's active_chats when conversation leaves handoff (resolved or returned to AI)
    const leavingHandoff =
      current?.status === "handoff" &&
      sanitized.status &&
      sanitized.status !== "handoff" &&
      current?.assigned_agent_id;

    if (leavingHandoff) {
      const { data: agent } = await db
        .from("agents")
        .select("active_chats")
        .eq("id", current.assigned_agent_id)
        .single();
      if (agent && agent.active_chats > 0) {
        await db
          .from("agents")
          .update({ active_chats: agent.active_chats - 1 })
          .eq("id", current.assigned_agent_id);
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[API] Error updating conversation:", error);
    return NextResponse.json({ error: "Failed to update conversation" }, { status: 500 });
  }
}
