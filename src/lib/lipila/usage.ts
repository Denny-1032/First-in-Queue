import { getSupabaseAdmin } from "@/lib/supabase/server";
import { PLANS, FREE_WEB_AI_REPLIES } from "./plans";
import { ensureFreeSubscription } from "@/lib/trial-helpers";

/**
 * Length of a billable conversation window, in hours.
 *
 * 24 is not arbitrary: it is WhatsApp's own customer-service window, the unit
 * Meta charges against from 1 October 2026. Keeping the meter on the same
 * boundary as the bill means one charge in equals one charge out.
 */
export const CONVERSATION_WINDOW_HOURS = 24;

/**
 * Canonical window key for a customer.
 *
 * Meta's webhook delivers `from` as bare digits ("260971234567") while the
 * agent-initiated path normalises to E.164 ("+260971234567"). Keying the meter
 * on the raw string would open two windows for one customer and charge twice,
 * so phone-shaped refs are reduced to digits. Web visitor ids are opaque and
 * pass through untouched.
 */
function windowKey(channel: string, customerRef: string): string {
  if (channel !== "whatsapp") return customerRef;
  const digits = customerRef.replace(/\D/g, "");
  return digits || customerRef;
}

export interface UsageCheckResult {
  allowed: boolean;
  messagesUsed: number;
  messagesLimit: number;
  planId: string;
}

/**
 * Read-only view of a tenant's conversation allowance, for display.
 *
 * This does NOT gate sending - `consumeConversation` does, atomically. Reading
 * here and deciding there would let two concurrent messages both pass a check
 * that only one of them should.
 */
export async function checkMessageUsage(tenantId: string): Promise<UsageCheckResult> {
  const supabase = getSupabaseAdmin();

  // Read the newest active/trialing row (maybeSingle so it never throws).
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("id, plan_id, conversations_used")
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
  const used = (active as { conversations_used?: number }).conversations_used ?? 0;

  return {
    allowed: used < limit,
    messagesUsed: used,
    messagesLimit: limit,
    planId: active.plan_id,
  };
}

export interface ConversationConsumeResult {
  allowed: boolean;
  conversationsUsed: number;
  conversationsLimit: number;
  planId: string;
  /** True when a live 24h window absorbed this message, so nothing was charged. */
  windowOpen: boolean;
  /**
   * True when the plan does not include this channel at all (Free is web-only).
   * Distinct from an exhausted allowance: usage credit cannot unlock it, only
   * upgrading can, so the caller must not try to charge for it.
   */
  channelLocked?: boolean;
}

/**
 * Atomically consume one WhatsApp conversation against the tenant's monthly
 * allowance, and report whether the message may be answered.
 *
 * A conversation is charged once when its 24-hour window opens; every further
 * message inside that window is free. The window is aligned to WhatsApp's own
 * customer-service window, which is the unit Meta bills against from 1 October
 * 2026 - so the meter and the cost driver are the same shape.
 *
 * Call this BEFORE sending, exactly once per inbound message, and only for
 * channels that cost money. Web chat has its own, separate meter
 * (`consumeAiReply`) and must not be passed here.
 *
 * Fails CLOSED on any counter error: an unrecoverable Meta bill is worse than a
 * temporarily unavailable channel. The one exception is a missing RPC, which
 * means migration 018 has not been applied yet - see below.
 */
export async function consumeConversation(
  tenantId: string,
  channel: string,
  customerRef: string
): Promise<ConversationConsumeResult> {
  const supabase = getSupabaseAdmin();

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("id, plan_id")
    .eq("tenant_id", tenantId)
    .in("status", ["active", "trialing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const active = sub ?? (await ensureFreeSubscription(tenantId));

  if (!active) {
    return { allowed: false, conversationsUsed: 0, conversationsLimit: 0, planId: "none", windowOpen: false };
  }

  const plan = PLANS.find((p) => p.id === active.plan_id);
  const limit = plan?.messagesPerMonth ?? 100;

  // Capability gate (pricing-model-v2 §4). Free is web-only: WhatsApp and voice
  // are the real pass-through costs, so they are unlocked by Pro rather than
  // given away. Reported as not-allowed with a zero limit, which routes the
  // caller into the same quiet-degradation path as an exhausted allowance -
  // and credit cannot rescue it, because the channel is not part of the plan.
  if (plan && !plan.channelsUnlocked) {
    return {
      allowed: false,
      conversationsUsed: 0,
      conversationsLimit: 0,
      planId: active.plan_id,
      windowOpen: false,
      channelLocked: true,
    };
  }

  const { data, error } = await supabase.rpc("consume_conversation", {
    p_tenant_id: tenantId,
    p_channel: channel,
    p_customer_ref: windowKey(channel, customerRef),
    p_limit: limit,
    p_window_hours: CONVERSATION_WINDOW_HOURS,
  });

  if (error) {
    // 42883 = undefined_function. Migration 018 has not been applied yet, so
    // there is no conversation meter to consult. Fall back to the legacy
    // per-message meter rather than taking WhatsApp down between a deploy and
    // the migration. Remove this branch once 018 is applied everywhere.
    if (error.code === "42883") {
      console.warn("[Usage] consume_conversation missing (migration 018 not applied) - using message meter");
      const legacy = await checkLegacyMessageUsage(tenantId);
      if (legacy.allowed) await incrementMessageUsage(tenantId);
      return {
        allowed: legacy.allowed,
        conversationsUsed: legacy.messagesUsed,
        conversationsLimit: legacy.messagesLimit,
        planId: legacy.planId,
        windowOpen: false,
      };
    }

    console.error("[Usage] consume_conversation failed, failing closed:", error);
    return { allowed: false, conversationsUsed: 0, conversationsLimit: limit, planId: active.plan_id, windowOpen: false };
  }

  // Postgres set-returning function: supabase-js hands back an array of rows.
  const row = (Array.isArray(data) ? data[0] : data) as
    | { allowed: boolean; used: number; window_open: boolean }
    | undefined;

  if (!row) {
    console.error("[Usage] consume_conversation returned no row, failing closed");
    return { allowed: false, conversationsUsed: 0, conversationsLimit: limit, planId: active.plan_id, windowOpen: false };
  }

  return {
    allowed: row.allowed,
    conversationsUsed: row.used,
    conversationsLimit: limit,
    planId: active.plan_id,
    windowOpen: row.window_open,
  };
}

/**
 * The pre-018 per-message check, kept only as the fallback inside
 * `consumeConversation`. Not a gate on its own.
 */
async function checkLegacyMessageUsage(tenantId: string): Promise<UsageCheckResult> {
  const { data: sub } = await getSupabaseAdmin()
    .from("subscriptions")
    .select("id, plan_id, messages_used")
    .eq("tenant_id", tenantId)
    .in("status", ["active", "trialing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!sub) return { allowed: false, messagesUsed: 0, messagesLimit: 0, planId: "none" };

  const limit = PLANS.find((p) => p.id === sub.plan_id)?.messagesPerMonth ?? 100;
  return {
    allowed: sub.messages_used < limit,
    messagesUsed: sub.messages_used,
    messagesLimit: limit,
    planId: sub.plan_id,
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
 *
 * No longer the gate - `consumeConversation` is. This now runs as a SHADOW
 * meter alongside it, deliberately kept for at least one billing cycle so the
 * two can be compared on real traffic. That comparison is how
 * docs/v2-implementation-plan.md §1.5 gets an honest replies-per-conversation
 * figure, which Phase 3's customer-facing credit forecast depends on.
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
