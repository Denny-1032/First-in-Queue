import { getSupabaseAdmin } from "@/lib/supabase/server";
import { PLANS } from "./lipila/plans";

/**
 * @deprecated Trials are no longer offered. Use direct payment flow instead.
 * Kept for backward compatibility only.
 */
export async function startTrial(
  tenantId: string,
  planId: string,
  billingInterval: "monthly" | "yearly",
  paymentMethodId?: string
) {
  console.warn("[Trial] startTrial is deprecated — trials are no longer offered");
  throw new Error("Free trials are no longer available. Please use the payment flow to upgrade.");
}

/**
 * Activate subscription after successful payment
 * This is called when payment is actually completed (direct payment)
 */
export async function activatePaidSubscription(
  tenantId: string,
  paymentId: string,
  amount: number
) {
  const supabase = getSupabaseAdmin();
  
  // Find plan from amount — match exact prices (monthly or yearly)
  // Sort paid plans by price descending to match highest first
  const paidPlans = PLANS.filter((p) => p.priceZMW > 0);
  
  let matchedPlan = null;
  let isYearly = false;

  // Check yearly prices first (they are higher amounts)
  for (const p of paidPlans.sort((a, b) => b.yearlyPriceZMW - a.yearlyPriceZMW)) {
    if (p.yearlyPriceZMW > 0 && amount >= p.yearlyPriceZMW) {
      matchedPlan = p;
      isYearly = true;
      break;
    }
  }

  // If no yearly match, check monthly prices
  if (!matchedPlan) {
    for (const p of paidPlans.sort((a, b) => b.priceZMW - a.priceZMW)) {
      if (amount >= p.priceZMW) {
        matchedPlan = p;
        isYearly = false;
        break;
      }
    }
  }
  
  if (!matchedPlan) {
    console.error(`[Subscription] Unable to determine plan from amount: ${amount}`);
    throw new Error("Unable to determine plan from amount");
  }

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setDate(periodEnd.getDate() + (isYearly ? 365 : 30));

  // Cancel any existing active/trialing subscription
  await supabase
    .from("subscriptions")
    .update({ status: "cancelled" })
    .eq("tenant_id", tenantId)
    .in("status", ["active", "trialing"]);

  // Create new active subscription
  const { data: subscription, error } = await supabase
    .from("subscriptions")
    .insert({
      tenant_id: tenantId,
      plan_id: matchedPlan.id,
      status: "active",
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      messages_used: 0,
      voice_minutes_used: 0,
    })
    .select()
    .single();

  if (error) {
    console.error("[Subscription] Failed to create subscription:", error);
    return null;
  }

  console.log(`[Subscription] Activated: ${matchedPlan.id} (${isYearly ? 'yearly' : 'monthly'}) for tenant ${tenantId}`);
  return subscription;
}

/**
 * @deprecated Trials are no longer offered.
 * This cancels any legacy trialing subscriptions that may still exist.
 */
export async function processExpiredTrials() {
  const supabase = getSupabaseAdmin();

  // Cancel any remaining trialing subscriptions (legacy cleanup)
  const { data: trialingSubs, error } = await supabase
    .from("subscriptions")
    .select("id, tenant_id")
    .eq("status", "trialing");

  if (error) {
    console.error("[Trial] Error fetching trialing subs:", error);
    return;
  }

  if (!trialingSubs || trialingSubs.length === 0) {
    console.log("[Trial] No trialing subscriptions to clean up");
    return;
  }

  for (const sub of trialingSubs) {
    await supabase
      .from("subscriptions")
      .update({ status: "cancelled" })
      .eq("id", sub.id);
    console.log(`[Trial] Cancelled legacy trial for tenant ${sub.tenant_id}`);
  }
}
