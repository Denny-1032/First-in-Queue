import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { Channel } from "@/lib/channels/transport";
import { MAX_HISTORY_EXTRACT_CHARS } from "@/lib/widget/media";
import {
  sentimentBreakdown,
  topTopics,
  avgFirstReplySeconds,
  hourlyVolume,
  aiResolutionRate,
  type ConversationRow,
  type MessageRow,
} from "@/lib/analytics/aggregate";
import type {
  Conversation,
  Message,
  Tenant,
  Agent,
  ConversationStatus,
  ScheduledMessage,
  Booking,
  BookingStatus,
  LeadScore,
} from "@/types";

// --- Tenant Operations ---
export async function getTenantByPhoneNumberId(phoneNumberId: string): Promise<Tenant | null> {
  console.log(`[DB] Querying tenant with phone_number_id: "${phoneNumberId}"`);
  try {
    console.log(`[DB] Getting Supabase admin client...`);
    const supabase = getSupabaseAdmin();
    console.log(`[DB] Supabase client obtained, executing query...`);
    
    const { data, error } = await supabase
      .from("tenants")
      .select("*")
      .eq("whatsapp_phone_number_id", phoneNumberId)
      .eq("is_active", true)
      .single();
    
    console.log(`[DB] Raw Supabase response:`, { error: error?.message, data: data ? `tenant ${data.name}` : 'null' });
    
    if (error) {
      console.error("[DB] getTenantByPhoneNumberId error:", error);
    }
    
    console.log(`[DB] Query result: data=${data ? 'found' : 'null'}, error=${error ? error.message : 'none'}`);
    
    if (error || !data) return null;
    return data as Tenant;
  } catch (err) {
    console.error("[DB] Exception in getTenantByPhoneNumberId:", err);
    return null;
  }
}

export async function getTenantById(tenantId: string): Promise<Tenant | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("tenants")
    .select("*")
    .eq("id", tenantId)
    .single();
  if (error || !data) return null;
  return data as Tenant;
}

export async function getAllTenants(): Promise<Tenant[]> {
  const { data } = await getSupabaseAdmin()
    .from("tenants")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  return (data || []) as Tenant[];
}

export async function upsertTenant(tenant: Partial<Tenant> & { id?: string }): Promise<Tenant | null> {
  const now = new Date().toISOString();
  const { data, error } = await getSupabaseAdmin()
    .from("tenants")
    .upsert({ ...tenant, updated_at: now }, { onConflict: "id" })
    .select()
    .single();
  if (error) { console.error("[DB] upsertTenant error:", error); return null; }
  return data as Tenant;
}

