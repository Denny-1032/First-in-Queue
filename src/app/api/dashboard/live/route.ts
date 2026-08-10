import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { requireSession, AuthError } from "@/lib/auth/session";
import { answeredVsMissed, type MessageRow } from "@/lib/analytics/aggregate";

/**
 * GET /api/dashboard/live
 *
 * The "what is happening right now" half of the dashboard. Deliberately small
 * and separate from /api/analytics: the home page polls this every 10 seconds,
 * and getAnalytics does a lot more work than a live tile needs.
 *
 * Everything here is today-or-newer. History and breakdowns belong to
 * /dashboard/analytics.
 */

/** Feed length. Enough to see movement, short enough to stay cheap. */
const FEED_LIMIT = 8;

/** Cap on the message rows read for the answered/missed split. */
const MESSAGE_SAMPLE = 5000;

export async function GET() {
  try {
    const session = await requireSession();
    const tenantId = session.tenantId;
    const db = getSupabaseAdmin();

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);

    const [
      { count: activeChats },
      { count: waitingChats },
      { count: messagesToday },
      { count: messagesYesterday },
      { count: voiceCallsToday },
      { data: todayMessages },
      { data: feed },
    ] = await Promise.all([
      db.from("conversations").select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId).eq("status", "active"),
      // Waiting on a person: queued, or handed off and not yet picked up.
      db.from("conversations").select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId).in("status", ["waiting", "handoff"]),
      db.from("messages").select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId).gte("created_at", todayStart.toISOString()),
      db.from("messages").select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .gte("created_at", yesterdayStart.toISOString())
        .lt("created_at", todayStart.toISOString()),
      db.from("voice_calls").select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId).gte("created_at", todayStart.toISOString()),
      db.from("messages").select("conversation_id, direction, created_at")
        .eq("tenant_id", tenantId)
        .gte("created_at", todayStart.toISOString())
        .limit(MESSAGE_SAMPLE),
      // Explicit column list - conversations rows are handed to the browser.
      db.from("conversations")
        .select("id, customer_name, customer_ref, customer_phone, channel, status, sentiment, last_message_at")
        .eq("tenant_id", tenantId)
        .order("last_message_at", { ascending: false })
        .limit(FEED_LIMIT),
    ]);

    const { answered, missed } = answeredVsMissed((todayMessages || []) as MessageRow[]);

    return NextResponse.json({
      active_chats: activeChats || 0,
      waiting_chats: waitingChats || 0,
      messages_today: messagesToday || 0,
      messages_yesterday: messagesYesterday || 0,
      voice_calls_today: voiceCallsToday || 0,
      answered_today: answered,
      missed_today: missed,
      // Phone numbers are trimmed to a display name by the client; the raw
      // value is already visible to this tenant in /dashboard/conversations.
      recent: (feed || []).map((c: Record<string, unknown>) => ({
        id: c.id,
        name: c.customer_name || null,
        ref: c.customer_ref || c.customer_phone || null,
        channel: c.channel || "whatsapp",
        status: c.status,
        sentiment: c.sentiment,
        last_message_at: c.last_message_at,
      })),
      generated_at: now.toISOString(),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[Dashboard/live] Error:", error);
    return NextResponse.json({ error: "Failed to load live dashboard" }, { status: 500 });
  }
}
