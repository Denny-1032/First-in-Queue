import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { Conversation, Message, Tenant, Agent, ConversationStatus } from "@/types";

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
    .select("direction, sender_type, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (!data) return [];

  return data.map((msg) => ({
    role: (msg.direction === "inbound" ? "user" : "assistant") as "user" | "assistant",
    content: msg.content?.text || "[media]",
  }));
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
  const { data } = await getSupabaseAdmin()
    .from("agents")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("is_online", true)
    .lt("active_chats", 5)
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

  // Build daily volume for last 7 days
  const dailyVolume: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);
    const { count: dayCount } = await db
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .gte("created_at", dayStart.toISOString())
      .lte("created_at", dayEnd.toISOString());
    dailyVolume.push({
      date: dayStart.toLocaleDateString("en-US", { weekday: "short" }),
      count: dayCount || 0,
    });
  }

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
    hourly_volume: [],
    daily_volume: dailyVolume,
  };
}