// --- Conversation Operations ---
export async function getOrCreateConversation(
  tenantId: string,
  channel: Channel,
  customerRef: string,
  customerName?: string
): Promise<{ conversation: Conversation; isNew: boolean }> {
  const db = getSupabaseAdmin();

  // Try to find an active/waiting/handoff conversation
  const { data: existing, error: lookupErr } = await db
    .from("conversations")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("channel", channel)
    .eq("customer_ref", customerRef)
    .in("status", ["active", "waiting", "handoff"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lookupErr) {
    console.error("[DB] Conversation lookup error:", lookupErr);
    // If lookup failed, try a broader query as fallback (without maybeSingle)
    const { data: fallback } = await db
      .from("conversations")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("channel", channel)
      .eq("customer_ref", customerRef)
      .in("status", ["active", "waiting", "handoff"])
      .order("created_at", { ascending: false })
      .limit(1);
    if (fallback && fallback.length > 0) {
      const conv = fallback[0];
      console.log(`[DB] Fallback found conversation ${conv.id}`);
      return { conversation: conv as Conversation, isNew: false };
    }
  }

  if (existing) {
    const updates: Record<string, unknown> = { last_message_at: new Date().toISOString() };
    if (customerName && !existing.customer_name) updates.customer_name = customerName;
    await db.from("conversations").update(updates).eq("id", existing.id);
    console.log(`[DB] Found existing conversation ${existing.id} (status=${existing.status})`);
    return { conversation: { ...existing, ...updates } as Conversation, isNew: false };
  }

  // No active conversation - check if this is a returning customer
  // (has ANY prior conversations, even resolved/archived)
  const { count: priorCount } = await db
    .from("conversations")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("channel", channel)
    .eq("customer_ref", customerRef);

  const isReturningCustomer = (priorCount || 0) > 0;

  // Create new conversation
  const { data: created, error } = await db
    .from("conversations")
    .insert({
      tenant_id: tenantId,
      channel,
      customer_ref: customerRef,
      // customer_phone stays populated on WhatsApp for dashboard/export/analytics
      // queries that still read it; web visitors have no phone number.
      customer_phone: channel === "whatsapp" ? customerRef : null,
      customer_name: customerName || null,
      status: "active",
      ai_enabled: true,
      sentiment: null,
      tags: [],
      metadata: {},
      last_message_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create conversation: ${error.message}`);

  // After insert, double-check for duplicates from race conditions
  // If another conversation was created concurrently, use the older one
  const { data: dupes } = await db
    .from("conversations")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("channel", channel)
    .eq("customer_ref", customerRef)
    .in("status", ["active", "waiting", "handoff"])
    .order("created_at", { ascending: true });

  if (dupes && dupes.length > 1) {
    // Keep the oldest, delete the one we just created if it's not the oldest
    const oldest = dupes[0];
    if (oldest.id !== created.id) {
      console.log(`[DB] Race condition detected: using older conversation ${oldest.id}, removing duplicate ${created.id}`);
      await db.from("conversations").delete().eq("id", created.id);
      // Update the oldest conversation's last_message_at and return it
      const updates = { last_message_at: new Date().toISOString() };
      await db.from("conversations").update(updates).eq("id", oldest.id);
      // Return the actual oldest conversation object (not a hybrid) to preserve all metadata
      return { conversation: { ...oldest, ...updates } as Conversation, isNew: false };
    }
  }

  // isNew=true ONLY for brand-new customers (no prior conversations at all)
  console.log(`[DB] Created conversation ${created.id} (returning=${isReturningCustomer}, priorCount=${priorCount})`);
  return { conversation: created as Conversation, isNew: !isReturningCustomer };
}

export async function getConversation(conversationId: string): Promise<Conversation | null> {
  const { data } = await getSupabaseAdmin()
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .single();
  return data as Conversation | null;
}

/**
 * Read a conversation only if it belongs to the given tenant. Dashboard API
 * routes must use this instead of getConversation() - the tenant_id filter IS
 * the authorization check, without it any signed-in user could read another
 * business's chats by guessing an id.
 */
export async function getTenantConversation(
  conversationId: string,
  tenantId: string
): Promise<Conversation | null> {
  const { data } = await getSupabaseAdmin()
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  return data as Conversation | null;
}

export async function getConversations(
  tenantId: string,
  status?: ConversationStatus,
  limit = 50,
  offset = 0
): Promise<{ conversations: Conversation[]; total: number }> {
  let query = getSupabaseAdmin()
    .from("conversations")
    .select("*", { count: "exact" })
    .eq("tenant_id", tenantId)
    .order("last_message_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq("status", status);

  const { data, count } = await query;
  return { conversations: (data || []) as Conversation[], total: count || 0 };
}

export async function updateConversation(
  conversationId: string,
  updates: Partial<Conversation>
): Promise<Conversation | null> {
  const { data } = await getSupabaseAdmin()
    .from("conversations")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", conversationId)
    .select()
    .single();
  return data as Conversation | null;
}

// --- Message Operations ---
export async function saveMessage(message: Omit<Message, "id" | "created_at">): Promise<Message> {
  // Populate the channel-agnostic columns added in migration 013 here rather
  // than at every call site. Callers that don't set them are on WhatsApp, where
  // the external id is the wamid.
  const row = {
    ...message,
    channel: message.channel ?? "whatsapp",
    external_message_id: message.external_message_id ?? message.whatsapp_message_id ?? null,
  };

  const { data, error } = await getSupabaseAdmin()
    .from("messages")
    .insert(row)
    .select()
    .single();
  if (error) throw new Error(`Failed to save message: ${error.message}`);
  return data as Message;
}

export async function getMessages(
  conversationId: string,
  limit = 50,
  offset = 0
): Promise<Message[]> {
  // Fetch MOST RECENT messages first (descending), then reverse for chronological display.
  // Using ascending + range(0,49) only returns the oldest 50 messages - once a conversation
  // exceeds 50 messages, new messages (including agent handoff messages) silently disappear.
  const { data } = await getSupabaseAdmin()
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  return data ? [...data].reverse() : [];
}

export async function updateMessageStatus(
  whatsappMessageId: string,
  status: "sent" | "delivered" | "read" | "failed"
): Promise<void> {
  await getSupabaseAdmin()
    .from("messages")
    .update({ status })
    .eq("whatsapp_message_id", whatsappMessageId);
}

export async function getRecentMessageHistory(
  conversationId: string,
  limit = 20
): Promise<Array<{ role: "user" | "assistant"; content: string }>> {
  const { data: rawData } = await getSupabaseAdmin()
    .from("messages")
    .select("direction, sender_type, content, message_type")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  // Reverse so history is in chronological order (oldest → newest)
  const data = rawData ? [...rawData].reverse() : null;

  if (!data) return [];

  return data.map((msg) => {
    const c = msg.content as Record<string, unknown> | null;
    let text = c?.text as string || "";

    // Provide media context so AI knows what the customer sent
    if (!text && msg.direction === "inbound") {
      const msgType = (msg as { message_type?: string }).message_type;
      const caption = c?.caption as string || "";
      const filename = c?.filename as string || "";
      // Extracted at send time for web uploads (see media-extract.ts). Quoting
      // it here is what lets the assistant answer questions ABOUT a document
      // instead of saying it cannot open one. Capped per message so a long PDF
      // cannot crowd the rest of the conversation out of the window.
      const extract = (c?.media_text as string || "").slice(0, MAX_HISTORY_EXTRACT_CHARS);
      switch (msgType) {
        case "image":
          text = caption ? `[Customer sent an image with caption: "${caption}"]` : "[Customer sent an image]";
          break;
        case "audio":
          text = "[Customer sent a voice message]";
          break;
        case "video":
          text = caption ? `[Customer sent a video with caption: "${caption}"]` : "[Customer sent a video]";
          break;
        case "document": {
          const label = filename || caption || "a document";
          text = caption
            ? `[Customer sent a document "${label}" with the message: "${caption}"]`
            : `[Customer sent a document "${label}"]`;
          if (extract) {
            text += `\nThe document's text follows. Answer from it directly - do not tell the customer you cannot open files.\n"""\n${extract}\n"""`;
          }
          break;
        }
        case "location":
          text = "[Customer shared their location]";
          break;
        case "sticker":
          text = "[Customer sent a sticker]";
          break;
        default:
          text = "[media]";
      }
    }

    return {
      role: (msg.direction === "inbound" ? "user" : "assistant") as "user" | "assistant",
      content: text || "[media]",
    };
  });
}

