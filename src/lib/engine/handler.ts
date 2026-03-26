import { createWhatsAppClient } from "@/lib/whatsapp/client";
import { createAIEngine } from "@/lib/ai/engine";
import {
  getTenantByPhoneNumberId,
  getOrCreateConversation,
  saveMessage,
  getRecentMessageHistory,
  updateConversation,
  updateMessageStatus,
  getAvailableAgent,
} from "@/lib/db/operations";
import type {
  WhatsAppWebhookPayload,
  WhatsAppIncomingMessage,
  Tenant,
  Conversation,
  MessageContent,
  AIContext,
  AIResponse,
} from "@/types";

export async function handleWebhook(payload: WhatsAppWebhookPayload): Promise<void> {
  for (const entry of payload.entry) {
    for (const change of entry.changes) {
      if (change.field !== "messages") continue;

      const { metadata, messages, statuses, contacts } = change.value;
      const phoneNumberId = metadata.phone_number_id;

      // Handle message status updates
      if (statuses) {
        for (const status of statuses) {
          await updateMessageStatus(status.id, status.status);
        }
      }

      // Handle incoming messages
      if (messages && messages.length > 0) {
        const tenant = await getTenantByPhoneNumberId(phoneNumberId);
        if (!tenant) {
          console.warn(`[Handler] No tenant found for phone_number_id: ${phoneNumberId}`);
          continue;
        }

        for (const message of messages) {
          const customerName = contacts?.[0]?.profile?.name;
          await processIncomingMessage(tenant, message, customerName);
        }
      }
    }
  }
}

async function processIncomingMessage(
  tenant: Tenant,
  message: WhatsAppIncomingMessage,
  customerName?: string
): Promise<void> {
  const whatsapp = createWhatsAppClient(tenant.whatsapp_access_token, tenant.whatsapp_phone_number_id);

  try {
    // Mark as read immediately
    await whatsapp.markAsRead(message.id);

    // Get or create conversation
    const conversation = await getOrCreateConversation(
      tenant.id,
      message.from,
      customerName
    );

    // Extract message content
    const content = extractMessageContent(message);

    // Save inbound message
    await saveMessage({
      conversation_id: conversation.id,
      tenant_id: tenant.id,
      direction: "inbound",
      sender_type: "customer",
      message_type: message.type,
      content,
      whatsapp_message_id: message.id,
      status: "delivered",
    });

    // Check if conversation is in handoff mode (human agent)
    if (conversation.status === "handoff") {
      // Don't auto-reply, agent handles it
      return;
    }

    // Check operating hours — if outside hours, send the outside-hours message
    if (isOutsideOperatingHours(tenant)) {
      const outsideMsg = tenant.config.operating_hours?.outside_hours_message
        || "Thanks for reaching out! We're currently outside business hours. We'll get back to you as soon as possible.";
      const waMessageId = await whatsapp.sendText(message.from, outsideMsg);
      await saveMessage({
        conversation_id: conversation.id,
        tenant_id: tenant.id,
        direction: "outbound",
        sender_type: "bot",
        message_type: "text",
        content: { text: outsideMsg },
        whatsapp_message_id: waMessageId,
        status: "sent",
      });
      return;
    }

    // Check if this is a flow button reply (e.g. button ID = "flow_order_tracking")
    const flowResponse = matchFlowTrigger(tenant, message, content);
    if (flowResponse) {
      const waMessageId = await whatsapp.sendText(message.from, flowResponse);
      await saveMessage({
        conversation_id: conversation.id,
        tenant_id: tenant.id,
        direction: "outbound",
        sender_type: "bot",
        message_type: "text",
        content: { text: flowResponse },
        whatsapp_message_id: waMessageId,
        status: "sent",
      });
      return;
    }

    // Check for quick replies first (instant, no AI needed)
    const quickReply = matchQuickReply(tenant, content.text || "", customerName);
    if (quickReply) {
      const waMessageId = await whatsapp.sendText(message.from, quickReply);
      await saveMessage({
        conversation_id: conversation.id,
        tenant_id: tenant.id,
        direction: "outbound",
        sender_type: "bot",
        message_type: "text",
        content: { text: quickReply },
        whatsapp_message_id: waMessageId,
        status: "sent",
      });
      return;
    }

    // Check if this is a new conversation → send welcome
    const history = await getRecentMessageHistory(conversation.id, 20);
    if (history.length <= 1 && tenant.config.welcome_message) {
      const welcomeMsg = tenant.config.welcome_message
        .replace("{customer_name}", customerName || "there")
        .replace("{business_name}", tenant.config.business_name);

      const waMessageId = await whatsapp.sendText(message.from, welcomeMsg);
      await saveMessage({
        conversation_id: conversation.id,
        tenant_id: tenant.id,
        direction: "outbound",
        sender_type: "bot",
        message_type: "text",
        content: { text: welcomeMsg },
        whatsapp_message_id: waMessageId,
        status: "sent",
      });

      // If welcome message has quick reply buttons, send them
      if (tenant.config.flows.length > 0) {
        const mainMenuButtons = tenant.config.flows.slice(0, 3).map((f) => ({
          id: `flow_${f.id}`,
          title: f.name,
        }));
        if (mainMenuButtons.length > 0) {
          const btnMsgId = await whatsapp.sendButtons(
            message.from,
            "How can I help you today?",
            mainMenuButtons
          );
          await saveMessage({
            conversation_id: conversation.id,
            tenant_id: tenant.id,
            direction: "outbound",
            sender_type: "bot",
            message_type: "interactive",
            content: {
              text: "How can I help you today?",
              interactive: {
                type: "button",
                body: "How can I help you today?",
                buttons: mainMenuButtons,
              },
            },
            whatsapp_message_id: btnMsgId,
            status: "sent",
          });
        }
      }
      return;
    }

    // AI-powered response
    if (conversation.ai_enabled) {
      await handleAIResponse(tenant, conversation, message, content, history, whatsapp);
    }
  } catch (error) {
    console.error("[Handler] Error processing message:", error);
    // Send fallback message
    try {
      const fallback = tenant.config.fallback_message || "Sorry, something went wrong. Please try again.";
      await whatsapp.sendText(message.from, fallback);
    } catch {
      console.error("[Handler] Failed to send fallback message");
    }
  }
}

