import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { Tenant } from "@/types";

// Get ALL tenants including inactive ones (admin view)
export async function getAllTenantsAdmin(): Promise<Tenant[]> {
  const { data } = await getSupabaseAdmin()
    .from("tenants")
    .select("*")
    .order("created_at", { ascending: false });
  return (data || []) as Tenant[];
}

// Get tenants pending onboarding (no WhatsApp credentials configured)
export async function getPendingOnboarding(): Promise<Tenant[]> {
  const { data } = await getSupabaseAdmin()
    .from("tenants")
    .select("*")
    .or("whatsapp_phone_number_id.is.null,whatsapp_phone_number_id.eq.,whatsapp_access_token.is.null,whatsapp_access_token.eq.")
    .order("created_at", { ascending: false });
  return (data || []) as Tenant[];
}

// Activate or deactivate a tenant
export async function setTenantActive(tenantId: string, isActive: boolean): Promise<Tenant | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("tenants")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", tenantId)
    .select()
    .single();
  if (error) { console.error("[Admin DB] setTenantActive error:", error); return null; }
  return data as Tenant;
}

// Update tenant WhatsApp credentials (admin configures this for the client)
export async function updateTenantCredentials(
  tenantId: string,
  credentials: {
    whatsapp_phone_number_id?: string;
    whatsapp_access_token?: string;
    whatsapp_business_account_id?: string;
    openai_api_key?: string;
  }
): Promise<Tenant | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("tenants")
    .update({ ...credentials, updated_at: new Date().toISOString() })
    .eq("id", tenantId)
    .select()
    .single();
  if (error) { console.error("[Admin DB] updateTenantCredentials error:", error); return null; }
  return data as Tenant;
}

// Get cross-tenant platform stats
export async function getPlatformStats() {
  const db = getSupabaseAdmin();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [
    { count: totalTenants },
    { count: activeTenants },
    { count: totalConversations },
    { count: activeConversations },
    { count: messagesToday },
    { count: messagesThisWeek },
    { count: messagesThisMonth },
    { data: pendingSetup },
  ] = await Promise.all([
    db.from("tenants").select("*", { count: "exact", head: true }),
    db.from("tenants").select("*", { count: "exact", head: true }).eq("is_active", true),
    db.from("conversations").select("*", { count: "exact", head: true }),
    db.from("conversations").select("*", { count: "exact", head: true }).in("status", ["active", "waiting", "handoff"]),
    db.from("messages").select("*", { count: "exact", head: true }).gte("created_at", todayStart),
    db.from("messages").select("*", { count: "exact", head: true }).gte("created_at", weekStart),
    db.from("messages").select("*", { count: "exact", head: true }).gte("created_at", monthStart),
    db.from("tenants").select("id").or("whatsapp_phone_number_id.is.null,whatsapp_phone_number_id.eq.,whatsapp_access_token.is.null,whatsapp_access_token.eq."),
  ]);

  // Daily message volume for last 7 days
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
        .gte("created_at", dayStart.toISOString())
        .lte("created_at", dayEnd.toISOString())
    )
  );

  const dailyVolume = dayQueries.map((q, idx) => ({
    date: q.label,
    count: dayResults[idx].count || 0,
  }));

  return {
    total_tenants: totalTenants || 0,
    active_tenants: activeTenants || 0,
    pending_setup: pendingSetup?.length || 0,
    total_conversations: totalConversations || 0,
    active_conversations: activeConversations || 0,
    messages_today: messagesToday || 0,
    messages_this_week: messagesThisWeek || 0,
    messages_this_month: messagesThisMonth || 0,
    daily_volume: dailyVolume,
  };
}

// Get per-tenant message counts for the current month
export async function getTenantMessageCounts(): Promise<Record<string, number>> {
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const { data } = await getSupabaseAdmin()
    .from("messages")
    .select("tenant_id")
    .gte("created_at", monthStart);

  const counts: Record<string, number> = {};
  data?.forEach((m: { tenant_id: string }) => {
    counts[m.tenant_id] = (counts[m.tenant_id] || 0) + 1;
  });
  return counts;
}