// --- Agent Operations ---
export async function getAgents(tenantId: string): Promise<Agent[]> {
  const { data } = await getSupabaseAdmin()
    .from("agents")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("name");
  return (data || []) as Agent[];
}

export async function getAvailableAgent(tenantId: string): Promise<Agent | null> {
  // Find an online agent whose active_chats is below their own max_concurrent_chats
  const { data } = await getSupabaseAdmin()
    .from("agents")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("is_online", true)
    .filter("active_chats", "lt", "max_concurrent_chats")
    .order("active_chats", { ascending: true })
    .limit(1)
    .single();
  return data as Agent | null;
}

// --- Analytics Operations ---

/**
 * How many recent conversations the sentiment / topic / AI-resolution figures
 * are computed over. Bounded so a tenant with a large history does not pull
 * their whole table back on every dashboard poll.
 */
const ANALYTICS_CONVERSATION_SAMPLE = 500;

/**
 * Cap on the message rows fetched for the response-time and hourly figures.
 * The DAILY totals are still counted in the database, so the volume chart stays
 * exact for any tenant; only the derived averages work off this sample.
 */
const ANALYTICS_MESSAGE_SAMPLE = 5000;

export async function getAnalytics(tenantId: string) {
  const db = getSupabaseAdmin();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: totalConversations },
    { count: activeConversations },
    { count: resolvedConversations },
    { count: messagesToday },
    { count: messagesThisWeek },
    { data: conversationSample },
    { data: messageSample },
    { count: voiceCallsToday },
  ] = await Promise.all([
    db.from("conversations").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId),
    db.from("conversations").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId).in("status", ["active", "waiting", "handoff"]),
    db.from("conversations").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("status", "resolved"),
    db.from("messages").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId).gte("created_at", todayStart),
    db.from("messages").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId).gte("created_at", weekStart),
    // One read that answers sentiment, topics AND the AI resolution rate. This
    // replaced a separate sentiment query plus a select('*') of 100 rows.
    db.from("conversations")
      .select("sentiment, tags, status, assigned_agent_id")
      .eq("tenant_id", tenantId)
      .order("last_message_at", { ascending: false })
      .limit(ANALYTICS_CONVERSATION_SAMPLE),
    // One read that answers hourly volume AND first-reply time. This replaced
    // 24 per-hour count queries.
    db.from("messages")
      .select("conversation_id, direction, created_at")
      .eq("tenant_id", tenantId)
      .gte("created_at", weekStart)
      .order("created_at", { ascending: false })
      .limit(ANALYTICS_MESSAGE_SAMPLE),
    db.from("voice_calls").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId).gte("created_at", todayStart),
  ]);

  const conversations = (conversationSample || []) as ConversationRow[];
  const messages = (messageSample || []) as MessageRow[];

  const sentiment = sentimentBreakdown(conversations);
  const aiResolution = aiResolutionRate(conversations);
  const firstReply = avgFirstReplySeconds(messages);

  // Daily volume stays a database count per day: this is the headline chart and
  // it must be exact even for a tenant past the message sample cap.
  const dayQueries = Array.from({ length: 7 }, (_, idx) => {
    const i = 6 - idx;
    const dayStart = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);
    return { dayStart, dayEnd, label: dayStart.toLocaleDateString("en-US", { weekday: "short" }) };
  });

  const dayResults = await Promise.all(
    dayQueries.map(({ dayStart, dayEnd }) =>
      db.from("messages").select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .gte("created_at", dayStart.toISOString())
        .lte("created_at", dayEnd.toISOString())
    )
  );

  const dailyVolume = dayQueries.map((q, idx) => ({
    date: q.label,
    count: dayResults[idx].count || 0,
  }));

  return {
    total_conversations: totalConversations || 0,
    active_conversations: activeConversations || 0,
    resolved_conversations: resolvedConversations || 0,
    avg_response_time_seconds: firstReply.seconds,
    response_time_sample: firstReply.sampleSize,
    avg_resolution_time_seconds: 0,
    ai_resolution_rate: aiResolution.rate,
    ai_resolution_sample: aiResolution.sampleSize,
    messages_today: messagesToday || 0,
    messages_this_week: messagesThisWeek || 0,
    voice_calls_today: voiceCallsToday || 0,
    top_topics: topTopics(conversations),
    // Percentages, not counts - see sentimentBreakdown.
    sentiment_breakdown: sentiment.breakdown,
    sentiment_sample: sentiment.sampleSize,
    hourly_volume: hourlyVolume(messages, now),
    daily_volume: dailyVolume,
  };
}

