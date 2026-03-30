import { getSupabaseAdmin } from "@/lib/supabase/server";
import { PLANS } from "@/lib/lipila/plans";

// =============================================
// Voice Minutes Usage Tracking
// =============================================

/**
 * Check remaining voice minutes for a tenant.
 * Returns { allowed, used, limit, remaining }.
 */
export async function checkVoiceMinutes(tenantId: string): Promise<{
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
}> {
  const supabase = getSupabaseAdmin();

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan_id, voice_minutes_used")
    .eq("tenant_id", tenantId)
    .in("status", ["active", "trialing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!sub) {
    return { allowed: false, used: 0, limit: 0, remaining: 0 };
  }

  const plan = PLANS.find((p) => p.id === sub.plan_id) || PLANS[0];
  const limit = plan.voiceMinutesPerMonth;
  const used = sub.voice_minutes_used || 0;
  const remaining = Math.max(limit - used, 0);

  return {
    allowed: used < limit,
    used,
    limit,
    remaining,
  };
}

/**
 * Record voice minutes used after a call ends.
 * Increments the voice_minutes_used on the active subscription.
 */
export async function recordVoiceUsage(
  tenantId: string,
  durationSeconds: number
): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const minutes = Math.ceil(durationSeconds / 60);

  if (minutes <= 0) return true;

  // Atomic increment to prevent race conditions with concurrent calls
  const { data, error } = await supabase.rpc("increment_voice_minutes", {
    p_tenant_id: tenantId,
    p_minutes: minutes,
  });

  if (error) {
    // Fallback: non-atomic update if RPC not available (e.g. migration not run yet)
    console.warn("[Voice Usage] RPC fallback:", error.message);
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("id, voice_minutes_used")
      .eq("tenant_id", tenantId)
      .in("status", ["active", "trialing"])
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!sub) {
      console.warn(`[Voice Usage] No active subscription for tenant ${tenantId}`);
      return false;
    }

    const newUsed = (sub.voice_minutes_used || 0) + minutes;
    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({ voice_minutes_used: newUsed })
      .eq("id", sub.id);

    if (updateError) {
      console.error("[Voice Usage] Failed to update voice minutes:", updateError);
      return false;
    }

    console.log(`[Voice Usage] Tenant ${tenantId}: +${minutes} min (total: ${newUsed}) [fallback]`);
    return true;
  }

  console.log(`[Voice Usage] Tenant ${tenantId}: +${minutes} min [atomic]`);
  return true;
}

/**
 * Get voice usage stats for a tenant (for dashboard display).
 */
export async function getVoiceStats(tenantId: string) {
  const supabase = getSupabaseAdmin();

  // Get call counts and totals
  const { data: calls } = await supabase
    .from("voice_calls")
    .select("id, duration_seconds, direction, status, created_at")
    .eq("tenant_id", tenantId)
    .eq("status", "ended")
    .order("created_at", { ascending: false })
    .limit(500);

  const allCalls = calls || [];
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  const callsToday = allCalls.filter((c) => new Date(c.created_at) >= todayStart);
  const callsThisWeek = allCalls.filter((c) => new Date(c.created_at) >= weekStart);

  const totalDurationToday = callsToday.reduce((sum, c) => sum + (c.duration_seconds || 0), 0);
  const avgDuration = allCalls.length > 0
    ? Math.round(allCalls.reduce((sum, c) => sum + (c.duration_seconds || 0), 0) / allCalls.length)
    : 0;

  const inboundCount = allCalls.filter((c) => c.direction === "inbound").length;
  const outboundCount = allCalls.filter((c) => c.direction === "outbound").length;

  return {
    totalCalls: allCalls.length,
    callsToday: callsToday.length,
    callsThisWeek: callsThisWeek.length,
    totalDurationToday,
    avgDurationSeconds: avgDuration,
    inboundCount,
    outboundCount,
  };
}
