import { NextRequest, NextResponse } from "next/server";
import {
  resolveByToken,
  widgetJson,
  corsHeaders,
  checkBurst,
  consumeAiReply,
} from "@/lib/properties/guard";
import { createWebTransport } from "@/lib/channels/web-transport";
import { processIncomingMessage, isOutsideOperatingHours } from "@/lib/engine/handler";
import { getTenantById, saveMessage } from "@/lib/db/operations";
import { getWebReplyCeiling } from "@/lib/lipila/usage";
import type { NormalizedInboundMessage } from "@/lib/channels/transport";
import crypto from "crypto";

// Inbound visitor message → the shared engine (handler.ts) via WebTransport.
// See docs/phase1-spec-widget-and-onboarding.md §6.

const MAX_MESSAGE_CHARS = 4000;

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request.headers.get("origin")) });
}

export async function POST(request: NextRequest) {
  try {
    const guard = await resolveByToken(request);
    if (!guard.ok) return guard.response;
    const { property, origin, token } = guard;

    const body = (await request.json().catch(() => ({}))) as {
      text?: string;
      reply_id?: string;
    };

    const text = typeof body.text === "string" ? body.text.trim() : "";
    const replyId = typeof body.reply_id === "string" ? body.reply_id.slice(0, 200) : undefined;

    if (!text && !replyId) {
      return widgetJson({ error: "Empty message" }, origin, { status: 400 });
    }
    // Cap before tokenization so an oversized body can't drive up cost.
    if (text.length > MAX_MESSAGE_CHARS) {
      return widgetJson(
        { error: `Message too long (max ${MAX_MESSAGE_CHARS} characters)` },
        origin,
        { status: 413 }
      );
    }

    // --- Layered limits, all BEFORE any model call ---
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!(await checkBurst(`msg:tok:${token.visitorId}`, 20, 300))) {
      return widgetJson({ error: "You're sending messages too quickly" }, origin, { status: 429 });
    }
    if (!(await checkBurst(`msg:ip:${ip}`, 120, 300))) {
      return widgetJson({ error: "Too many requests" }, origin, { status: 429 });
    }

    const tenant = await getTenantById(property.tenant_id);
    if (!tenant) return widgetJson({ error: "Property unavailable" }, origin, { status: 404 });

    // Web-reply ceiling from the tenant's plan (free → 500, paid → higher).
    // Fails safe to the free ceiling; see getWebReplyCeiling.
    const ceiling = await getWebReplyCeiling(property.tenant_id);

    // Hard cost stop. Fails closed — no counter, no model call.
    if (!(await consumeAiReply(property.id, ceiling))) {
      const offline =
        (property.branding?.offline_message as string | undefined) ||
        "We've reached our message limit for this month. Please leave your email and we'll get back to you.";
      await saveMessage({
        conversation_id: token.conversationId,
        tenant_id: token.tenantId,
        direction: "outbound",
        sender_type: "bot",
        message_type: "text",
        content: { text: offline },
        channel: "web",
        status: "sent",
      });
      return widgetJson({ status: "limit_reached", message: offline }, origin, { status: 200 });
    }

    const branding = (property.branding || {}) as Record<string, unknown>;
    const transport = createWebTransport({
      conversationId: token.conversationId,
      tenantId: token.tenantId,
      propertyId: property.id,
      responseDelayMs:
        typeof branding.response_delay_ms === "number" ? branding.response_delay_ms : undefined,
    });

    const msg: NormalizedInboundMessage = {
      externalId: crypto.randomUUID(),
      // Identity comes from the signed token, never the request body.
      customerRef: token.visitorId,
      type: replyId ? "interactive" : "text",
      content: { text },
      ...(replyId && { interactiveReplyId: replyId, interactiveReplyKind: "button" as const }),
      raw: { source: "web", propertyId: property.id },
    };

    await processIncomingMessage(tenant, msg, transport);

    // Replies are delivered over Supabase Realtime; the widget already has the
    // conversation subscribed, so this just acknowledges receipt.
    return widgetJson(
      { status: "accepted", online: !isOutsideOperatingHours(tenant) },
      origin,
      { status: 202 }
    );
  } catch (error) {
    console.error("[Widget/message] error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