// --- Scheduled Message Operations ---

export async function createScheduledMessage(
  message: Omit<ScheduledMessage, "id" | "created_at" | "updated_at" | "retry_count" | "sent_at" | "error_message">
): Promise<ScheduledMessage> {
  const { data, error } = await getSupabaseAdmin()
    .from("scheduled_messages")
    .insert(message)
    .select()
    .single();
  if (error) throw new Error(`Failed to create scheduled message: ${error.message}`);
  return data as ScheduledMessage;
}

export async function getPendingScheduledMessages(
  beforeTime?: string
): Promise<ScheduledMessage[]> {
  const cutoff = beforeTime || new Date().toISOString();
  const { data } = await getSupabaseAdmin()
    .from("scheduled_messages")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_at", cutoff)
    .order("scheduled_at", { ascending: true })
    .limit(50);
  return (data || []) as ScheduledMessage[];
}

export async function getScheduledMessages(
  tenantId: string,
  status?: string,
  limit = 50
): Promise<ScheduledMessage[]> {
  let query = getSupabaseAdmin()
    .from("scheduled_messages")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("scheduled_at", { ascending: true })
    .limit(limit);
  if (status) query = query.eq("status", status);
  const { data } = await query;
  return (data || []) as ScheduledMessage[];
}

export async function updateScheduledMessage(
  id: string,
  updates: Partial<ScheduledMessage>
): Promise<ScheduledMessage | null> {
  const { data } = await getSupabaseAdmin()
    .from("scheduled_messages")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  return data as ScheduledMessage | null;
}

export async function cancelScheduledMessage(id: string): Promise<void> {
  await getSupabaseAdmin()
    .from("scheduled_messages")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", id);
}

// --- Booking Operations ---

export async function createBooking(
  booking: Omit<Booking, "id" | "created_at" | "updated_at" | "reminder_sent" | "confirmed_at" | "cancelled_at">
): Promise<Booking> {
  const { data, error } = await getSupabaseAdmin()
    .from("bookings")
    .insert(booking)
    .select()
    .single();
  if (error) throw new Error(`Failed to create booking: ${error.message}`);
  return data as Booking;
}

export async function getBooking(id: string): Promise<Booking | null> {
  const { data } = await getSupabaseAdmin()
    .from("bookings")
    .select("*")
    .eq("id", id)
    .single();
  return data as Booking | null;
}

export async function getBookings(
  tenantId: string,
  filters?: { status?: BookingStatus; date?: string; customer_phone?: string },
  limit = 50
): Promise<Booking[]> {
  let query = getSupabaseAdmin()
    .from("bookings")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("scheduled_date", { ascending: true })
    .limit(limit);

  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.date) query = query.eq("scheduled_date", filters.date);
  if (filters?.customer_phone) query = query.eq("customer_phone", filters.customer_phone);

  const { data } = await query;
  return (data || []) as Booking[];
}

