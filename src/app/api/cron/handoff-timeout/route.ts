import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

// Cron Job: Handoff Timeout Checker
// Runs every 5 minutes. Finds conversations stuck in "waiting" status
// for more than 30 minutes and sends a follow-up system message to the customer
// via WhatsApp, plus logs a flag so agents can spot them.
// Register in vercel.json cron: path=/api/cron/handoff-timeout, schedule=every 5 min

const WAITING_TIMEOUT_MINUTES = 30;

export async function POST(request: NextRequest) {
  // Verify cron secret
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (!auth || !auth.includes(cronSecret)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const db = getSupabaseAdmin();
  const cutoff = new Date(Date.now() - WAITING_TIMEOUT_MINUTES * 60 * 1000).toISOString();

  // Find waiting conversations that haven't been touched recently and haven't been notified
  const { data: staleConvos, error } = await db
    .from("conversations")
    .select("id, tenant_id, customer_phone, metadata")
    .eq("status", "waiting")
    .lt("last_message_at", cutoff);

  if (error) {
    console.error("[HandoffTimeout] DB query failed:", error);
    return NextResponse.json({ error: "DB query failed" }, { status: 500 });
  }

  const processed: string[] = [];

  for (const convo of staleConvos || []) {
    const meta = (convo.metadata || {}) as Record<string, unknown>;

    // Skip if we already sent a timeout notice
    if (meta.handoff_timeout_notified) continue;

    // Fetch tenant WhatsApp credentials
    const { data: tenant } = await db
      .from("tenants")
      .select("whatsapp_access_token, whatsapp_phone_number_id")
      .eq("id", convo.tenant_id)
      .single();

    if (!tenant?.whatsapp_access_token || !tenant?.whatsapp_phone_number_id) continue;

    // Send a WhatsApp follow-up to the customer
    try {
      const waRes = await fetch(
        `https://graph.facebook.com/v18.0/${tenant.whatsapp_phone_number_id}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${tenant.whatsapp_access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: convo.customer_phone,
            type: "text",
            text: {
              body: "We apologise for the wait — our team is currently busy but will attend to you very shortly. Thank you for your patience! 🙏",
            },
          }),
        }
      );

      if (waRes.ok) {
        // Save the message to the DB
        await db.from("messages").insert({
          conversation_id: convo.id,
          tenant_id: convo.tenant_id,
          direction: "outbound",
          sender_type: "bot",
          message_type: "text",
          content: {
            text: "We apologise for the wait — our team is currently busy but will attend to you very shortly. Thank you for your patience! 🙏",
          },
          status: "sent",
        });

        // Mark as notified so we don't repeat
        await db
          .from("conversations")
          .update({
            metadata: {
              ...meta,
              handoff_timeout_notified: true,
              handoff_timeout_at: new Date().toISOString(),
            },
          })
          .eq("id", convo.id);

        processed.push(convo.id);
        console.log(`[HandoffTimeout] Sent timeout notice for conversation ${convo.id}`);
      }
    } catch (err) {
      console.error(`[HandoffTimeout] Failed for conversation ${convo.id}:`, err);
    }
  }

  return NextResponse.json({
    success: true,
    checked: (staleConvos || []).length,
    notified: processed.length,
    timestamp: new Date().toISOString(),
  });
}

export async function GET() {
  return NextResponse.json({
    status: "Handoff timeout cron is active",
    endpoint: "/api/cron/handoff-timeout",
    method: "POST",
    schedule: "Every 5 minutes: */5 * * * *",
    timeout_minutes: WAITING_TIMEOUT_MINUTES,
  });
}
