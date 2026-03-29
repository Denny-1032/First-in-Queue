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
import { checkMessageUsage, incrementMessageUsage } from "@/lib/lipila/usage";
import type {
  WhatsAppWebhookPayload,
  WhatsAppIncomingMessage,
  Tenant,
  Conversation,
  MessageContent,
  AIContext,
  AIResponse,
  ConversationFlow,
} from "@/types";

// --- Flow State Management ---

interface FlowState {
  flow_id: string;
  step_index: number;
  collected_data: Record<string, string>;
  started_at: string;
}

function getFlowState(conversation: Conversation): FlowState | null {
  const meta = conversation.metadata as Record<string, unknown> | null;
  if (!meta?.active_flow) return null;
  return meta.active_flow as FlowState;
}

function buildFlowMetadata(flowState: FlowState | null, existingMeta?: Record<string, unknown>): Record<string, unknown> {
  const base = existingMeta || {};
  if (flowState) {
    return { ...base, active_flow: flowState };
  }
  const { active_flow: _, ...rest } = base as Record<string, unknown> & { active_flow?: unknown };
  return rest;
}

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

    // Check plan message limit before generating any bot response
    const usage = await checkMessageUsage(tenant.id);
    if (!usage.allowed) {
      const limitMsg =
        `We've reached our monthly message limit (${usage.messagesLimit.toLocaleString()} messages). ` +
        `Please contact the business directly or try again next month. We apologise for the inconvenience!`;
      const waLimitId = await whatsapp.sendText(message.from, limitMsg);
      await saveMessage({
        conversation_id: conversation.id,
        tenant_id: tenant.id,
        direction: "outbound",
        sender_type: "bot",
        message_type: "text",
        content: { text: limitMsg },
        whatsapp_message_id: waLimitId,
        status: "sent",
      });
      return;
    }

    // Increment message counter (all paths below send a bot response)
    await incrementMessageUsage(tenant.id);

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

    // --- Pre-AI urgent escalation check ---
    const urgentEscalation = checkUrgentEscalation(tenant, content.text || "");
    if (urgentEscalation) {
      await handleEscalation(tenant, conversation, message, {
        text: urgentEscalation.safetyMessage,
        should_escalate: true,
        escalation_reason: urgentEscalation.reason,
        confidence: 1.0,
      }, whatsapp);
      return;
    }

    // --- Active flow: progress through steps ---
    const flowState = getFlowState(conversation);
    if (flowState) {
      const flow = tenant.config.flows.find((f) => f.id === flowState.flow_id);
      if (flow) {
        await processFlowStep(tenant, conversation, message, content, flow, flowState, whatsapp);
        return;
      }
      // Flow no longer exists — clear stale state
      await updateConversation(conversation.id, {
        metadata: buildFlowMetadata(null, conversation.metadata as Record<string, unknown>),
      });
    }

    // --- Check if this triggers a new flow (button reply or text match) ---
    const flowMatch = matchFlowTrigger(tenant, message, content);
    if (flowMatch) {
      // Initialize flow state and send first step
      const newFlowState: FlowState = {
        flow_id: flowMatch.flow.id,
        step_index: 0,
        collected_data: {},
        started_at: new Date().toISOString(),
      };
      await updateConversation(conversation.id, {
        metadata: buildFlowMetadata(newFlowState, conversation.metadata as Record<string, unknown>),
      });
      await sendFlowStep(tenant, conversation, message.from, flowMatch.flow, 0, newFlowState, whatsapp);
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
      // Show typing indicator while AI processes
      whatsapp.sendTypingIndicator(message.from).catch(() => {});
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

  // Build AI context — include flow state if active
  const flowState = getFlowState(conversation);
  const activeFlow = flowState ? tenant.config.flows.find((f) => f.id === flowState.flow_id) : undefined;

  const aiContext: AIContext = {
    tenant_config: tenant.config,
    conversation_history: history,
    customer_name: conversation.customer_name || undefined,
    current_flow: activeFlow,
    flow_step: activeFlow && flowState ? activeFlow.steps[flowState.step_index]?.id : undefined,
    collected_data: flowState?.collected_data,
  };

  const aiResponse: AIResponse = await aiEngine.generateResponse(aiContext);

  // Update conversation sentiment
  if (aiResponse.sentiment) {
    await updateConversation(conversation.id, { sentiment: aiResponse.sentiment });
  }

  // Handle escalation
  if (aiResponse.should_escalate) {
    // Clear any active flow before escalating
    if (flowState) {
      await updateConversation(conversation.id, {
        metadata: buildFlowMetadata(null, conversation.metadata as Record<string, unknown>),
      });
    }
    await handleEscalation(tenant, conversation, message, aiResponse, whatsapp);
    return;
  }

  // Handle flow suggestion from AI
  const flowSuggestion = aiResponse.suggested_actions?.find((a) => a.type === "flow");
  if (flowSuggestion && !flowState) {
    const suggestedFlow = tenant.config.flows.find(
      (f) => f.trigger === flowSuggestion.value || f.id === flowSuggestion.value
    );
    if (suggestedFlow) {
      // Send AI text first, then start the flow
      if (aiResponse.text) {
        const textMsgId = await whatsapp.sendText(message.from, aiResponse.text);
        await saveMessage({
          conversation_id: conversation.id,
          tenant_id: tenant.id,
          direction: "outbound",
          sender_type: "bot",
          message_type: "text",
          content: { text: aiResponse.text },
          whatsapp_message_id: textMsgId,
          status: "sent",
        });
      }
      const newFlowState: FlowState = {
        flow_id: suggestedFlow.id,
        step_index: 0,
        collected_data: {},
        started_at: new Date().toISOString(),
      };
      await updateConversation(conversation.id, {
        metadata: buildFlowMetadata(newFlowState, conversation.metadata as Record<string, unknown>),
      });
      await sendFlowStep(tenant, conversation, message.from, suggestedFlow, 0, newFlowState, whatsapp);
      return;
    }
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
  // Send AI's safety/context message first (e.g. "Lock your card NOW" for fraud)
  if (aiResponse.text) {
    const safetyMsgId = await whatsapp.sendText(message.from, aiResponse.text);
    await saveMessage({
      conversation_id: conversation.id,
      tenant_id: tenant.id,
      direction: "outbound",
      sender_type: "bot",
      message_type: "text",
      content: { text: aiResponse.text },
      whatsapp_message_id: safetyMsgId,
      status: "sent",
    });
  }

  const agent = await getAvailableAgent(tenant.id);

  if (agent) {
    await updateConversation(conversation.id, {
      status: "handoff",
      assigned_agent_id: agent.id,
      metadata: {
        ...(conversation.metadata as Record<string, unknown>),
        escalation_reason: aiResponse.escalation_reason,
        escalated_at: new Date().toISOString(),
      },
    });
    const handoffMsg = `I'm connecting you with ${agent.name} from our team right now. They'll be with you shortly!`;
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
    await updateConversation(conversation.id, {
      status: "waiting",
      metadata: {
        ...(conversation.metadata as Record<string, unknown>),
        escalation_reason: aiResponse.escalation_reason,
        escalated_at: new Date().toISOString(),
      },
    });
    const waitMsg =
      "I'm connecting you with a team member for the best assistance. Our team will reach out to you very soon. Thank you for your patience!";
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
): { flow: ConversationFlow } | null {
  // Check for button reply with flow_ prefix
  if (message.type === "interactive" && message.interactive?.type === "button_reply") {
    const buttonId = message.interactive.button_reply?.id || "";
    if (buttonId.startsWith("flow_")) {
      const flowId = buttonId.replace("flow_", "");
      const flow = tenant.config.flows.find((f) => f.id === flowId);
      if (flow && flow.steps?.length > 0) {
        return { flow };
      }
    }
  }

  // Check for text-based flow trigger
  const text = (content.text || "").toLowerCase().trim();
  if (text) {
    for (const flow of tenant.config.flows) {
      if (flow.trigger && text.includes(flow.trigger.toLowerCase())) {
        if (flow.steps?.length > 0) {
          return { flow };
        }
      }
    }
  }

  return null;
}

// --- Pre-AI Urgent Escalation Check ---

function checkUrgentEscalation(
  tenant: Tenant,
  text: string
): { reason: string; safetyMessage: string } | null {
  if (!text) return null;
  const normalizedText = text.toLowerCase();

  const urgentRules = tenant.config.escalation_rules.filter(
    (r) => r.priority === "urgent" && r.trigger === "keyword"
  );

  for (const rule of urgentRules) {
    if (normalizedText.includes(rule.value.toLowerCase())) {
      // Generate industry-specific safety messages for critical keywords
      const safetyMessage = getUrgentSafetyMessage(tenant.config.industry, rule.value);
      return {
        reason: `Urgent keyword detected: "${rule.value}"`,
        safetyMessage,
      };
    }
  }

  return null;
}

function getUrgentSafetyMessage(industry: string, keyword: string): string {
  // Industry-specific immediate safety responses
  const safetyMessages: Record<string, Record<string, string>> = {
    healthcare: {
      emergency: "🚨 If this is a medical emergency, please call 911 immediately. Do not wait for a chat response. I'm connecting you with our medical team now.",
      "chest pain": "🚨 CALL 911 IMMEDIATELY for chest pain. Do not drive yourself. I'm alerting our team.",
      "can't breathe": "🚨 CALL 911 IMMEDIATELY for difficulty breathing. I'm alerting our team now.",
      bleeding: "🚨 For severe bleeding, call 911 immediately. Apply direct pressure to the wound. I'm connecting you with our medical team.",
      "allergic reaction": "🚨 For severe allergic reaction, call 911. If you have an EpiPen, use it now. I'm alerting our team.",
      "medication error": "🚨 Do NOT take any more of the medication. Call Poison Control at 1-800-222-1222 if ingested. I'm connecting you with our medical team immediately.",
      "wrong medication": "🚨 Do NOT take the medication. Contact Poison Control at 1-800-222-1222 if you've already taken it. I'm escalating this to our medical team immediately.",
      malpractice: "I understand this is a serious concern. I'm connecting you with our patient advocacy team immediately so they can address this properly.",
      overdose: "🚨 CALL 911 IMMEDIATELY. If available, administer Narcan (naloxone). Stay with the person. I'm alerting our medical team.",
    },
    finance: {
      fraud: "🚨 LOCK YOUR CARD NOW: App → Settings → Card Management → Lock Card. Or call our 24/7 fraud hotline: (555) 444-5501. I'm connecting you with our fraud team.",
      stolen: "🚨 LOCK YOUR CARD IMMEDIATELY in the app or call (555) 444-5501. You have $0 liability for unauthorized transactions. I'm connecting you with our security team.",
      unauthorized: "🚨 Lock your card NOW in the app as a precaution. Then I'll connect you with our fraud team. You have $0 liability for unauthorized transactions.",
      hacked: "🚨 Change your password IMMEDIATELY and lock all cards. Call our security hotline: (555) 444-5501. I'm connecting you with our security team now.",
      scam: "🚨 Do NOT share any more information or send any money. Lock your card in the app. I'm connecting you with our fraud team immediately.",
      "identity theft": "🚨 Lock all cards immediately. Do NOT respond to any suspicious contacts. I'm connecting you with our identity theft protection team.",
    },
    travel: {
      stranded: "🚨 I'm here to help. Please also call our 24/7 emergency line: (555) 888-7766 for the fastest assistance. I'm connecting you with an agent right now.",
      emergency: "🚨 If this is a medical emergency, call local emergency services first. Our 24/7 line: (555) 888-7766. I'm escalating this immediately.",
      "flight cancelled": "I'm sorry about your flight cancellation. I'm connecting you with our emergency rebooking team right now. Also call (555) 888-7766 for fastest help.",
      "missed flight": "I understand how stressful this is. Head to the airline's transfer desk immediately. I'm also connecting you with our team. Call (555) 888-7766.",
      "lost passport": "🚨 Contact your nearest embassy/consulate immediately. I'm connecting you with our emergency support team. Also call (555) 888-7766.",
      stolen: "🚨 File a police report immediately at your current location. I'm connecting you with our emergency team. Call (555) 888-7766 for immediate help.",
      medical: "🚨 Call local emergency services first. If you have travel insurance, your policy number is in your booking confirmation. I'm connecting you with our emergency team.",
    },
    education: {
      discrimination: "I take this very seriously. I'm connecting you immediately with the Dean of Students office who can properly investigate and address this.",
      safety: "🚨 If you're in immediate danger, call campus security at (555) 222-3399 or 911. I'm alerting our safety team now.",
      harassment: "I'm sorry you're experiencing this. I'm connecting you immediately with the Dean of Students office. You can also reach campus security at (555) 222-3399.",
      bullying: "I'm sorry you're going through this. I'm connecting you with the Dean of Students office immediately to address this properly.",
      suicide: "🚨 Please reach out to the 988 Suicide & Crisis Lifeline — call or text 988. Campus counseling is available at (555) 222-3345. You are not alone. I'm connecting you with support now.",
      "self-harm": "🚨 Please contact the 988 Suicide & Crisis Lifeline (call or text 988). Campus counseling: (555) 222-3345. I'm connecting you with our support team immediately.",
    },
    saas: {
      outage: "We're aware of the issue. Check status.cloudsync.io for real-time updates. I'm connecting you with our engineering team for direct assistance.",
      "data loss": "🚨 I'm escalating this to our engineering team immediately. Do NOT make any changes to your account. We'll investigate and help recover your data.",
      "data deleted": "🚨 I'm connecting you with our engineering team right now. We maintain backups and will work to recover your data. Do NOT make any changes.",
      "security breach": "🚨 Change your password immediately. Enable 2FA if not already active. I'm connecting you with our security team for a full investigation.",
      down: "We're investigating the issue. Check status.cloudsync.io for updates. I'm connecting you with our support team for assistance.",
    },
  };

  const industryMessages = safetyMessages[industry];
  if (industryMessages) {
    // Try exact match first, then partial match
    if (industryMessages[keyword]) return industryMessages[keyword];
    for (const [key, msg] of Object.entries(industryMessages)) {
      if (keyword.includes(key) || key.includes(keyword)) return msg;
    }
  }

  // Generic fallback for any industry
  return "I understand the urgency. I'm connecting you with a team member right away for the best assistance.";
}

// --- Multi-Step Flow Processing ---

async function sendFlowStep(
  tenant: Tenant,
  conversation: Conversation,
  to: string,
  flow: ConversationFlow,
  stepIndex: number,
  flowState: FlowState,
  whatsapp: ReturnType<typeof createWhatsAppClient>
): Promise<void> {
  // Process consecutive non-question steps (messages, actions) then stop at next question or end
  let currentIndex = stepIndex;

  while (currentIndex < flow.steps.length) {
    const step = flow.steps[currentIndex];

    if (step.type === "message") {
      // Send the message and continue to next step
      const msgText = step.content || "";
      if (msgText) {
        const waMessageId = await whatsapp.sendText(to, msgText);
        await saveMessage({
          conversation_id: conversation.id,
          tenant_id: tenant.id,
          direction: "outbound",
          sender_type: "bot",
          message_type: "text",
          content: { text: msgText },
          whatsapp_message_id: waMessageId,
          status: "sent",
        });
      }
      currentIndex++;
      continue;
    }

    if (step.type === "question") {
      // Send the question and wait for user response
      const questionText = step.content || "";

      // If step has options, send as buttons (max 3) or list (more than 3)
      if (step.options && step.options.length > 0) {
        if (step.options.length <= 3) {
          const buttons = step.options.map((opt) => ({
            id: `step_${step.id}_${opt.value}`,
            title: opt.label.slice(0, 20),
          }));
          const waMessageId = await whatsapp.sendButtons(to, questionText, buttons);
          await saveMessage({
            conversation_id: conversation.id,
            tenant_id: tenant.id,
            direction: "outbound",
            sender_type: "bot",
            message_type: "interactive",
            content: {
              text: questionText,
              interactive: { type: "button", body: questionText, buttons },
            },
            whatsapp_message_id: waMessageId,
            status: "sent",
          });
        } else {
          // Use list message for many options
          const rows = step.options.map((opt) => ({
            id: `step_${step.id}_${opt.value}`,
            title: opt.label.slice(0, 24),
          }));
          const waMessageId = await whatsapp.sendList(
            to,
            questionText,
            "Select an option",
            [{ title: "Options", rows }]
          );
          await saveMessage({
            conversation_id: conversation.id,
            tenant_id: tenant.id,
            direction: "outbound",
            sender_type: "bot",
            message_type: "interactive",
            content: {
              text: questionText,
              interactive: { type: "list", body: questionText, sections: [{ title: "Options", rows }] },
            },
            whatsapp_message_id: waMessageId,
            status: "sent",
          });
        }
      } else {
        // Free-text question
        const waMessageId = await whatsapp.sendText(to, questionText);
        await saveMessage({
          conversation_id: conversation.id,
          tenant_id: tenant.id,
          direction: "outbound",
          sender_type: "bot",
          message_type: "text",
          content: { text: questionText },
          whatsapp_message_id: waMessageId,
          status: "sent",
        });
      }

      // Update flow state to wait at this question step
      const updatedState: FlowState = {
        ...flowState,
        step_index: currentIndex,
      };
      await updateConversation(conversation.id, {
        metadata: buildFlowMetadata(updatedState, conversation.metadata as Record<string, unknown>),
      });
      return; // Wait for user response
    }

    if (step.type === "handoff") {
      // End flow and escalate to agent
      await updateConversation(conversation.id, {
        metadata: buildFlowMetadata(null, conversation.metadata as Record<string, unknown>),
      });
      await handleEscalation(tenant, conversation, { from: to } as WhatsAppIncomingMessage, {
        text: "",
        should_escalate: true,
        escalation_reason: `Flow "${flow.name}" handoff with data: ${JSON.stringify(flowState.collected_data)}`,
        confidence: 1.0,
      }, whatsapp);
      return;
    }

    // For action or condition types, advance for now
    currentIndex++;
  }

  // Flow completed — clear state
  await updateConversation(conversation.id, {
    metadata: buildFlowMetadata(null, conversation.metadata as Record<string, unknown>),
  });
}

async function processFlowStep(
  tenant: Tenant,
  conversation: Conversation,
  message: WhatsAppIncomingMessage,
  content: MessageContent,
  flow: ConversationFlow,
  flowState: FlowState,
  whatsapp: ReturnType<typeof createWhatsAppClient>
): Promise<void> {
  const currentStep = flow.steps[flowState.step_index];
  if (!currentStep) {
    // Flow complete or invalid state — clear
    await updateConversation(conversation.id, {
      metadata: buildFlowMetadata(null, conversation.metadata as Record<string, unknown>),
    });
    return;
  }

  // Collect the user's response for the current question step
  const userResponse = content.text || "";

  // Check if user wants to exit the flow
  if (userResponse.toLowerCase() === "cancel" || userResponse.toLowerCase() === "exit" || userResponse.toLowerCase() === "quit") {
    await updateConversation(conversation.id, {
      metadata: buildFlowMetadata(null, conversation.metadata as Record<string, unknown>),
    });
    const cancelMsg = "No problem! I've cancelled the current process. How else can I help you?";
    const waMessageId = await whatsapp.sendText(message.from, cancelMsg);
    await saveMessage({
      conversation_id: conversation.id,
      tenant_id: tenant.id,
      direction: "outbound",
      sender_type: "bot",
      message_type: "text",
      content: { text: cancelMsg },
      whatsapp_message_id: waMessageId,
      status: "sent",
    });
    return;
  }

  // Store collected data using step ID as key
  const updatedData = { ...flowState.collected_data, [currentStep.id]: userResponse };

  // Determine next step — if current step has options with next_step routing, use that
  let nextIndex = flowState.step_index + 1;
  if (currentStep.options && currentStep.options.length > 0) {
    // Check if user selected a specific option (button reply)
    const selectedOption = currentStep.options.find((opt) => {
      const buttonId = message.interactive?.button_reply?.id || message.interactive?.list_reply?.id || "";
      return buttonId === `step_${currentStep.id}_${opt.value}` || userResponse.toLowerCase() === opt.label.toLowerCase();
    });
    if (selectedOption?.next_step) {
      const targetIndex = flow.steps.findIndex((s) => s.id === selectedOption.next_step);
      if (targetIndex >= 0) nextIndex = targetIndex;
    }
  }

  // If step has a condition, evaluate it
  if (currentStep.condition) {
    const fieldValue = updatedData[currentStep.condition.field] || "";
    let conditionMet = false;
    switch (currentStep.condition.operator) {
      case "equals":
        conditionMet = fieldValue.toLowerCase() === currentStep.condition.value.toLowerCase();
        break;
      case "contains":
        conditionMet = fieldValue.toLowerCase().includes(currentStep.condition.value.toLowerCase());
        break;
      case "gt":
        conditionMet = parseFloat(fieldValue) > parseFloat(currentStep.condition.value);
        break;
      case "lt":
        conditionMet = parseFloat(fieldValue) < parseFloat(currentStep.condition.value);
        break;
    }
    const targetStepId = conditionMet ? currentStep.condition.true_step : currentStep.condition.false_step;
    const targetIndex = flow.steps.findIndex((s) => s.id === targetStepId);
    if (targetIndex >= 0) nextIndex = targetIndex;
  }

  // Update flow state
  const updatedFlowState: FlowState = {
    ...flowState,
    step_index: nextIndex,
    collected_data: updatedData,
  };

  if (nextIndex >= flow.steps.length) {
    // Flow completed — clear state
    await updateConversation(conversation.id, {
      metadata: buildFlowMetadata(null, conversation.metadata as Record<string, unknown>),
    });
    return;
  }

  // Save updated state and send next step
  await updateConversation(conversation.id, {
    metadata: buildFlowMetadata(updatedFlowState, conversation.metadata as Record<string, unknown>),
  });
  await sendFlowStep(tenant, conversation, message.from, flow, nextIndex, updatedFlowState, whatsapp);
}
