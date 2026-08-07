import { getSupabaseAdmin } from "@/lib/supabase/server";
import { PLANS, FREE_WEB_AI_REPLIES } from "./plans";
import { ensureFreeSubscription } from "@/lib/trial-helpers";

export interface UsageCheckResult {
  allowed: boolean;
  messagesUsed: number;
  messagesLimit: number;
  planId: string;
}

/**
 * Check if a tenant has remaining messages on their plan.
 * Returns whether they're allowed to send, plus usage stats.
 */
export async function checkMessageUsage(tenantId: string): Promise<UsageCheckResult> {
  const supabase = getSupabaseAdmin();

  // Read the newest active/trialing row (maybeSingle so it never throws).
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("id, plan_id, messages_used")
    .eq("tenant_id", tenantId)
    .in("status", ["active", "trialing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // No active/trialing subscription (e.g. a paid plan expired or was cancelled
  // and nothing provisioned a replacement). Drop the tenant to the Free tier
  // instead of blocking every message with a bogus "0 messages" limit.
  const active = sub ?? (await ensureFreeSubscription(tenantId));

  if (!active) {
    return { allowed: false, messagesUsed: 0, messagesLimit: 0, planId: "none" };
  }

  const plan = PLANS.find((p) => p.id === active.plan_id);
  const limit = plan?.messagesPerMonth ?? 100;

  return {
    allowed: active.messages_used < limit,
    messagesUsed: active.messages_used,
    messagesLimit: limit,
    planId: active.plan_id,
  };
}

/**
 * Resolve the monthly web-chat AI reply ceiling for a tenant from its plan.
 *
 * SEPARATE meter from `checkMessageUsage` (which counts WhatsApp conversations
 * against `messagesPerMonth`). This reads `webAiRepliesPerMonth`; the per-property
 * counter itself lives in the `widget_consume_ai_reply` RPC — this only supplies
 * the limit value.
 *
 * Fails SAFE to the free ceiling: no active subscription, an unknown plan, or any
 * read error all yield `FREE_WEB_AI_REPLIES`. 500 is still a hard bound, so a
 * transient DB failure can never produce an unbounded OpenAI bill, and never
 * throws into the widget request path.
 */
export async function getWebReplyCeiling(tenantId: string): Promise<number> {
  try {
    const { data: sub } = await getSupabaseAdmin()
      .from("subscriptions")
      .select("plan_id")
      .eq("tenant_id", tenantId)
      .in("status", ["active", "trialing"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub) return FREE_WEB_AI_REPLIES;

    const plan = PLANS.find((p) => p.id === sub.plan_id);
    return plan?.webAiRepliesPerMonth ?? FREE_WEB_AI_REPLIES;
  } catch (e) {
    console.error("[Usage] getWebReplyCeiling failed, defaulting to free:", e);
    return FREE_WEB_AI_REPLIES;
  }
}

/**
 * Increment the messages_used counter on the active subscription.
 * Called after a bot reply is sent successfully.
 */
export async function incrementMessageUsage(tenantId: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  // Use raw SQL for atomic increment to avoid race conditions
  const { error } = await supabase.rpc("increment_messages_used", {
    p_tenant_id: tenantId,
  });

  if (error) {
    // Fallback: non-atomic increment if RPC doesn't exist yet
    console.warn("[Usage] RPC fallback - using non-atomic increment:", error.message);
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("id, messages_used")
      .eq("tenant_id", tenantId)
      .in("status", ["active", "trialing"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sub) {
      await supabase
        .from("subscriptions")
        .update({ messages_used: sub.messages_used + 1 })
        .eq("id", sub.id);
    }
  }
}
