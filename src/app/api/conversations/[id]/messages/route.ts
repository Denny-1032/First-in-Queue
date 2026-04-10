import { NextRequest, NextResponse } from "next/server";
import { getMessages, saveMessage, getConversation, updateConversation } from "@/lib/db/operations";
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
        const rawError = waErr instanceof Error ? waErr.message : "WhatsApp API error";
        console.error("[API] WhatsApp delivery failed:", rawError);
        // Provide actionable error messages
        if (rawError.includes("401")) {
          deliveryError = "WhatsApp access token has expired. Go to Settings → Integrations to reconnect WhatsApp.";
        } else if (rawError.includes("400")) {
          deliveryError = "WhatsApp rejected the message. The customer's number may be invalid or they haven't messaged in 24 hours.";
        } else {
          deliveryError = `WhatsApp delivery failed: ${rawError}`;
        }
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

    // Update conversation timestamp so it appears at top of list
    await updateConversation(id, { last_message_at: new Date().toISOString() });

    if (deliveryFailed) {
      return NextResponse.json({ ...message, _deliveryError: deliveryError }, { status: 207 });
    }

    return NextResponse.json(message);
  } catch (error) {
    console.error("[API] Error sending message:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
