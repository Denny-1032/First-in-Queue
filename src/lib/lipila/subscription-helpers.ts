import { getSupabaseAdmin } from "@/lib/supabase/server";
import { PLANS } from "./plans";
import { activatePaidSubscription } from "@/lib/trial-helpers";

/**
 * Resolve plan ID and billing interval from a payment amount.
 * Checks both monthly and yearly prices across all PLANS.
 */
export function resolvePlanFromAmount(amount: number): { planId: string; interval: "monthly" | "yearly" } {
  // Check yearly prices first (higher amounts)
  const yearlyMatch = PLANS
    .filter((p) => p.yearlyPriceZMW > 0)
    .sort((a, b) => b.yearlyPriceZMW - a.yearlyPriceZMW)
    .find((p) => amount >= p.yearlyPriceZMW);

  if (yearlyMatch && amount >= yearlyMatch.yearlyPriceZMW) {
    return { planId: yearlyMatch.id, interval: "yearly" };
  }

  // Check monthly prices
  const monthlyMatch = PLANS
    .filter((p) => p.priceZMW > 0)
    .sort((a, b) => b.priceZMW - a.priceZMW)
    .find((p) => amount >= p.priceZMW);

  return { planId: monthlyMatch?.id || "basic", interval: "monthly" };
}

/**
 * Activate a subscription for a tenant after successful payment.
 * This is now a wrapper around activatePaidSubscription.
 * @deprecated Use activatePaidSubscription from trial-helpers.ts instead
 */
export async function activateSubscription(
  tenantId: string,
  paymentId: string,
  amount: number
) {
  return activatePaidSubscription(tenantId, paymentId, amount);
}
