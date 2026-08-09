import { activatePaidSubscription } from "@/lib/trial-helpers";

// Plan resolution lives in plans.ts (a leaf module) so trial-helpers can use it
// without an import cycle. Re-exported here for existing callers.
export {
  resolvePlanFromPayment,
  resolvePlanFromAmount,
  type ResolvedPlan,
} from "./plans";

/**
 * Activate a subscription for a tenant after successful payment.
 * @deprecated Use activatePaidSubscription from trial-helpers.ts instead
 */
export async function activateSubscription(
  tenantId: string,
  paymentId: string,
  amount: number
) {
  return activatePaidSubscription(tenantId, paymentId, amount);
}
