import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { handleWebhook } from "@/lib/engine/handler";
import type { WhatsAppWebhookPayload } from "@/types";

// WhatsApp webhook verification (GET)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

  if (mode === "subscribe" && token === verifyToken) {
    console.log("[Webhook] Verification successful");
    return new NextResponse(challenge, { status: 200 });
  }

  console.warn("[Webhook] Verification failed");
  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

// WhatsApp webhook message handler (POST)
export async function POST(request: NextRequest) {
  try {
    const payload: WhatsAppWebhookPayload = await request.json();

    // Validate payload structure
    if (payload.object !== "whatsapp_business_account") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    console.log("[Webhook] Processing payload for phone_number_id:", 
      payload.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id);

    // Use after() to keep the Vercel serverless function alive
    // while processing the webhook asynchronously after sending 200
    after(async () => {
      try {
        await handleWebhook(payload);
      } catch (err) {
        console.error("[Webhook] Async processing error:", err);
      }
    });

    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (error) {
    console.error("[Webhook] Error:", error);
    return NextResponse.json({ status: "ok" }, { status: 200 });
  }
}
