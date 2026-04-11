import { NextRequest, NextResponse } from "next/server";
import { getConversation, updateConversation, getTenantById, saveMessage } from "@/lib/db/operations";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { createWhatsAppClient } from "@/lib/whatsapp/client";

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

    // Increment active_chats when agent manually takes over a conversation (entering handoff)
    // Skip if already in handoff with the same agent (e.g. handleSend re-patches)
    const enteringHandoff =
      sanitized.status === "handoff" &&
      sanitized.assigned_agent_id &&
      (current?.status !== "handoff" || current?.assigned_agent_id !== sanitized.assigned_agent_id);

    if (enteringHandoff) {
      const { data: agent } = await db
        .from("agents")
        .select("active_chats, name")
        .eq("id", sanitized.assigned_agent_id as string)
        .single();
      if (agent) {
        await db
          .from("agents")
          .update({ active_chats: (agent.active_chats || 0) + 1 })
          .eq("id", sanitized.assigned_agent_id as string);

        // Send "agent joined" WhatsApp message to customer
        try {
          const tenant = await getTenantById(updated.tenant_id);
          if (tenant?.whatsapp_access_token && tenant?.whatsapp_phone_number_id) {
            const whatsapp = createWhatsAppClient(tenant.whatsapp_access_token, tenant.whatsapp_phone_number_id);
            const firstName = agent.name.split(" ")[0];
            const joinMsg = `${firstName} has joined the chat.`;
            const waId = await whatsapp.sendText(updated.customer_phone, joinMsg);
            await saveMessage({
              conversation_id: id,
              tenant_id: updated.tenant_id,
              direction: "outbound",
              sender_type: "agent",
              message_type: "text",
              content: { text: joinMsg, _system: true, _agent_name: agent.name },
              whatsapp_message_id: waId,
              status: "sent",
            });
          }
        } catch (err) {
          console.error("[Conversations] Failed to send agent-joined message:", err);
        }
      }
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
