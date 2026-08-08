import { getSupabaseAdmin } from "@/lib/supabase/server";
import { checkVoiceMinutes } from "./usage";

// =============================================
// Widget voice entitlement
// ---------------------------------------------
// Voice is the one part of the widget with real per-second COGS
// (pricing-model-v2 §3: ~$0.13/min all-in), so unlike chat it is NOT on by
// default and NOT available on the free plan. Four gates, all server-side:
//
//   1. the business turned it on          -> branding.voice_enabled
//   2. the plan includes voice minutes    -> VOICE_PLANS
//   3. minutes remain this month          -> checkVoiceMinutes()
//   4. an active voice agent exists       -> voice_agents
//
// The browser is told only `enabled: true|false`. The reason is for our logs and
// the dashboard — a visitor must never be able to read a business's plan.
// =============================================

/** Plans whose subscription includes web-call minutes. Free is deliberately out. */
export const VOICE_PLANS = ["basic", "business", "enterprise"];

export type VoiceBlockReason =
  | "ok"
  | "disabled"
  | "plan"
  | "no_minutes"
  | "no_agent";

export interface WidgetVoiceEntitlement {
  enabled: boolean;
  reason: VoiceBlockReason;
  /** Our row id. Null unless enabled. */
  agentId: string | null;
  /** Retell's agent id — SERVER ONLY, never echoed to a visitor. */
  retellAgentId: string | null;
  remainingMinutes: number;
}

const BLOCKED = (reason: VoiceBlockReason): WidgetVoiceEntitlement => ({
  enabled: false,
  reason,
  agentId: null,
  retellAgentId: null,
  remainingMinutes: 0,
});

/**
 * Can this property offer a voice call to the visitor right now?
 *
 * Fails CLOSED on every unknown: no subscription, unreadable plan, missing
 * agent and any thrown error all return disabled. A widget that shows no call
 * button is a missing feature; one that dials on an unmetered account is an
 * unbounded Retell bill.
 */
export async function resolveWidgetVoice(
  tenantId: string,
  branding: Record<string, unknown> | null | undefined
): Promise<WidgetVoiceEntitlement> {
  try {
    if ((branding || {}).voice_enabled !== true) return BLOCKED("disabled");

    const supabase = getSupabaseAdmin();

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("plan_id")
      .eq("tenant_id", tenantId)
      .in("status", ["active", "trialing"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub || !VOICE_PLANS.includes(sub.plan_id)) return BLOCKED("plan");

    const minutes = await checkVoiceMinutes(tenantId);
    if (!minutes.allowed) return BLOCKED("no_minutes");

    // A property may pin one agent; otherwise take the tenant's first active one.
    const pinned = (branding || {}).voice_agent_id;
    let query = supabase
      .from("voice_agents")
      .select("id, retell_agent_id")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .limit(1);
    if (typeof pinned === "string" && pinned) query = query.eq("id", pinned);

    const { data: agent } = await query.maybeSingle();
    if (!agent?.retell_agent_id) return BLOCKED("no_agent");

    return {
      enabled: true,
      reason: "ok",
      agentId: agent.id,
      retellAgentId: agent.retell_agent_id,
      remainingMinutes: minutes.remaining,
    };
  } catch (e) {
    console.error("[Widget/voice] entitlement check failed:", e);
    return BLOCKED("disabled");
  }
}
