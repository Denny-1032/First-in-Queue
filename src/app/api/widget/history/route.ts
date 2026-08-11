import { NextRequest, NextResponse } from "next/server";
import { resolveByToken, widgetJson, corsHeaders, checkBurst } from "@/lib/properties/guard";
import { getMessages } from "@/lib/db/operations";
import { withSignedMedia } from "@/lib/widget/media-storage";

// Replay a visitor's conversation after a page reload.
// The conversation id comes from the signed token — accepting it from the
// query string would be a direct IDOR into other businesses' conversations.

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request.headers.get("origin")) });
}

export async function GET(request: NextRequest) {
  try {
    const guard = await resolveByToken(request);
    if (!guard.ok) return guard.response;
    const { origin, token } = guard;

    if (!(await checkBurst(`hist:${token.visitorId}`, 60, 300))) {
      return widgetJson({ error: "Too many requests" }, origin, { status: 429 });
    }

    // Attachments live in a private bucket, so each replay mints fresh signed
    // URLs for them (see media-storage.ts).
    const messages = await withSignedMedia(await getMessages(token.conversationId, 50));

    return widgetJson(
      {
        conversation_id: token.conversationId,
        messages: messages.map((m) => ({
          id: m.id,
          direction: m.direction,
          sender_type: m.sender_type,
          type: m.message_type,
          content: m.content,
          created_at: m.created_at,
        })),
      },
      origin
    );
  } catch (error) {
    console.error("[Widget/history] error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
