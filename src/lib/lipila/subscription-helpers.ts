import { getSupabaseAdmin } from "@/lib/supabase/server";
import { PLANS } from "./plans";

/**
 * Resolve plan ID from a payment amount.
 * Matches against PLANS definitions to avoid hardcoded price thresholds.
 */
export function resolvePlanFromAmount(amount: number): string {
  // Sort paid plans descending by price, find first match
  const match = PLANS
    .filter((p) => p.priceZMW > 0)
    .sort((a, b) => b.priceZMW - a.priceZMW)
    .find((p) => amount >= p.priceZMW);

  return match?.id || "starter";
}

/**
 * Activate a subscription for a tenant after successful payment.
 * Cancels any existing active subscription first.
 */
export async function activateSubscription(
  tenantId: string,
  paymentId: string,
  amount: number
) {
  const supabase = getSupabaseAdmin();
  const planId = resolvePlanFromAmount(amount);

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setDate(periodEnd.getDate() + 30);

  // Cancel any existing active/trialing subscription
  await supabase
    .from("subscriptions")
    .update({ status: "cancelled" })
    .eq("tenant_id", tenantId)
    .in("status", ["active", "trialing"]);

  // Create new active subscription
  const { data: sub, error } = await supabase
    .from("subscriptions")
    .insert({
      tenant_id: tenantId,
      plan_id: planId,
      status: "active",
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      messages_used: 0,
    })
    .select()
    .single();

  if (error) {
    console.error("[Subscription] Failed to create subscription:", error);
    return null;
  }

  // Link payment to subscription
  await supabase
    .from("payments")
    .update({ subscription_id: sub.id })
    .eq("id", paymentId);

  console.log(`[Subscription] Activated: ${planId} for tenant ${tenantId}`);
  return sub;
}
