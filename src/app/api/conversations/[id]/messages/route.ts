import { NextRequest, NextResponse } from "next/server";
import { getMessages, saveMessage, getConversation } from "@/lib/db/operations";
import { createWhatsAppClient } from "@/lib/whatsapp/client";
import { getTenantById } from "@/lib/db/operations";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "50");
    const offset = parseInt(request.nextUrl.searchParams.get("offset") || "0");
    const messages = await getMessages(id, limit, offset);
    return NextResponse.json(messages);
  } catch (error) {
    console.error("[API] Error fetching messages:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

// Agent sends a message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { text } = body;

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const conversation = await getConversation(id);
    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const tenant = await getTenantById(conversation.tenant_id);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Try to send via WhatsApp
    let waMessageId = "";
    let deliveryFailed = false;
    let deliveryError = "";

    if (!tenant.whatsapp_access_token || !tenant.whatsapp_phone_number_id) {
      deliveryFailed = true;
      deliveryError = "WhatsApp credentials not configured. Go to Settings → Integrations to connect WhatsApp.";
    } else {
      try {
        const whatsapp = createWhatsAppClient(tenant.whatsapp_access_token, tenant.whatsapp_phone_number_id);
        waMessageId = await whatsapp.sendText(conversation.customer_phone, text);
      } catch (waErr) {
        deliveryFailed = true;
        deliveryError = waErr instanceof Error ? waErr.message : "WhatsApp API error";
        console.error("[API] WhatsApp delivery failed:", deliveryError);
      }
    }

    // Save to database regardless of delivery status
    const message = await saveMessage({
      conversation_id: id,
      tenant_id: conversation.tenant_id,
      direction: "outbound",
      sender_type: "agent",
      message_type: "text",
      content: { text },
      whatsapp_message_id: waMessageId || undefined,
      status: deliveryFailed ? "failed" : "sent",
    });

    if (deliveryFailed) {
      return NextResponse.json({ ...message, _deliveryError: deliveryError }, { status: 207 });
    }

    return NextResponse.json(message);
  } catch (error) {
    console.error("[API] Error sending message:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
