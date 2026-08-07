import { getSupabaseAdmin } from "@/lib/supabase/server";
import { saveMessage } from "@/lib/db/operations";
import {
  type Channel,
  type ChannelCapabilities,
  type ChannelTransport,
  type ListSection,
  WEB_CAPABILITIES,
} from "./transport";
import type { MessageContent, WhatsAppMessageType } from "@/types";

// =============================================
// Web chat transport
// ---------------------------------------------
// Implements ChannelTransport without making any outbound network call. Each
// send* writes a row to `messages` with channel='web' and returns the row's
// UUID as the external message id. Delivery to the browser happens over
// Supabase Realtime on the messages table, filtered by conversation_id — the
// same mechanism src/lib/hooks/use-realtime.ts already uses.
// See docs/phase1-spec-widget-and-onboarding.md §2 (A4).
// =============================================

const DEFAULT_RESPONSE_DELAY_MS = 600;

export interface WebTransportOptions {
  conversationId: string;
  tenantId: string;
  propertyId?: string | null;
  /**
   * Artificial pause before an assistant message lands, so replies don't appear
   * instantly and unnervingly. Per-property configurable; 0 disables.
   */
  responseDelayMs?: number;
}

export class WebTransport implements ChannelTransport {
  readonly channel: Channel = "web";
  readonly capabilities: ChannelCapabilities = WEB_CAPABILITIES;

  private conversationId: string;
  private tenantId: string;
  private propertyId: string | null;
  private responseDelayMs: number;
  /** Delay applies once per inbound turn, not to every message in a burst. */
  private delayApplied = false;

  constructor(opts: WebTransportOptions) {
    this.conversationId = opts.conversationId;
    this.tenantId = opts.tenantId;
    this.propertyId = opts.propertyId ?? null;
    this.responseDelayMs = opts.responseDelayMs ?? DEFAULT_RESPONSE_DELAY_MS;
  }

  private async applyDelay(): Promise<void> {
    if (this.delayApplied || this.responseDelayMs <= 0) return;
    this.delayApplied = true;
    await new Promise((r) => setTimeout(r, this.responseDelayMs));
  }

  /** Persist an outbound message and return its row id. */
  private async emit(
    messageType: WhatsAppMessageType,
    content: MessageContent
  ): Promise<string> {
    await this.applyDelay();
    const row = await saveMessage({
      conversation_id: this.conversationId,
      tenant_id: this.tenantId,
      direction: "outbound",
      sender_type: "bot",
      message_type: messageType,
      content,
      channel: "web",
      status: "sent",
    });
    return row.id;
  }

  async sendText(_to: string, text: string): Promise<string> {
    return this.emit("text", { text });
  }

  async sendButtons(
    _to: string,
    body: string,
    buttons: Array<{ id: string; title: string }>,
    header?: string,
    footer?: string
  ): Promise<string> {
    return this.emit("interactive", {
      text: body,
      interactive: {
        type: "button",
        body,
        buttons,
        ...(header && { header: { type: "text" as const, text: header } }),
        ...(footer && { footer }),
      },
    });
  }

  async sendList(
    _to: string,
    body: string,
    // The web widget renders list rows as chips, so WhatsApp's "open list"
    // button label has no equivalent and is intentionally unused.
    _buttonText: string,
    sections: ListSection[],
    header?: string,
    footer?: string
  ): Promise<string> {
    return this.emit("interactive", {
      text: body,
      interactive: {
        type: "list",
        body,
        sections,
        ...(header && { header: { type: "text" as const, text: header } }),
        ...(footer && { footer }),
      },
    });
  }

  async sendImage(_to: string, imageUrl: string, caption?: string): Promise<string> {
    return this.emit("image", { media_url: imageUrl, caption });
  }

  async sendDocument(
    _to: string,
    documentUrl: string,
    filename: string,
    caption?: string
  ): Promise<string> {
    return this.emit("document", { media_url: documentUrl, filename, caption });
  }

  /**
   * No-op. Read state on web is driven by the browser rendering the message,
   * not by an API call back to a provider.
   */
  async markAsRead(_messageId: string): Promise<void> {
    // intentionally empty
  }

  /**
   * Ephemeral — a Realtime broadcast, never a table row, so typing indicators
   * don't pollute conversation history.
   */
  async sendTypingIndicator(_to: string): Promise<void> {
    try {
      const channel = getSupabaseAdmin().channel(`widget:${this.conversationId}`);
      await channel.send({
        type: "broadcast",
        event: "typing",
        payload: { conversationId: this.conversationId, at: Date.now() },
      });
    } catch {
      // Best-effort, exactly as on WhatsApp; never fail the message flow.
    }
  }

  // sendCtaUrlButton is deliberately not implemented — the web widget renders
  // links inline, and handler.ts falls back to sendText when it is absent.
}

export function createWebTransport(opts: WebTransportOptions): WebTransport {
  return new WebTransport(opts);
}
