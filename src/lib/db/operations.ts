import { getSupabaseAdmin } from "@/lib/supabase/server";
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
  const { data, error } = await getSupabaseAdmin()
    .from("tenants")
    .select("*")
    .eq("whatsapp_phone_number_id", phoneNumberId)
    .eq("is_active", true)
    .single();
  if (error || !data) return null;
  return data as Tenant;
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
  customerPhone: string,
  customerName?: string
): Promise<Conversation> {
  // Try to find active conversation
  const { data: existing } = await getSupabaseAdmin()
    .from("conversations")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("customer_phone", customerPhone)
    .in("status", ["active", "waiting", "handoff"])
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (existing) {
    // Update last message time and customer name if we have it
    const updates: Record<string, unknown> = { last_message_at: new Date().toISOString() };
    if (customerName && !existing.customer_name) updates.customer_name = customerName;
    await getSupabaseAdmin().from("conversations").update(updates).eq("id", existing.id);
    return { ...existing, ...updates } as Conversation;
  }

  // Create new conversation
  const { data: created, error } = await getSupabaseAdmin()
    .from("conversations")
    .insert({
      tenant_id: tenantId,
      customer_phone: customerPhone,
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
  return created as Conversation;
}

export async function getConversation(conversationId: string): Promise<Conversation | null> {
  const { data } = await getSupabaseAdmin()
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .single();
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
  const { data, error } = await getSupabaseAdmin()
    .from("messages")
    .insert(message)
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
  const { data } = await getSupabaseAdmin()
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .range(offset, offset + limit - 1);
  return (data || []) as Message[];
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
  const { data } = await getSupabaseAdmin()
    .from("messages")
    .select("direction, sender_type, content, message_type")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (!data) return [];

  return data.map((msg) => {
    const c = msg.content as Record<string, unknown> | null;
    let text = c?.text as string || "";

    // Provide media context so AI knows what the customer sent
    if (!text && msg.direction === "inbound") {
      const msgType = (msg as { message_type?: string }).message_type;
      const caption = c?.caption as string || "";
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
        case "document":
          text = caption ? `[Customer sent a document: "${caption}"]` : "[Customer sent a document]";
          break;
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
    { data: sentimentData },
    { data: recentConversations },
  ] = await Promise.all([
    db.from("conversations").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId),
    db.from("conversations").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId).in("status", ["active", "waiting", "handoff"]),
    db.from("conversations").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("status", "resolved"),
    db.from("messages").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId).gte("created_at", todayStart),
    db.from("messages").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId).gte("created_at", weekStart),
    db.from("conversations").select("sentiment").eq("tenant_id", tenantId).not("sentiment", "is", null),
    db.from("conversations").select("*").eq("tenant_id", tenantId).order("last_message_at", { ascending: false }).limit(100),
  ]);

  const sentimentBreakdown = { positive: 0, neutral: 0, negative: 0 };
  sentimentData?.forEach((c: { sentiment: string }) => {
    if (c.sentiment in sentimentBreakdown) {
      sentimentBreakdown[c.sentiment as keyof typeof sentimentBreakdown]++;
    }
  });

  const aiResolved = recentConversations?.filter(
    (c: { status: string; assigned_agent_id: string | null }) => c.status === "resolved" && !c.assigned_agent_id
  ).length || 0;
  const totalResolved = resolvedConversations || 0;

  // Build daily volume for last 7 days (parallelized)
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

  // Build hourly volume for today (parallelized)
  const hourQueries = Array.from({ length: 24 }, (_, hour) => {
    const hourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour);
    const hourEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, 59, 59, 999);
    return { hour, hourStart, hourEnd };
  });

  const hourResults = await Promise.all(
    hourQueries.map(({ hourStart, hourEnd }) =>
      db.from("messages").select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .gte("created_at", hourStart.toISOString())
        .lte("created_at", hourEnd.toISOString())
    )
  );

  const hourlyVolume = hourQueries.map((q, idx) => ({
    hour: q.hour,
    count: hourResults[idx].count || 0,
  }));

  return {
    total_conversations: totalConversations || 0,
    active_conversations: activeConversations || 0,
    resolved_conversations: totalResolved,
    avg_response_time_seconds: 0,
    avg_resolution_time_seconds: 0,
    ai_resolution_rate: totalResolved > 0 ? (aiResolved / totalResolved) * 100 : 0,
    customer_satisfaction: 0,
    messages_today: messagesToday || 0,
    messages_this_week: messagesThisWeek || 0,
    top_topics: [],
    sentiment_breakdown: sentimentBreakdown,
    hourly_volume: hourlyVolume,
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
