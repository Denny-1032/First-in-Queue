import { getSupabaseAdmin } from "@/lib/supabase/server";
import { PLANS } from "@/lib/lipila/plans";
import { ensureFreeSubscription } from "@/lib/trial-helpers";
import { chargeVoiceOverage, getCreditBalance } from "@/lib/credit/credit";
import { CREDIT_RATES } from "@/lib/credit/rates";

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
    .maybeSingle();

  // No active plan -> drop to Free tier (a fresh Free sub has 0 minutes used)
  // instead of reporting a 0-minute limit. Over-limit is still enforced below.
  let planId: string;
  let used: number;
  if (sub) {
    planId = sub.plan_id;
    used = sub.voice_minutes_used || 0;
  } else {
    const free = await ensureFreeSubscription(tenantId);
    if (!free) {
      return { allowed: false, used: 0, limit: 0, remaining: 0 };
    }
    planId = free.plan_id;
    used = 0;
  }

  const plan = PLANS.find((p) => p.id === planId) || PLANS[0];
  const limit = plan.voiceMinutesPerMonth;
  const remaining = Math.max(limit - used, 0);

  if (remaining > 0) {
    return { allowed: true, used, limit, remaining };
  }

  // Allowance spent. Prepaid credit extends it: a tenant with a balance can
  // keep taking calls and pay per minute. With no balance the channel goes
  // quiet rather than erroring - web chat is unaffected either way.
  const balanceNgwee = await getCreditBalance(tenantId);

  return {
    allowed: balanceNgwee >= CREDIT_RATES.VOICE_MINUTE_NGWEE,
    used,
    limit,
    remaining: 0,
  };
}

/**
 * Record voice minutes used after a call ends.
 *
 * Increments voice_minutes_used on the active subscription, then draws any
 * minutes past the plan allowance out of prepaid credit. Retell only reports
 * duration on call_ended, so the charge is necessarily after the fact - what
 * stops the NEXT call is `checkVoiceMinutes` plus the balance check in the
 * call-start path.
 *
 * `callId` is the idempotency key. Retell retries webhooks, and billing one
 * call twice is the failure that costs trust rather than money.
 */
export async function recordVoiceUsage(
  tenantId: string,
  durationSeconds: number,
  callId?: string
): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const minutes = Math.ceil(durationSeconds / 60);

  if (minutes <= 0) return true;

  // Snapshot the allowance BEFORE incrementing, so the split between included
  // and overage minutes is computed against where the tenant actually stood
  // when the call started.
  const before = await checkVoiceMinutes(tenantId);

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
    await chargeOverageMinutes(tenantId, before, minutes, callId);
    return true;
  }

  console.log(`[Voice Usage] Tenant ${tenantId}: +${minutes} min [atomic]`);
  await chargeOverageMinutes(tenantId, before, minutes, callId);
  return true;
}

/**
 * Bill the portion of a call that fell outside the plan allowance.
 *
 * A call can straddle the boundary - 2 minutes left on the plan and a 5-minute
 * call means 2 included and 3 charged - so this splits rather than charging the
 * whole call once the allowance runs out.
 *
 * Never throws and never blocks the webhook: the call already happened, the
 * minutes are already recorded, and a credit failure must not lose the usage
 * record. An uncollected charge is logged loudly instead.
 */
async function chargeOverageMinutes(
  tenantId: string,
  before: { used: number; limit: number },
  minutes: number,
  callId?: string
): Promise<void> {
  const includedRemaining = Math.max(before.limit - before.used, 0);
  const overageMinutes = Math.max(minutes - includedRemaining, 0);

  if (overageMinutes <= 0) return;

  const result = await chargeVoiceOverage(tenantId, overageMinutes, callId);

  if (!result.allowed) {
    // Out of credit. The call is already over, so this is revenue we cannot
    // collect; what it must do is stop the next one, which checkVoiceMinutes
    // and the balance gate on the call-start path handle.
    console.warn(
      `[Voice Usage] Tenant ${tenantId}: ${overageMinutes} overage min UNBILLED - insufficient credit (balance ${result.balanceNgwee} ngwee)`
    );
    return;
  }

  if (result.alreadyCharged) {
    console.log(`[Voice Usage] Tenant ${tenantId}: overage for call ${callId} already billed, skipped`);
    return;
  }

  console.log(
    `[Voice Usage] Tenant ${tenantId}: billed ${overageMinutes} overage min, balance now ${result.balanceNgwee} ngwee`
  );
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