export async function getUpcomingBookings(
  tenantId: string,
  limit = 20
): Promise<Booking[]> {
  const today = new Date().toISOString().split("T")[0];
  const { data } = await getSupabaseAdmin()
    .from("bookings")
    .select("*")
    .eq("tenant_id", tenantId)
    .in("status", ["pending", "confirmed"])
    .gte("scheduled_date", today)
    .order("scheduled_date", { ascending: true })
    .order("scheduled_time", { ascending: true })
    .limit(limit);
  return (data || []) as Booking[];
}

export async function updateBooking(
  id: string,
  updates: Partial<Booking>
): Promise<Booking | null> {
  const { data } = await getSupabaseAdmin()
    .from("bookings")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  return data as Booking | null;
}

export async function cancelBooking(id: string, reason?: string): Promise<Booking | null> {
  return updateBooking(id, {
    status: "cancelled",
    cancelled_at: new Date().toISOString(),
    cancellation_reason: reason,
  });
}

export async function getBookingsNeedingReminders(
  hoursAhead = 24
): Promise<Booking[]> {
  const now = new Date();
  const reminderCutoff = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);
  const today = now.toISOString().split("T")[0];
  const cutoffDate = reminderCutoff.toISOString().split("T")[0];

  const { data } = await getSupabaseAdmin()
    .from("bookings")
    .select("*")
    .eq("reminder_sent", false)
    .in("status", ["pending", "confirmed"])
    .gte("scheduled_date", today)
    .lte("scheduled_date", cutoffDate)
    .limit(50);
  return (data || []) as Booking[];
}

// --- Lead Score Operations ---

export async function createOrUpdateLeadScore(
  lead: Omit<LeadScore, "id" | "created_at" | "updated_at">
): Promise<LeadScore> {
  // Check if lead already exists for this conversation
  const { data: existing } = await getSupabaseAdmin()
    .from("lead_scores")
    .select("id")
    .eq("conversation_id", lead.conversation_id)
    .single();

  if (existing) {
    const { data, error } = await getSupabaseAdmin()
      .from("lead_scores")
      .update({ ...lead, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select()
      .single();
    if (error) throw new Error(`Failed to update lead score: ${error.message}`);
    return data as LeadScore;
  }

  const { data, error } = await getSupabaseAdmin()
    .from("lead_scores")
    .insert(lead)
    .select()
    .single();
  if (error) throw new Error(`Failed to create lead score: ${error.message}`);
  return data as LeadScore;
}

export async function getLeadScore(conversationId: string): Promise<LeadScore | null> {
  const { data } = await getSupabaseAdmin()
    .from("lead_scores")
    .select("*")
    .eq("conversation_id", conversationId)
    .single();
  return data as LeadScore | null;
}

export async function getLeads(
  tenantId: string,
  filters?: { temperature?: string; converted?: boolean },
  limit = 50
): Promise<LeadScore[]> {
  let query = getSupabaseAdmin()
    .from("lead_scores")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("score", { ascending: false })
    .limit(limit);

  if (filters?.temperature) query = query.eq("temperature", filters.temperature);
  if (filters?.converted !== undefined) query = query.eq("converted", filters.converted);

  const { data } = await query;
  return (data || []) as LeadScore[];
}

export async function getHotLeads(tenantId: string): Promise<LeadScore[]> {
  const { data } = await getSupabaseAdmin()
    .from("lead_scores")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("temperature", "hot")
    .eq("converted", false)
    .order("score", { ascending: false })
    .limit(20);
  return (data || []) as LeadScore[];
}

export async function getLeadsNeedingFollowUp(tenantId: string): Promise<LeadScore[]> {
  const now = new Date().toISOString();
  const { data } = await getSupabaseAdmin()
    .from("lead_scores")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("converted", false)
    .not("next_follow_up_at", "is", null)
    .lte("next_follow_up_at", now)
    .order("next_follow_up_at", { ascending: true })
    .limit(50);
  return (data || []) as LeadScore[];
}

export async function updateLeadScore(
  id: string,
  updates: Partial<LeadScore>
): Promise<LeadScore | null> {
  const { data } = await getSupabaseAdmin()
    .from("lead_scores")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  return data as LeadScore | null;
}

export async function convertLead(id: string): Promise<LeadScore | null> {
  return updateLeadScore(id, {
    converted: true,
    converted_at: new Date().toISOString(),
  });
}