async function handleAIResponse(
  tenant: Tenant,
  conversation: Conversation,
  message: WhatsAppIncomingMessage,
  content: MessageContent,
  history: Array<{ role: "user" | "assistant"; content: string }>,
  whatsapp: ReturnType<typeof createWhatsAppClient>
): Promise<void> {
  const aiEngine = createAIEngine(tenant.openai_api_key);

  const aiContext: AIContext = {
    tenant_config: tenant.config,
    conversation_history: history,
    customer_name: conversation.customer_name || undefined,
  };

  const aiResponse: AIResponse = await aiEngine.generateResponse(aiContext);

  // Update conversation sentiment
  if (aiResponse.sentiment) {
    await updateConversation(conversation.id, { sentiment: aiResponse.sentiment });
  }

  // Handle escalation
  if (aiResponse.should_escalate) {
    await handleEscalation(tenant, conversation, message, aiResponse, whatsapp);
    return;
  }

  // Send AI response with optional action buttons
  if (aiResponse.suggested_actions && aiResponse.suggested_actions.length > 0) {
    const buttons = aiResponse.suggested_actions
      .filter((a) => a.type === "quick_reply" || a.type === "escalate")
      .slice(0, 3)
      .map((a) => ({ id: a.value, title: a.label.slice(0, 20) }));

    if (buttons.length > 0) {
      const waMessageId = await whatsapp.sendButtons(message.from, aiResponse.text, buttons);
      await saveMessage({
        conversation_id: conversation.id,
        tenant_id: tenant.id,
        direction: "outbound",
        sender_type: "bot",
        message_type: "interactive",
        content: {
          text: aiResponse.text,
          interactive: { type: "button", body: aiResponse.text, buttons },
        },
        whatsapp_message_id: waMessageId,
        status: "sent",
      });
      return;
    }
  }

  // Plain text response
  const waMessageId = await whatsapp.sendText(message.from, aiResponse.text);
  await saveMessage({
    conversation_id: conversation.id,
    tenant_id: tenant.id,
    direction: "outbound",
    sender_type: "bot",
    message_type: "text",
    content: { text: aiResponse.text },
    whatsapp_message_id: waMessageId,
    status: "sent",
  });
}

async function handleEscalation(
  tenant: Tenant,
  conversation: Conversation,
  message: WhatsAppIncomingMessage,
  aiResponse: AIResponse,
  whatsapp: ReturnType<typeof createWhatsAppClient>
): Promise<void> {
  const agent = await getAvailableAgent(tenant.id);

  if (agent) {
    await updateConversation(conversation.id, {
      status: "handoff",
      assigned_agent_id: agent.id,
    });
    const handoffMsg = `I'm connecting you with ${agent.name} from our team. They'll be with you shortly!`;
    const waMessageId = await whatsapp.sendText(message.from, handoffMsg);
    await saveMessage({
      conversation_id: conversation.id,
      tenant_id: tenant.id,
      direction: "outbound",
      sender_type: "bot",
      message_type: "text",
      content: { text: handoffMsg },
      whatsapp_message_id: waMessageId,
      status: "sent",
    });
  } else {
    await updateConversation(conversation.id, { status: "waiting" });
    const waitMsg =
      "I'd like to connect you with a team member for better assistance. Our team will get back to you as soon as possible. Thank you for your patience!";
    const waMessageId = await whatsapp.sendText(message.from, waitMsg);
    await saveMessage({
      conversation_id: conversation.id,
      tenant_id: tenant.id,
      direction: "outbound",
      sender_type: "bot",
      message_type: "text",
      content: { text: waitMsg },
      whatsapp_message_id: waMessageId,
      status: "sent",
    });
  }
}

