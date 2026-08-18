import { describe, it, expect, beforeEach, vi } from "vitest";
import type {
  Tenant,
  Conversation,
  WhatsAppIncomingMessage,
  WhatsAppWebhookPayload,
  BusinessConfig,
  AIResponse,
} from "@/types";

// =============================================
// Characterization tests for the WhatsApp message handler.
// -----------------------------------------------
// These pin down the CURRENT behaviour of processIncomingMessage's routing so
// the upcoming ChannelTransport refactor (spec §2 / block 4) can be verified to
// change nothing on the WhatsApp path. They are a safety net, not a spec — if a
// test here fails during the refactor, the refactor changed behaviour.
//
// Strategy: mock every I/O boundary module, drive the real routing through the
// exported handleWebhook, and assert which transport method fired with what.
// =============================================

// --- Shared transport spy (returned by the mocked createWhatsAppClient) ---
// Mocks are intentionally loosely typed: these stand in for network/db calls and
// the tests assert on recorded arguments, not on their declared shapes.
/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyFn = (...args: any[]) => any;

const transport = vi.hoisted(() => ({
  channel: "whatsapp" as const,
  capabilities: {
    buttons: true,
    lists: true,
    media: true,
    maxButtons: 3,
    maxButtonTitleLength: 20,
    readReceipts: true,
    typingIndicator: true,
  },
  sendText: vi.fn<AnyFn>(async () => "wamid.out"),
  sendButtons: vi.fn<AnyFn>(async () => "wamid.btn"),
  sendList: vi.fn<AnyFn>(async () => "wamid.list"),
  sendImage: vi.fn<AnyFn>(async () => "wamid.img"),
  sendDocument: vi.fn<AnyFn>(async () => "wamid.doc"),
  sendCtaUrlButton: vi.fn<AnyFn>(async () => "wamid.cta"),
  markAsRead: vi.fn<AnyFn>(async () => {}),
  sendTypingIndicator: vi.fn<AnyFn>(async () => {}),
}));

const db = vi.hoisted(() => ({
  getTenantByPhoneNumberId: vi.fn<AnyFn>(),
  getOrCreateConversation: vi.fn<AnyFn>(),
  saveMessage: vi.fn<AnyFn>(async () => ({ id: "msg-1" })),
  getRecentMessageHistory: vi.fn<AnyFn>(async () => []),
  updateConversation: vi.fn<AnyFn>(async () => {}),
  updateMessageStatus: vi.fn<AnyFn>(async () => {}),
  getAvailableAgent: vi.fn<AnyFn>(async () => null),
  getBooking: vi.fn<AnyFn>(async () => null),
  createBooking: vi.fn<AnyFn>(async () => null),
  updateBooking: vi.fn<AnyFn>(async () => null),
  cancelBooking: vi.fn<AnyFn>(async () => null),
}));

const ai = vi.hoisted(() => ({
  generateResponse: vi.fn<AnyFn>(async () => ({
    text: "AI answer",
    should_escalate: false,
    confidence: 0.9,
  })),
}));

const usage = vi.hoisted(() => ({
  consumeConversation: vi.fn<AnyFn>(async () => ({
    allowed: true,
    conversationsLimit: 1000,
    conversationsUsed: 1,
    windowOpen: false,
  })),
  incrementMessageUsage: vi.fn<AnyFn>(async () => {}),
}));

vi.mock("@/lib/whatsapp/client", () => ({
  createWhatsAppClient: vi.fn(() => transport),
  WhatsAppClient: class {},
}));
const notify = vi.hoisted(() => ({ notifyEscalation: vi.fn<AnyFn>(async () => ({ notified: 1 })) }));
vi.mock("@/lib/notifications/escalation", () => notify);

