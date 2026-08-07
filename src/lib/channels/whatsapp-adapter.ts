import type { MessageContent, WhatsAppIncomingMessage } from "@/types";
import type { NormalizedInboundMessage } from "./transport";

// Converts a raw WhatsApp inbound message into the channel-agnostic shape the
// handler consumes. Moved verbatim out of handler.ts so the same routing can be
// driven by the web widget. See docs/phase1-spec-widget-and-onboarding.md §2 (A2).

export function extractMessageContent(message: WhatsAppIncomingMessage): MessageContent {
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

export function normalizeWhatsAppMessage(
  message: WhatsAppIncomingMessage,
  customerName?: string
): NormalizedInboundMessage {
  const buttonReplyId = message.type === "interactive" ? message.interactive?.button_reply?.id : undefined;
  const listReplyId = message.type === "interactive" ? message.interactive?.list_reply?.id : undefined;

  return {
    interactiveReplyKind: buttonReplyId ? "button" : listReplyId ? "list" : undefined,
    externalId: message.id,
    customerRef: message.from,
    customerName,
    type: message.type,
    content: extractMessageContent(message),
    interactiveReplyId: buttonReplyId || listReplyId,
    templateButton:
      message.type === "button" && message.button
        ? { payload: message.button.payload || "", text: message.button.text || "" }
        : undefined,
    raw: message,
  };
}