function extractMessageContent(message: WhatsAppIncomingMessage): MessageContent {
  switch (message.type) {
    case "text":
      return { text: message.text?.body || "" };
    case "image":
      return { media_id: message.image?.id, mime_type: message.image?.mime_type, caption: message.image?.caption };
    case "audio":
      return { media_id: message.audio?.id, mime_type: message.audio?.mime_type };
    case "video":
      return { media_id: message.video?.id, mime_type: message.video?.mime_type, caption: message.video?.caption };
    case "document":
      return { media_id: message.document?.id, mime_type: message.document?.mime_type, caption: message.document?.caption };
    case "location":
      return { latitude: message.location?.latitude, longitude: message.location?.longitude };
    case "interactive":
      if (message.interactive?.type === "button_reply") {
        return { text: message.interactive.button_reply?.title || "" };
      }
      if (message.interactive?.type === "list_reply") {
        return { text: message.interactive.list_reply?.title || "" };
      }
      return { text: "" };
    default:
      return { text: "" };
  }
}

function matchQuickReply(tenant: Tenant, text: string, customerName?: string): string | null {
  if (!text) return null;
  const normalizedText = text.toLowerCase().trim();

  for (const qr of tenant.config.quick_replies) {
    const trigger = qr.trigger.toLowerCase();
    let matched = false;
    switch (qr.match_type) {
      case "exact":
        matched = normalizedText === trigger;
        break;
      case "contains":
        matched = normalizedText.includes(trigger);
        break;
      case "regex":
        try {
          matched = new RegExp(qr.trigger, "i").test(normalizedText);
        } catch { /* invalid regex, skip */ }
        break;
    }
    if (matched) {
      return replaceTemplateVars(qr.response, tenant, customerName);
    }
  }
  return null;
}

function replaceTemplateVars(text: string, tenant: Tenant, customerName?: string): string {
  return text
    .replace(/\{customer_name\}/g, customerName || "there")
    .replace(/\{business_name\}/g, tenant.config.business_name || tenant.name);
}

function isOutsideOperatingHours(tenant: Tenant): boolean {
  const opHours = tenant.config.operating_hours;
  if (!opHours?.schedule) return false;

  const now = new Date();
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const today = dayNames[now.getDay()];

  // Support both record format { Monday: {open,close} } and array format [{ day, open, close, enabled }]
  const schedule = opHours.schedule as Record<string, unknown>;
  let open: string | undefined;
  let close: string | undefined;

  if (Array.isArray(schedule)) {
    // Array format from settings page: [{ day: "Monday", open: "09:00", close: "18:00", enabled: true }]
    const dayEntry = schedule.find((d: { day: string; enabled?: boolean }) => d.day === today);
    if (!dayEntry || dayEntry.enabled === false) return true;
    open = dayEntry.open;
    close = dayEntry.close;
  } else {
    // Record format from type definition: { Monday: { open: "09:00", close: "18:00" } | null }
    const dayEntry = schedule[today] as { open: string; close: string } | null | undefined;
    if (!dayEntry) return true;
    open = dayEntry.open;
    close = dayEntry.close;
  }

  if (!open || !close) return true;

  const [openH, openM] = open.split(":").map(Number);
  const [closeH, closeM] = close.split(":").map(Number);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const openMinutes = openH * 60 + (openM || 0);
  const closeMinutes = closeH * 60 + (closeM || 0);

  return currentMinutes < openMinutes || currentMinutes > closeMinutes;
}

function matchFlowTrigger(
  tenant: Tenant,
  message: WhatsAppIncomingMessage,
  content: MessageContent
): string | null {
  // Check for button reply with flow_ prefix
  if (message.type === "interactive" && message.interactive?.type === "button_reply") {
    const buttonId = message.interactive.button_reply?.id || "";
    if (buttonId.startsWith("flow_")) {
      const flowId = buttonId.replace("flow_", "");
      const flow = tenant.config.flows.find((f) => f.id === flowId);
      if (flow && flow.steps?.length > 0) {
        const firstStep = flow.steps[0];
        return firstStep.content || `Let me help you with ${flow.name}.`;
      }
    }
  }

  // Check for text-based flow trigger
  const text = (content.text || "").toLowerCase().trim();
  if (text) {
    for (const flow of tenant.config.flows) {
      if (flow.trigger && text.includes(flow.trigger.toLowerCase())) {
        if (flow.steps?.length > 0) {
          return flow.steps[0].content || `Let me help you with ${flow.name}.`;
        }
      }
    }
  }

  return null;
}