vi.mock("@/lib/db/operations", () => db);
vi.mock("@/lib/ai/engine", () => ({
  createAIEngine: vi.fn(() => ({ generateResponse: ai.generateResponse })),
}));
vi.mock("@/lib/lipila/usage", () => usage);
vi.mock("@/lib/booking/extract", () => ({ extractBookingFromCollectedData: vi.fn(() => null) }));
vi.mock("@/lib/voice/twilio-client", () => ({ makeOutboundCallViaTwilio: vi.fn(async () => ({})) }));
vi.mock("@/lib/supabase/server", () => {
  const chain: Record<string, unknown> = {};
  const methods = ["from", "select", "update", "insert", "eq", "order", "limit"];
  for (const m of methods) chain[m] = vi.fn(() => chain);
  chain.single = vi.fn(async () => ({ data: null, error: null }));
  chain.maybeSingle = vi.fn(async () => ({ data: null, error: null }));
  return { getSupabaseAdmin: vi.fn(() => chain) };
});

import { handleWebhook, processIncomingMessage } from "@/lib/engine/handler";

// --- Fixture factories ---

function makeConfig(overrides: Partial<BusinessConfig> = {}): BusinessConfig {
  return {
    business_name: "Acme Ltd",
    industry: "other",
    description: "A test business",
    personality: { name: "Ava", tone: "friendly", emoji_usage: "minimal", response_style: "balanced" },
    welcome_message: "Hi {customer_name}, welcome to {business_name}!",
    fallback_message: "Sorry, something went wrong.",
    languages: ["en"],
    default_language: "en",
    knowledge_base: [],
    faqs: [],
    quick_replies: [],
    flows: [],
    escalation_rules: [],
    custom_instructions: "",
    ...overrides,
  };
}

