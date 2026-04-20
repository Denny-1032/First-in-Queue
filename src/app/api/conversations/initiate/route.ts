import { NextRequest, NextResponse } from "next/server";
import { requireSession, AuthError } from "@/lib/auth/session";
import { getOrCreateConversation, getTenantById, saveMessage, updateConversation } from "@/lib/db/operations";
import { createWhatsAppClient } from "@/lib/whatsapp/client";
import { checkMessageUsage, incrementMessageUsage } from "@/lib/lipila/usage";
import type { Conversation } from "@/types";

/**
 * POST /api/conversations/initiate
 * 
 * Allows an agent to start a new conversation with a WhatsApp contact.
 * Creates (or reuses) a conversation record and sends the first message.
 *
 * Body: { phone: string, name?: string, message: string }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const tenant = await getTenantById(session.tenantId);

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const body = await request.json();
    const { phone, name, message } = body as { phone?: string; name?: string; message?: string };

    if (!phone || !message) {
      return NextResponse.json({ error: "Phone number and message are required" }, { status: 400 });
    }

    // Normalise phone — strip spaces/dashes, ensure leading +
    let normalisedPhone = phone.replace(/[\s\-()]/g, "");
    if (!normalisedPhone.startsWith("+")) {
      normalisedPhone = `+${normalisedPhone}`;
    }

    // Basic validation: must be digits (after +) and at least 7 chars
    if (!/^\+\d{7,15}$/.test(normalisedPhone)) {
      return NextResponse.json({ error: "Invalid phone number. Use international format, e.g. +260971234567" }, { status: 400 });
    }

    // Check message usage limit
    const usage = await checkMessageUsage(tenant.id);
    if (!usage.allowed) {
      return NextResponse.json({
        error: "Message limit reached",
        message: `You've reached your monthly limit of ${usage.messagesLimit.toLocaleString()} messages. Please upgrade your plan to continue.`,
      }, { status: 403 });
    }

    // Get or create conversation
    const { conversation } = await getOrCreateConversation(
      tenant.id,
      normalisedPhone,
      name || undefined
    );

    // Mark conversation as agent-handled (handoff, ai_enabled=false)
    const convoUpdates: Partial<Conversation> = {
      status: "handoff",
      ai_enabled: false,
      last_message_at: new Date().toISOString(),
    };
    // Persist name if agent provided one and conversation doesn't already have one
    if (name && !conversation.customer_name) {
      convoUpdates.customer_name = name;
    }
    await updateConversation(conversation.id, convoUpdates);

    // Send the message via WhatsApp
    let waMessageId = "";
    let deliveryFailed = false;
    let deliveryError = "";

    if (!tenant.whatsapp_access_token || !tenant.whatsapp_phone_number_id) {
      deliveryFailed = true;
      deliveryError = "WhatsApp credentials not configured. Go to Settings → Integrations to connect WhatsApp.";
    } else {
      try {
        const whatsapp = createWhatsAppClient(tenant.whatsapp_access_token, tenant.whatsapp_phone_number_id);
        waMessageId = await whatsapp.sendText(normalisedPhone, message);
      } catch (waErr) {
        deliveryFailed = true;
        const rawError = waErr instanceof Error ? waErr.message : "WhatsApp API error";
        console.error("[API] WhatsApp delivery failed (initiate):", rawError);
        if (rawError.includes("470")) {
          deliveryError = "This number hasn't messaged you in the last 24 hours. You can only initiate conversations using a pre-approved message template. Send a regular message once they reply.";
        } else if (rawError.includes("401")) {
          deliveryError = "WhatsApp access token has expired. Go to Settings → Integrations to reconnect.";
        } else if (rawError.includes("400")) {
          deliveryError = "WhatsApp rejected the message. The number may be invalid or not on WhatsApp.";
        } else {
          deliveryError = `WhatsApp delivery failed: ${rawError}`;
        }
      }
    }

    // Save the message to DB regardless
    const saved = await saveMessage({
      conversation_id: conversation.id,
      tenant_id: tenant.id,
      direction: "outbound",
      sender_type: "agent",
      message_type: "text",
      content: { text: message },
      whatsapp_message_id: waMessageId || undefined,
      status: deliveryFailed ? "failed" : "sent",
    });

    // Increment usage on successful send
    if (!deliveryFailed) {
      await incrementMessageUsage(tenant.id);
    }

    // Return the conversation + message so UI can select it immediately
    const responsePayload = {
      conversation: {
        ...conversation,
        status: "handoff",
        ai_enabled: false,
        customer_name: name || conversation.customer_name,
        last_message_at: new Date().toISOString(),
      },
      message: saved,
      ...(deliveryFailed && { deliveryError }),
    };

    return NextResponse.json(responsePayload, { status: deliveryFailed ? 207 : 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[API] Error initiating conversation:", error);
    return NextResponse.json({ error: "Failed to initiate conversation" }, { status: 500 });
  }
}
