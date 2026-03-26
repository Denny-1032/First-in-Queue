import axios, { AxiosInstance } from "axios";
import type { InteractiveMessage, TemplateMessage } from "@/types";

const API_VERSION = process.env.WHATSAPP_API_VERSION || "v21.0";
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

export class WhatsAppClient {
  private api: AxiosInstance;
  private phoneNumberId: string;

  constructor(accessToken: string, phoneNumberId: string) {
    this.phoneNumberId = phoneNumberId;
    this.api = axios.create({
      baseURL: BASE_URL,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });
  }

  private get messagesUrl() {
    return `/${this.phoneNumberId}/messages`;
  }

  async sendText(to: string, text: string): Promise<string> {
    const res = await this.api.post(this.messagesUrl, {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { preview_url: true, body: text },
    });
    return res.data.messages?.[0]?.id || "";
  }

  async sendImage(to: string, imageUrl: string, caption?: string): Promise<string> {
    const res = await this.api.post(this.messagesUrl, {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "image",
      image: { link: imageUrl, ...(caption && { caption }) },
    });
    return res.data.messages?.[0]?.id || "";
  }

  async sendDocument(to: string, documentUrl: string, filename: string, caption?: string): Promise<string> {
    const res = await this.api.post(this.messagesUrl, {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "document",
      document: { link: documentUrl, filename, ...(caption && { caption }) },
    });
    return res.data.messages?.[0]?.id || "";
  }

  async sendLocation(to: string, latitude: number, longitude: number, name?: string, address?: string): Promise<string> {
    const res = await this.api.post(this.messagesUrl, {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "location",
      location: { latitude, longitude, ...(name && { name }), ...(address && { address }) },
    });
    return res.data.messages?.[0]?.id || "";
  }

  async sendButtons(to: string, body: string, buttons: Array<{ id: string; title: string }>, header?: string, footer?: string): Promise<string> {
    const interactive: Record<string, unknown> = {
      type: "button",
      body: { text: body },
      action: {
        buttons: buttons.slice(0, 3).map((btn) => ({
          type: "reply",
          reply: { id: btn.id, title: btn.title.slice(0, 20) },
        })),
      },
    };
    if (header) interactive.header = { type: "text", text: header };
    if (footer) interactive.footer = { text: footer };

    const res = await this.api.post(this.messagesUrl, {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "interactive",
      interactive,
    });
    return res.data.messages?.[0]?.id || "";
  }

  async sendList(
    to: string,
    body: string,
    buttonText: string,
    sections: Array<{ title: string; rows: Array<{ id: string; title: string; description?: string }> }>,
    header?: string,
    footer?: string
  ): Promise<string> {
    const interactive: Record<string, unknown> = {
      type: "list",
      body: { text: body },
      action: { button: buttonText.slice(0, 20), sections },
    };
    if (header) interactive.header = { type: "text", text: header };
    if (footer) interactive.footer = { text: footer };

    const res = await this.api.post(this.messagesUrl, {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "interactive",
      interactive,
    });
    return res.data.messages?.[0]?.id || "";
  }

  async sendTemplate(to: string, template: TemplateMessage): Promise<string> {
    const res = await this.api.post(this.messagesUrl, {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "template",
      template: {
        name: template.name,
        language: { code: template.language },
        ...(template.components && { components: template.components }),
      },
    });
    return res.data.messages?.[0]?.id || "";
  }

  async sendReaction(to: string, messageId: string, emoji: string): Promise<string> {
    const res = await this.api.post(this.messagesUrl, {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "reaction",
      reaction: { message_id: messageId, emoji },
    });
    return res.data.messages?.[0]?.id || "";
  }

  async markAsRead(messageId: string): Promise<void> {
    await this.api.post(this.messagesUrl, {
      messaging_product: "whatsapp",
      status: "read",
      message_id: messageId,
    });
  }

  async sendInteractive(to: string, interactive: InteractiveMessage): Promise<string> {
    if (interactive.type === "button" && interactive.buttons) {
      return this.sendButtons(to, interactive.body, interactive.buttons, interactive.header?.text, interactive.footer);
    }
    if (interactive.type === "list" && interactive.sections) {
      return this.sendList(to, interactive.body, "View Options", interactive.sections, interactive.header?.text, interactive.footer);
    }
    return this.sendText(to, interactive.body);
  }

  async getMediaUrl(mediaId: string): Promise<string> {
    const res = await this.api.get(`/${mediaId}`);
    return res.data.url;
  }
}

export function createWhatsAppClient(accessToken?: string, phoneNumberId?: string): WhatsAppClient {
  const token = accessToken || process.env.WHATSAPP_ACCESS_TOKEN!;
  const phoneId = phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID!;
  return new WhatsAppClient(token, phoneId);
}