function makeTenant(configOverrides: Partial<BusinessConfig> = {}): Tenant {
  return {
    id: "tenant-1",
    name: "Acme",
    slug: "acme",
    whatsapp_phone_number_id: "PN1",
    whatsapp_access_token: "token",
    whatsapp_business_account_id: "WABA1",
    config: makeConfig(configOverrides),
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

function makeConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: "conv-1",
    tenant_id: "tenant-1",
    customer_phone: "260970000000",
    customer_name: "Alice",
    status: "active",
    ai_enabled: true,
    sentiment: null,
    tags: [],
    metadata: {},
    last_message_at: "2026-01-01T00:00:00Z",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeTextMessage(body: string): WhatsAppIncomingMessage {
  return { from: "260970000000", id: "wamid.in", timestamp: "0", type: "text", text: { body } };
}

function makePayload(msg: WhatsAppIncomingMessage): WhatsAppWebhookPayload {
  return {
    entry: [
      {
        changes: [
          {
            field: "messages",
            value: {
              metadata: { phone_number_id: "PN1", display_phone_number: "+260..." },
              messages: [msg],
              contacts: [{ profile: { name: "Alice" }, wa_id: "260970000000" }],
            },
          },
        ],
      },
    ],
  } as unknown as WhatsAppWebhookPayload;
}

/** Set the tenant + conversation the handler will see for this run. */
function arrange(opts: { tenant?: Tenant; conversation?: Conversation; isNew?: boolean } = {}) {
  const tenant = opts.tenant ?? makeTenant();
  const conversation = opts.conversation ?? makeConversation();
  db.getTenantByPhoneNumberId.mockResolvedValue(tenant);
  db.getOrCreateConversation.mockResolvedValue({ conversation, isNew: opts.isNew ?? false });
  return { tenant, conversation };
}

beforeEach(() => {
  vi.clearAllMocks();
  // Restore permissive defaults cleared above.
  db.saveMessage.mockResolvedValue({ id: "msg-1" });
  db.getRecentMessageHistory.mockResolvedValue([]);
  notify.notifyEscalation.mockResolvedValue({ notified: 1 });
  db.getAvailableAgent.mockResolvedValue(null);
  ai.generateResponse.mockResolvedValue({ text: "AI answer", should_escalate: false, confidence: 0.9 });
  usage.consumeConversation.mockResolvedValue({
    allowed: true,
    conversationsLimit: 1000,
    conversationsUsed: 1,
    windowOpen: false,
  });
});

describe("processIncomingMessage routing (WhatsApp)", () => {
  it("sends the welcome message for a brand-new conversation", async () => {
    arrange({ isNew: true, conversation: makeConversation({ metadata: {} }) });

    await handleWebhook(makePayload(makeTextMessage("hello")));

    expect(transport.sendText).toHaveBeenCalledTimes(1);
    expect(transport.sendText).toHaveBeenCalledWith("260970000000", "Hi Alice, welcome to Acme Ltd!");
    // welcome_sent is persisted before sending to guard against races
    expect(db.updateConversation).toHaveBeenCalledWith(
      "conv-1",
      expect.objectContaining({ metadata: expect.objectContaining({ welcome_sent: true }) })
    );
  });

  it("answers with a configured quick reply without invoking the AI", async () => {
    arrange({
      tenant: makeTenant({
        quick_replies: [{ id: "qr1", trigger: "price", response: "Our prices start at K50 — {business_name}", match_type: "contains" }],
      }),
    });

    await handleWebhook(makePayload(makeTextMessage("what is the price?")));

    expect(transport.sendText).toHaveBeenCalledWith("260970000000", "Our prices start at K50 — Acme Ltd");
    expect(ai.generateResponse).not.toHaveBeenCalled();
  });

  it("falls through to an AI response for an ongoing conversation", async () => {
    arrange();
    ai.generateResponse.mockResolvedValue({ text: "Here's how I can help.", should_escalate: false, confidence: 0.8 });

    await handleWebhook(makePayload(makeTextMessage("do you deliver on Sundays?")));

    expect(ai.generateResponse).toHaveBeenCalledTimes(1);
    expect(transport.sendText).toHaveBeenCalledWith("260970000000", "Here's how I can help.");
    expect(transport.sendTypingIndicator).toHaveBeenCalled();
  });

  it("blocks the bot when the monthly conversation limit is reached", async () => {
    arrange();
    usage.consumeConversation.mockResolvedValue({
      allowed: false,
      conversationsLimit: 1000,
      conversationsUsed: 1000,
      windowOpen: false,
    });

    await handleWebhook(makePayload(makeTextMessage("hi there")));

    expect(transport.sendText).toHaveBeenCalledTimes(1);
    expect(transport.sendText.mock.calls[0][1]).toContain("1,000");
    expect(usage.incrementMessageUsage).not.toHaveBeenCalled();
    expect(ai.generateResponse).not.toHaveBeenCalled();
  });

  it("meters the conversation once, keyed on the customer's number", async () => {
    arrange();

    await handleWebhook(makePayload(makeTextMessage("hi there")));

    expect(usage.consumeConversation).toHaveBeenCalledTimes(1);
    expect(usage.consumeConversation).toHaveBeenCalledWith("tenant-1", "whatsapp", "260970000000");
    // The message counter still runs alongside it as a shadow meter (§1.5).
    expect(usage.incrementMessageUsage).toHaveBeenCalledTimes(1);
  });

  it("does not charge the WhatsApp allowance for web chat", async () => {
    // Web is the zero-third-party-cost channel and has its own meter in the
    // widget route (consumeAiReply). Charging it here capped a Free tenant's
    // website widget at 5 messages.
    const { tenant } = arrange();
    const webTransport = {
      ...transport,
      channel: "web" as const,
      capabilities: { ...transport.capabilities, persistsOutbound: true },
    };

    await processIncomingMessage(
      tenant,
      { customerRef: "visitor-abc", customerName: "Visitor", type: "text", content: { text: "hello" }, externalId: "web-1" } as never,
      webTransport as never
    );

    expect(usage.consumeConversation).not.toHaveBeenCalled();
    expect(usage.incrementMessageUsage).not.toHaveBeenCalled();
    expect(webTransport.sendText).toHaveBeenCalled();
  });

  it("sends the outside-hours message when the schedule is closed", async () => {
    const closedSchedule = Object.fromEntries(
      ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((d) => [d, null])
    );
    arrange({
      tenant: makeTenant({
        operating_hours: { timezone: "Africa/Lusaka", schedule: closedSchedule, outside_hours_message: "We're closed right now." },
      }),
    });

    await handleWebhook(makePayload(makeTextMessage("are you open?")));

    expect(transport.sendText).toHaveBeenCalledWith("260970000000", "We're closed right now.");
    expect(ai.generateResponse).not.toHaveBeenCalled();
  });

  it("does not run the bot while a conversation is in handoff", async () => {
    arrange({ conversation: makeConversation({ status: "handoff" }) });

    await handleWebhook(makePayload(makeTextMessage("still there?")));

    expect(transport.sendText).not.toHaveBeenCalled();
    expect(ai.generateResponse).not.toHaveBeenCalled();
    // inbound message is still persisted
    expect(db.saveMessage).toHaveBeenCalledTimes(1);
    expect(db.saveMessage.mock.calls[0][0]).toMatchObject({ direction: "inbound" });
  });

  it("escalates on an urgent safety keyword, sending the safety message then a wait message", async () => {
    arrange({
      tenant: makeTenant({
        industry: "finance",
        escalation_rules: [{ id: "e1", trigger: "keyword", value: "fraud", priority: "urgent" }],
      }),
    });

    await handleWebhook(makePayload(makeTextMessage("I think there's fraud on my card")));

    // 1st send = the urgent finance/fraud safety message; 2nd = the no-agent wait message
    expect(transport.sendText).toHaveBeenCalledTimes(2);
    expect(transport.sendText.mock.calls[0][1]).toContain("LOCK YOUR CARD");
    expect(db.updateConversation).toHaveBeenCalledWith(
      "conv-1",
      expect.objectContaining({ status: "waiting" })
    );
    expect(ai.generateResponse).not.toHaveBeenCalled();
  });

  // The waiting branch tells the customer "our team will reach out to you very
  // soon". Nothing used to make that true, so these guard the notification.
  it("emails the team when nobody is online to take the handoff", async () => {
    arrange({
      tenant: makeTenant({
        industry: "finance",
        escalation_rules: [{ id: "e1", trigger: "keyword", value: "fraud", priority: "urgent" }],
      }),
    });

    await handleWebhook(makePayload(makeTextMessage("I think there's fraud on my card")));

    expect(notify.notifyEscalation).toHaveBeenCalledTimes(1);
    const notice = notify.notifyEscalation.mock.calls[0][0];
    expect(notice).toMatchObject({ conversationId: "conv-1" });
    // No agent was assigned, so the email must not name one.
    expect(notice.assignedAgentName).toBeUndefined();
  });

  it("names the assigned agent when one is online", async () => {
    arrange({
      tenant: makeTenant({
        industry: "finance",
        escalation_rules: [{ id: "e1", trigger: "keyword", value: "fraud", priority: "urgent" }],
      }),
    });
    db.getAvailableAgent.mockResolvedValue({ id: "ag-1", name: "Mwansa", active_chats: 0 });

    await handleWebhook(makePayload(makeTextMessage("I think there's fraud on my card")));

    expect(notify.notifyEscalation).toHaveBeenCalledTimes(1);
    expect(notify.notifyEscalation.mock.calls[0][0]).toMatchObject({ assignedAgentName: "Mwansa" });
  });

  it("still answers the customer when the notification fails", async () => {
    arrange({
      tenant: makeTenant({
        industry: "finance",
        escalation_rules: [{ id: "e1", trigger: "keyword", value: "fraud", priority: "urgent" }],
      }),
    });
    notify.notifyEscalation.mockRejectedValue(new Error("resend is down"));

    await expect(
      handleWebhook(makePayload(makeTextMessage("I think there's fraud on my card")))
    ).resolves.not.toThrow();

    // The safety message and the wait message both still reach the customer.
    expect(transport.sendText).toHaveBeenCalledTimes(2);
  });
});

// --- Flow fixtures: a two-question booking flow ---
const bookingFlow = {
  id: "book",
  name: "Book appointment",
  trigger: "book",
  steps: [
    {
      id: "s1",
      type: "question" as const,
      content: "Which service?",
      options: [
        { label: "Haircut", value: "cut", next_step: "s2" },
        { label: "Shave", value: "shave", next_step: "s2" },
      ],
    },
    { id: "s2", type: "question" as const, content: "What date suits you?" },
  ],
};

describe("conversation flows (WhatsApp)", () => {
  it("starts a flow on a text trigger and sends the first question as buttons", async () => {
    arrange({ tenant: makeTenant({ flows: [bookingFlow] }) });

    await handleWebhook(makePayload(makeTextMessage("I want to book")));

    // <=3 options render as reply buttons, ids namespaced by step
    expect(transport.sendButtons).toHaveBeenCalledWith("260970000000", "Which service?", [
      { id: "step_s1_cut", title: "Haircut" },
      { id: "step_s1_shave", title: "Shave" },
    ]);
    // flow state persisted, parked on the question step
    expect(db.updateConversation).toHaveBeenCalledWith(
      "conv-1",
      expect.objectContaining({
        metadata: expect.objectContaining({
          active_flow: expect.objectContaining({ flow_id: "book", step_index: 0 }),
        }),
      })
    );
    expect(ai.generateResponse).not.toHaveBeenCalled();
  });

  it("advances to the next step and records the answer under a content-derived key", async () => {
    arrange({
      tenant: makeTenant({ flows: [bookingFlow] }),
      conversation: makeConversation({
        metadata: {
          active_flow: { flow_id: "book", step_index: 0, collected_data: {}, started_at: "2026-01-01T00:00:00Z" },
        },
      }),
    });

    await handleWebhook(makePayload(makeTextMessage("Haircut")));

    // next question (no options) goes out as plain text
    expect(transport.sendText).toHaveBeenCalledWith("260970000000", "What date suits you?");
    // answer stored under the question text with punctuation stripped
    expect(db.updateConversation).toHaveBeenCalledWith(
      "conv-1",
      expect.objectContaining({
        metadata: expect.objectContaining({
          active_flow: expect.objectContaining({
            step_index: 1,
            collected_data: { "Which service": "Haircut" },
          }),
        }),
      })
    );
    expect(ai.generateResponse).not.toHaveBeenCalled();
  });

  it("exits the flow when the user types cancel", async () => {
    arrange({
      tenant: makeTenant({ flows: [bookingFlow] }),
      conversation: makeConversation({
        metadata: {
          active_flow: { flow_id: "book", step_index: 0, collected_data: {}, started_at: "2026-01-01T00:00:00Z" },
        },
      }),
    });

    await handleWebhook(makePayload(makeTextMessage("cancel")));

    expect(transport.sendText.mock.calls[0][1]).toContain("cancelled the current process");
    // active_flow key removed from metadata
    const cleared = db.updateConversation.mock.calls.find(
      (c: unknown[]) => !(c[1] as { metadata?: Record<string, unknown> }).metadata?.active_flow
    );
    expect(cleared).toBeDefined();
  });

  it("does not start a flow when the trigger only appears inside a longer word", async () => {
    arrange({ tenant: makeTenant({ flows: [{ ...bookingFlow, trigger: "book" }] }) });

    await handleWebhook(makePayload(makeTextMessage("how do I update my bookkeeping records?")));

    expect(transport.sendButtons).not.toHaveBeenCalled();
    expect(ai.generateResponse).toHaveBeenCalled();
  });

  it("abandons an active flow when the visitor asks something else, and answers the question", async () => {
    arrange({
      tenant: makeTenant({ flows: [bookingFlow] }),
      conversation: makeConversation({
        metadata: {
          active_flow: { flow_id: "book", step_index: 0, collected_data: {}, started_at: "2026-01-01T00:00:00Z" },
        },
      }),
    });

    await handleWebhook(makePayload(makeTextMessage("who are you?")));

    // The question is answered rather than filed as the answer to "Which service?"
    expect(ai.generateResponse).toHaveBeenCalled();
    const cleared = db.updateConversation.mock.calls.find(
      (c: unknown[]) => !(c[1] as { metadata?: Record<string, unknown> }).metadata?.active_flow
    );
    expect(cleared).toBeDefined();
    expect(db.updateConversation).not.toHaveBeenCalledWith(
      "conv-1",
      expect.objectContaining({
        metadata: expect.objectContaining({
          active_flow: expect.objectContaining({ step_index: 1 }),
        }),
      })
    );
  });

  it("still treats a chosen option as an answer, not an interruption", async () => {
    arrange({
      tenant: makeTenant({ flows: [bookingFlow] }),
      conversation: makeConversation({
        metadata: {
          active_flow: { flow_id: "book", step_index: 0, collected_data: {}, started_at: "2026-01-01T00:00:00Z" },
        },
      }),
    });

    await handleWebhook(makePayload(makeTextMessage("Shave")));

    expect(transport.sendText).toHaveBeenCalledWith("260970000000", "What date suits you?");
    expect(ai.generateResponse).not.toHaveBeenCalled();
  });
});

describe("booking confirm/cancel buttons (WhatsApp)", () => {
  function makeButtonReply(id: string, title: string): WhatsAppIncomingMessage {
    return {
      from: "260970000000",
      id: "wamid.in",
      timestamp: "0",
      type: "interactive",
      interactive: { type: "button_reply", button_reply: { id, title } },
    };
  }

  const pendingBooking = {
    id: "bk-1",
    tenant_id: "tenant-1",
    customer_phone: "260970000000",
    customer_name: "Alice",
    booking_type: "appointment",
    status: "pending",
    scheduled_date: "2026-08-07",
    scheduled_time: "14:30:00",
  };

  it("confirms a pending booking from its reply button", async () => {
    arrange();
    db.getBooking.mockResolvedValue(pendingBooking);

    await handleWebhook(makePayload(makeButtonReply("booking_confirm_bk-1", "✅ Confirm")));

    expect(db.updateBooking).toHaveBeenCalledWith("bk-1", expect.objectContaining({ status: "confirmed" }));
    expect(transport.sendText.mock.calls[0][1]).toContain("is confirmed");
    // booking buttons are handled ahead of the usage gate and the AI
    expect(usage.consumeConversation).not.toHaveBeenCalled();
    expect(ai.generateResponse).not.toHaveBeenCalled();
  });

  it("cancels a booking from its reply button", async () => {
    arrange();
    db.getBooking.mockResolvedValue(pendingBooking);

    await handleWebhook(makePayload(makeButtonReply("booking_cancel_bk-1", "❌ Cancel")));

    expect(db.cancelBooking).toHaveBeenCalledWith("bk-1", expect.any(String));
    expect(transport.sendText.mock.calls[0][1]).toContain("has been cancelled");
  });

  it("rejects a booking button that belongs to another customer", async () => {
    arrange();
    db.getBooking.mockResolvedValue({ ...pendingBooking, customer_phone: "260979999999" });

    await handleWebhook(makePayload(makeButtonReply("booking_confirm_bk-1", "✅ Confirm")));

    expect(db.updateBooking).not.toHaveBeenCalled();
    expect(transport.sendText.mock.calls[0][1]).toContain("couldn't find that booking");
  });
});
