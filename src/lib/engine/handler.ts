import { createWhatsAppClient } from "@/lib/whatsapp/client";
import { createAIEngine } from "@/lib/ai/engine";
import { makeOutboundCallViaTwilio } from "@/lib/voice/twilio-client";
import { getSupabaseAdmin } from "@/lib/supabase/server";
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
        console.log(`[Handler] Looking up tenant for phone_number_id: ${phoneNumberId}`);
        const tenant = await getTenantByPhoneNumberId(phoneNumberId);
        console.log(`[Handler] Tenant lookup result:`, tenant ? `found ${tenant.name}` : 'null');
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
    console.log(`[Handler] Processing message from ${message.from} (type=${message.type}) for tenant ${tenant.id} (${tenant.name})`);

    // Mark as read immediately
    await whatsapp.markAsRead(message.id);

    // Get or create conversation — isNew only true for brand-new customers
    const { conversation, isNew } = await getOrCreateConversation(
      tenant.id,
      message.from,
      customerName
    );

    console.log(`[Handler] Conversation ${conversation.id}: isNew=${isNew}, status=${conversation.status}, ai_enabled=${conversation.ai_enabled}`);

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

    // Check if conversation is in handoff or waiting mode (human agent pending)
    if (conversation.status === "handoff" || conversation.status === "waiting") {
      console.log(`[Handler] Response path: HANDOFF — conversation ${conversation.id} in ${conversation.status} mode, skipping bot`);
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
      console.log(`[Handler] Response path: LIMIT — message limit reached`);
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
      console.log(`[Handler] Response path: OUTSIDE_HOURS`);
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

    // --- Voice Callback Request Check ---
    const voiceCallbackRequest = checkVoiceCallbackRequest(tenant, content.text || "");
    if (voiceCallbackRequest) {
      console.log(`[Handler] Response path: VOICE_CALLBACK`);
      await handleVoiceCallbackRequest(tenant, conversation, message, whatsapp);
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

    // Check for quick replies (instant, no AI needed)
    const quickReply = matchQuickReply(tenant, content.text || "", customerName);
    if (quickReply) {
      // For existing conversations, skip greeting-type quick replies
      // so the AI can give contextual responses instead of repeating greetings
      const GREETING_TRIGGERS = ["hi", "hello", "hey", "hola", "greetings"];
      const normalizedInput = (content.text || "").toLowerCase().trim();
      const isGreetingInput = GREETING_TRIGGERS.includes(normalizedInput);

      if (!isNew && isGreetingInput) {
        console.log(`[Handler] Skipping greeting quick reply for existing conversation — falling through to AI`);
      } else {
        console.log(`[Handler] Response path: QUICK_REPLY for input="${normalizedInput}"`);
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
    }

    // --- Welcome message: ONLY for brand-new conversations ---
    // Belt-and-suspenders: check both isNew flag AND welcome_sent metadata
    const meta = (conversation.metadata || {}) as Record<string, unknown>;
    const welcomeAlreadySent = !!meta.welcome_sent;
    console.log(`[Handler] Welcome gate: isNew=${isNew}, welcomeAlreadySent=${welcomeAlreadySent}, hasWelcomeMsg=${!!tenant.config.welcome_message}`);

    if (isNew && !welcomeAlreadySent && tenant.config.welcome_message) {
      // Mark welcome as sent FIRST (before actually sending) to prevent race conditions
      await updateConversation(conversation.id, {
        metadata: { ...meta, welcome_sent: true, welcome_sent_at: new Date().toISOString() },
      });

      console.log(`[Handler] New conversation — sending welcome message`);
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

    // --- AI-powered response for all ongoing conversations ---
    let history = await getRecentMessageHistory(conversation.id, 20);
    console.log(`[Handler] AI response path: history.length=${history.length}, ai_enabled=${conversation.ai_enabled}`);

    // --- Repetition guard: detect poisoned history ---
    // If the last 3+ bot responses are identical, the AI is stuck in a loop.
    // Strip the corrupted history so the AI gets a clean slate.
    const assistantMsgs = history.filter(h => h.role === "assistant").map(h => h.content);
    if (assistantMsgs.length >= 3) {
      const tail = assistantMsgs.slice(-3);
      if (tail.every(m => m === tail[0])) {
        console.warn(`[Handler] REPETITION DETECTED: Last 3+ bot responses are identical ("${tail[0].substring(0, 60)}..."). Stripping poisoned history.`);
        // Keep only the current user message so the AI responds to it directly
        const lastUserMsg = history.filter(h => h.role === "user").pop();
        history = lastUserMsg ? [lastUserMsg] : [];
      }
    }

    if (conversation.ai_enabled) {
      console.log(`[Handler] Response path: AI — generating AI response (history=${history.length} msgs)`);
      whatsapp.sendTypingIndicator(message.from).catch(() => {});
      await handleAIResponse(tenant, conversation, message, content, history, whatsapp);
    } else {
      console.log(`[Handler] Response path: AI_DISABLED — ai_enabled=${conversation.ai_enabled} for conversation ${conversation.id}`);
    }
  } catch (error) {
    console.error("[Handler] Response path: FALLBACK — error processing message:", error);
    // Send fallback message
    try {
      const fallback = tenant.config.fallback_message || "Sorry, something went wrong. Please try again.";
      console.log(`[Handler] Sending fallback: "${fallback.substring(0, 80)}..."`);
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
  const supabase = getSupabaseAdmin();
  const keySource = tenant.openai_api_key ? "tenant" : "env";
  console.log(`[Handler] AI engine: keySource=${keySource}, model=${process.env.OPENAI_MODEL || "gpt-4o"}`);
  const aiEngine = createAIEngine(tenant.openai_api_key);

  // Build AI context — include flow state if active
  const flowState = getFlowState(conversation);
  const activeFlow = flowState ? tenant.config.flows.find((f) => f.id === flowState.flow_id) : undefined;

  const aiContext: AIContext = {
    tenant_config: tenant.config,
    tenant_id: tenant.id,
    conversation_history: history,
    customer_name: conversation.customer_name || undefined,
    current_flow: activeFlow,
    flow_step: activeFlow && flowState ? activeFlow.steps[flowState.step_index]?.id : undefined,
    collected_data: flowState?.collected_data,
  };

  const aiResponse: AIResponse = await aiEngine.generateResponse(aiContext);
  console.log(`[Handler] AI response: intent=${aiResponse.detected_intent}, escalate=${aiResponse.should_escalate}, confidence=${aiResponse.confidence}, text_len=${aiResponse.text?.length || 0}`);

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

  // Handle web_call suggestion from AI
  const webCallSuggestion = aiResponse.suggested_actions?.find((a) => a.type === "web_call");
  if (webCallSuggestion) {
    console.log(`[Handler] Response path: WEB_CALL — sending web call link`);
    // NOTE: Don't send AI text when web_call is suggested - the CTA button is the primary response
    // The AI often generates text like "Tap here to talk on a call" which duplicates the button
    // Get default voice agent for the web call link
    const { data: defaultAgent } = await supabase
      .from("voice_agents")
      .select("id")
      .eq("tenant_id", tenant.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    const agentId = defaultAgent?.id || "";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.firstinqueue.com";
    
    // Construct web call URL with tenant and specific voice agent
    const webCallUrl = `${appUrl}/widget/iframe?tenantId=${tenant.id}&agentId=${agentId}`;
    const linkBody = "🎙️ Tap the button below to start a voice call with us.";
    const linkMsgId = await whatsapp.sendCtaUrlButton(message.from, linkBody, "Start Voice Call", webCallUrl);
    await saveMessage({
      conversation_id: conversation.id,
      tenant_id: tenant.id,
      direction: "outbound",
      sender_type: "bot",
      message_type: "interactive",
      content: { text: linkBody },
      whatsapp_message_id: linkMsgId,
      status: "sent",
    });
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
    // Increment agent's active_chats counter atomically
    await getSupabaseAdmin()
      .from("agents")
      .update({ active_chats: agent.active_chats + 1 })
      .eq("id", agent.id);
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
    const trigger = qr.trigger.toLowerCase().trim();

    // Skip empty triggers — they match everything with "contains" (JS: "".includes("") === true)
    if (!trigger) {
      console.warn(`[Handler] Skipping quick reply "${qr.id}" with empty trigger`);
      continue;
    }

    // For non-exact matches, require minimum trigger length to prevent overly broad matching
    if (qr.match_type !== "exact" && trigger.length < 3) {
      console.warn(`[Handler] Skipping quick reply "${qr.id}" — trigger "${trigger}" too short for ${qr.match_type} match`);
      continue;
    }

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
      console.log(`[Handler] Quick reply matched: id="${qr.id}" trigger="${qr.trigger}" (${qr.match_type}) for input="${normalizedText}"`);
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
        escalation_reason: `Flow "${flow.name}" handoff` + (Object.keys(flowState.collected_data).length > 0 ? ` — ${Object.entries(flowState.collected_data).map(([k, v]) => `${k}: ${v}`).join(", ")}` : ""),
        confidence: 1.0,
      }, whatsapp);
      return;
    }

    if (step.type === "action") {
      // Send a confirmation message for the action
      const actionLabels: Record<string, string> = {
        book_appointment: "booking your appointment",
        capture_lead: "saving your details",
        send_confirmation: "sending you a confirmation",
      };
      const actionLabel = actionLabels[step.action || ""] || step.action || "processing";
      const actionMsg = `Got it! I'm ${actionLabel} now...`;
      const waActionId = await whatsapp.sendText(to, actionMsg);
      await saveMessage({
        conversation_id: conversation.id,
        tenant_id: tenant.id,
        direction: "outbound",
        sender_type: "bot",
        message_type: "text",
        content: { text: actionMsg },
        whatsapp_message_id: waActionId,
        status: "sent",
      });
      currentIndex++;
      continue;
    }

    // For condition or other types, advance
    currentIndex++;
  }

  // Flow completed — clear state and send completion message
  await updateConversation(conversation.id, {
    metadata: buildFlowMetadata(null, conversation.metadata as Record<string, unknown>),
  });
  const completionMsg = "That's everything! Is there anything else I can help you with?";
  const waCompletionId = await whatsapp.sendText(to, completionMsg);
  await saveMessage({
    conversation_id: conversation.id,
    tenant_id: tenant.id,
    direction: "outbound",
    sender_type: "bot",
    message_type: "text",
    content: { text: completionMsg },
    whatsapp_message_id: waCompletionId,
    status: "sent",
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

  // Store collected data using a readable key derived from the question content
  const dataKey = currentStep.content
    ? currentStep.content.replace(/[?!.,]/g, "").trim().slice(0, 40)
    : currentStep.id;
  const updatedData = { ...flowState.collected_data, [dataKey]: userResponse };

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
    // Flow completed — clear state and send completion message
    await updateConversation(conversation.id, {
      metadata: buildFlowMetadata(null, conversation.metadata as Record<string, unknown>),
    });
    const doneMsg = "That's everything! Is there anything else I can help you with?";
    const waDoneId = await whatsapp.sendText(message.from, doneMsg);
    await saveMessage({
      conversation_id: conversation.id,
      tenant_id: tenant.id,
      direction: "outbound",
      sender_type: "bot",
      message_type: "text",
      content: { text: doneMsg },
      whatsapp_message_id: waDoneId,
      status: "sent",
    });
    return;
  }

  // Save updated state and send next step
  await updateConversation(conversation.id, {
    metadata: buildFlowMetadata(updatedFlowState, conversation.metadata as Record<string, unknown>),
  });
  await sendFlowStep(tenant, conversation, message.from, flow, nextIndex, updatedFlowState, whatsapp);
}

// --- Voice Callback Functions ---

function checkVoiceCallbackRequest(tenant: Tenant, text: string): boolean {
  if (!text) return false;
  if (!tenant.config.voice_callback_enabled) return false;

  const normalizedText = text.toLowerCase().trim();
  
  // Patterns that indicate a voice callback request
  const callbackPatterns = [
    /^call me$/,
    /^call me please$/,
    /^please call me$/,
    /^can you call me[?]?$/,
    /^call$/,
    /^call me back$/,
    /call me back/,
    /call back/,
    /phone call/,
    /voice call/,
    /speak to someone on the phone/,
    /talk on the phone/,
    /need a call/,
    /request a call/,
    /i want a call/,
    /give me a call/,
    /make a call/,
    /want to talk/,
    /want to speak/,
    /speak to a person/,
    /speak to someone/,
    /talk to someone/,
    /talk to a person/,
  ];

  return callbackPatterns.some((pattern) => pattern.test(normalizedText));
}

async function handleVoiceCallbackRequest(
  tenant: Tenant,
  conversation: Conversation,
  message: WhatsAppIncomingMessage,
  whatsapp: ReturnType<typeof createWhatsAppClient>
): Promise<void> {
  const customerPhone = message.from;
  const supabase = getSupabaseAdmin();

  try {
    // Check voice minute allowance BEFORE doing anything
    const { checkVoiceMinutes } = await import("@/lib/voice/usage");
    const usage = await checkVoiceMinutes(tenant.id);
    if (!usage.allowed) {
      console.log(`[VoiceCallback] Voice minutes exhausted for tenant ${tenant.id}: ${usage.used}/${usage.limit}`);
      const limitMsg = "Sorry, we've used all our voice call minutes for this month. Please continue chatting here and we'll help you right away! 💬";
      const limitId = await whatsapp.sendText(customerPhone, limitMsg);
      await saveMessage({
        conversation_id: conversation.id,
        tenant_id: tenant.id,
        direction: "outbound",
        sender_type: "bot",
        message_type: "text",
        content: { text: limitMsg },
        whatsapp_message_id: limitId,
        status: "sent",
      });
      return;
    }
    console.log(`[VoiceCallback] Voice minutes OK: ${usage.used}/${usage.limit} (remaining: ${usage.remaining})`);

    // Resolve which voice agent to use
    let retellAgentId: string | null = null;
    let voiceAgentId: string | null = null;

    if (tenant.config.voice_callback_agent_id) {
      const { data: agent } = await supabase
        .from("voice_agents")
        .select("id, retell_agent_id")
        .eq("id", tenant.config.voice_callback_agent_id)
        .eq("tenant_id", tenant.id)
        .eq("is_active", true)
        .single();
      if (agent) {
        voiceAgentId = agent.id;
        retellAgentId = agent.retell_agent_id;
      }
    }

    if (!retellAgentId) {
      const { data: agent } = await supabase
        .from("voice_agents")
        .select("id, retell_agent_id")
        .eq("tenant_id", tenant.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (agent) {
        voiceAgentId = agent.id;
        retellAgentId = agent.retell_agent_id;
      }
    }

    if (!retellAgentId) {
      const noAgentMsg = "Sorry, our voice call service isn't set up yet. Please contact us here on WhatsApp and we'll help you shortly.";
      const noAgentId = await whatsapp.sendText(customerPhone, noAgentMsg);
      await saveMessage({
        conversation_id: conversation.id,
        tenant_id: tenant.id,
        direction: "outbound",
        sender_type: "bot",
        message_type: "text",
        content: { text: noAgentMsg },
        whatsapp_message_id: noAgentId,
        status: "sent",
      });
      return;
    }

    // Resolve telephony provider (default: twilio)
    // When set to "web" or "none", phone callbacks are disabled — suggest web call instead
    const voiceProvider = process.env.VOICE_PROVIDER || "twilio";
    if (voiceProvider === "web" || voiceProvider === "none") {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.firstinqueue.com";
      const webCallUrl = `${appUrl}/widget/iframe?tenantId=${tenant.id}&agentId=${voiceAgentId}`;
      const webCallBody = "🎙️ Tap the button below to start a voice call with us.";
      const webCallId = await whatsapp.sendCtaUrlButton(customerPhone, webCallBody, "Start Voice Call", webCallUrl);
      await saveMessage({
        conversation_id: conversation.id,
        tenant_id: tenant.id,
        direction: "outbound",
        sender_type: "bot",
        message_type: "interactive",
        content: { text: webCallBody },
        whatsapp_message_id: webCallId,
        status: "sent",
      });
      return;
    }

    const isTelnyx = voiceProvider === "telnyx";

    let fromNumber = isTelnyx
      ? (process.env.TELNYX_VOICE_NUMBER || "")
      : (process.env.TWILIO_VOICE_NUMBER || "");

    if (!fromNumber) {
      const providerLabel = isTelnyx ? "Telnyx (TELNYX_VOICE_NUMBER)" : "Twilio (TWILIO_VOICE_NUMBER)";
      console.error(`[VoiceCallback] ${providerLabel} not configured — cannot place call`);
      const noNumberMsg = "Sorry, our voice call service isn't fully configured yet. Please continue chatting here and we'll help you.";
      const noNumberId = await whatsapp.sendText(customerPhone, noNumberMsg);
      await saveMessage({
        conversation_id: conversation.id,
        tenant_id: tenant.id,
        direction: "outbound",
        sender_type: "bot",
        message_type: "text",
        content: { text: noNumberMsg },
        whatsapp_message_id: noNumberId,
        status: "sent",
      });
      return;
    }
    if (!fromNumber.startsWith("+")) {
      fromNumber = "+" + fromNumber;
    }

    // Validate phone number format
    const phoneRegex = /^\+[1-9]\d{6,14}$/;
    if (!phoneRegex.test(fromNumber)) {
      console.error(`[VoiceCallback] Invalid fromNumber format: ${fromNumber}`);
      const invalidNumMsg = "Sorry, our voice call number isn't configured correctly. Please continue chatting here.";
      const invalidNumId = await whatsapp.sendText(customerPhone, invalidNumMsg);
      await saveMessage({
        conversation_id: conversation.id,
        tenant_id: tenant.id,
        direction: "outbound",
        sender_type: "bot",
        message_type: "text",
        content: { text: invalidNumMsg },
        whatsapp_message_id: invalidNumId,
        status: "sent",
      });
      return;
    }

    const toNumber = customerPhone.startsWith("+") ? customerPhone : "+" + customerPhone;

    // Send confirmation BEFORE placing the call
    const confirmMsg = "Sure! I'll call you right now — please keep your phone ready. 📞";
    const waMessageId = await whatsapp.sendText(customerPhone, confirmMsg);
    await saveMessage({
      conversation_id: conversation.id,
      tenant_id: tenant.id,
      direction: "outbound",
      sender_type: "bot",
      message_type: "text",
      content: { text: confirmMsg },
      whatsapp_message_id: waMessageId,
      status: "sent",
    });

    // Place the outbound call — provider determined by VOICE_PROVIDER env var
    // Cap WhatsApp callbacks at 3 minutes to prevent runaway charges
    let retellCallId: string;
    let providerCallId: string;

    if (isTelnyx) {
      const { makeOutboundCallViaTelnyx } = await import("@/lib/voice/telnyx-client");
      const telnyxResult = await makeOutboundCallViaTelnyx({
        fromNumber,
        toNumber,
        retellAgentId,
        maxCallDurationSeconds: 180,
        metadata: {
          tenant_id: tenant.id,
          conversation_id: conversation.id,
          call_type: "whatsapp_callback",
          customer_phone: customerPhone,
        },
        dynamicVariables: {
          customer_phone: customerPhone,
          conversation_id: conversation.id,
        },
      });
      retellCallId = telnyxResult.retell_call_id;
      providerCallId = telnyxResult.call_id;
      console.log(`[VoiceCallback] Telnyx call initiated: id=${providerCallId} retellCallId=${retellCallId}`);
    } else {
      const twilioResult = await makeOutboundCallViaTwilio({
        fromNumber,
        toNumber,
        retellAgentId,
        maxCallDurationSeconds: 180,
        metadata: {
          tenant_id: tenant.id,
          conversation_id: conversation.id,
          call_type: "whatsapp_callback",
          customer_phone: customerPhone,
        },
        dynamicVariables: {
          customer_phone: customerPhone,
          conversation_id: conversation.id,
        },
      });
      retellCallId = twilioResult.retell_call_id;
      providerCallId = twilioResult.call_id;
      console.log(`[VoiceCallback] Twilio call initiated: sid=${providerCallId} retellCallId=${retellCallId}`);
    }

    // Log the callback
    await supabase.from("voice_callbacks").insert({
      tenant_id: tenant.id,
      conversation_id: conversation.id,
      customer_phone: customerPhone,
      voice_agent_id: voiceAgentId,
      retell_call_id: retellCallId,
      twilio_call_id: providerCallId,
      status: "initiated",
      initiated_at: new Date().toISOString(),
      metadata: { telephony_provider: voiceProvider },

    });

    // Follow-up message
    const followUpMsg = `Calling you now from ${fromNumber}! Please answer — you'll be connected to our AI assistant. 🤖📞`;
    const followUpId = await whatsapp.sendText(customerPhone, followUpMsg);
    await saveMessage({
      conversation_id: conversation.id,
      tenant_id: tenant.id,
      direction: "outbound",
      sender_type: "bot",
      message_type: "text",
      content: { text: followUpMsg },
      whatsapp_message_id: followUpId,
      status: "sent",
    });

  } catch (error) {
    console.error("[VoiceCallback] Error handling request:", error);
    
    const errorMsg = "Sorry, there was an issue placing the call. Please try again later or continue chatting here.";
    const errorWaId = await whatsapp.sendText(customerPhone, errorMsg);
    await saveMessage({
      conversation_id: conversation.id,
      tenant_id: tenant.id,
      direction: "outbound",
      sender_type: "bot",
      message_type: "text",
      content: { text: errorMsg },
      whatsapp_message_id: errorWaId,
      status: "sent",
    });
  }
}
