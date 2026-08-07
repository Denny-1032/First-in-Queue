import type { MessageContent, WhatsAppMessageType } from "@/types";

// =============================================
// Channel abstraction
// -----------------------------------------------
// The message handler (src/lib/engine/handler.ts) contains all the business
// logic — flows, bookings, escalation, operating hours, usage limits — and was
// originally coupled to WhatsApp through a single local `whatsapp` client plus
// `message.from` / `message.id`. These types decouple it so the same logic can
// drive both WhatsApp and the web chat widget without duplication.
// See docs/phase1-spec-widget-and-onboarding.md §2.
// =============================================

export type Channel = "whatsapp" | "web";

/**
 * What a given channel is physically able to render. Handler code that emits
 * buttons/lists must clamp to these limits (see clampButtons in the handler).
 */
export interface ChannelCapabilities {
  buttons: boolean;
  lists: boolean;
  media: boolean;
  /** Max interactive buttons per message. WhatsApp: 3, Web: 6. */
  maxButtons: number;
  /** Max characters in a button title. WhatsApp: 20, Web: 60. */
  maxButtonTitleLength: number;
  readReceipts: boolean;
  typingIndicator: boolean;
  /**
   * True when the transport itself writes the outbound `messages` row as part of
   * sending — the caller must NOT save it again.
   *
   * WhatsApp is false: sending is a network call to Meta, so the handler persists
   * the row afterwards with the returned external id. Web is true: writing the row
   * IS delivery (the browser is subscribed over Supabase Realtime), so a second
   * save would duplicate the visitor's message and, because the handler's save
   * omits `channel`, would land mislabeled as 'whatsapp' (migration 013 default).
   */
  persistsOutbound: boolean;
}

export interface ListSection {
  title: string;
  rows: Array<{ id: string; title: string; description?: string }>;
}

/**
 * A single outbound transport. WhatsAppClient implements this directly (network
 * calls to Meta). WebTransport implements it by writing rows to `messages` with
 * channel='web', delivered to the browser over Supabase Realtime.
 *
 * Every method returns the resulting message's external id (WhatsApp wamid, or
 * the web message row UUID) so the handler can persist it uniformly.
 */
export interface ChannelTransport {
  readonly channel: Channel;
  readonly capabilities: ChannelCapabilities;

  sendText(to: string, text: string): Promise<string>;
  sendButtons(
    to: string,
    body: string,
    buttons: Array<{ id: string; title: string }>,
    header?: string,
    footer?: string
  ): Promise<string>;
  sendList(
    to: string,
    body: string,
    buttonText: string,
    sections: ListSection[],
    header?: string,
    footer?: string
  ): Promise<string>;
  sendImage(to: string, imageUrl: string, caption?: string): Promise<string>;
  sendDocument(
    to: string,
    documentUrl: string,
    filename: string,
    caption?: string
  ): Promise<string>;
  markAsRead(messageId: string): Promise<void>;
  sendTypingIndicator(to: string): Promise<void>;

  /**
   * Optional: a tappable URL button. WhatsApp renders a native cta_url button;
   * channels without an equivalent omit this and callers fall back to sending
   * the link as text.
   */
  sendCtaUrlButton?(to: string, body: string, displayText: string, url: string): Promise<string>;
}

/**
 * Channel-agnostic inbound message. Each channel supplies a normalizer that
 * converts its raw payload into this shape (whatsapp-adapter.ts for WhatsApp).
 */
export interface NormalizedInboundMessage {
  /** WhatsApp wamid, or the web message UUID. */
  externalId: string;
  /** Phone number (WhatsApp) or web visitor id. */
  customerRef: string;
  customerName?: string;
  /**
   * Reuses the WhatsApp type union so the value can be persisted to
   * messages.message_type unchanged. Web only produces a subset.
   */
  type: WhatsAppMessageType;
  content: MessageContent;
  /**
   * Id of a pressed interactive reply — a WhatsApp button_reply/list_reply id,
   * or the web widget's chip id. Routing keys off this for flow triggers
   * (`flow_*`), flow step options (`step_*`) and booking buttons (`booking_*`).
   */
  interactiveReplyId?: string;
  /**
   * Which kind of interactive reply produced `interactiveReplyId`. Booking
   * buttons only ever arrive as "button"; a list selection must fall through to
   * text matching instead of being treated as an unrecognised booking button.
   */
  interactiveReplyKind?: "button" | "list";
  /**
   * WhatsApp template quick-reply press (message type "button"), which carries a
   * payload distinct from interactive replies. No web equivalent.
   */
  templateButton?: { payload: string; text: string };
  /** Original channel-specific payload, for branches that need it. */
  raw: unknown;
}

// Capability presets, referenced by the concrete transports.
export const WHATSAPP_CAPABILITIES: ChannelCapabilities = {
  buttons: true,
  lists: true,
  media: true,
  maxButtons: 3,
  maxButtonTitleLength: 20,
  readReceipts: true,
  typingIndicator: true,
  // Sending is a Meta API call; the handler persists the row afterwards.
  persistsOutbound: false,
};

export const WEB_CAPABILITIES: ChannelCapabilities = {
  buttons: true,
  lists: true,
  media: true,
  maxButtons: 6,
  maxButtonTitleLength: 60,
  readReceipts: true,
  typingIndicator: true,
  // WebTransport.emit() writes the row — that write is the delivery.
  persistsOutbound: true,
};
