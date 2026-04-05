import { getSupabaseAdmin } from "@/lib/supabase/server";
import { PLANS } from "./lipila/plans";
import { collectMobileMoney, generateReferenceId, formatZambianPhone } from "./lipila/client";

/**
 * Start a free trial for a tenant
 * Creates a trial subscription without charging immediately
 */
export async function startTrial(
  tenantId: string,
  planId: string,
  billingInterval: "monthly" | "yearly",
  paymentMethodId?: string
) {
  const supabase = getSupabaseAdmin();
  const plan = PLANS.find((p) => p.id === planId);
  
  if (!plan) {
    throw new Error("Invalid plan");
  }

  const now = new Date();
  const trialEndsAt = new Date(now);
  trialEndsAt.setDate(trialEndsAt.getDate() + 7); // 7-day trial

  // Cancel any existing active/trialing subscription
  await supabase
    .from("subscriptions")
    .update({ status: "cancelled" })
    .eq("tenant_id", tenantId)
    .in("status", ["active", "trialing"]);

  // Create trial subscription
  const { data: subscription, error } = await supabase
    .from("subscriptions")
    .insert({
      tenant_id: tenantId,
      plan_id: planId,
      status: "trialing",
      current_period_start: now.toISOString(),
      current_period_end: trialEndsAt.toISOString(),
      trial_ends_at: trialEndsAt.toISOString(),
      billing_interval: billingInterval,
      payment_method_id: paymentMethodId,
      messages_used: 0,
    })
    .select()
    .single();

  if (error) {
    console.error("[Trial] Failed to create trial subscription:", error);
    throw error;
  }

  console.log(`[Trial] Started 7-day trial for ${planId} plan, tenant ${tenantId}`);
  return subscription;
}

/**
 * Activate subscription after successful payment
 * This is called when payment is actually completed (trial end or direct payment)
 */
export async function activatePaidSubscription(
  tenantId: string,
  paymentId: string,
  amount: number
) {
  const supabase = getSupabaseAdmin();
  
  // Find plan from amount
  const plan = PLANS.find((p) => {
    return amount >= p.priceZMW || amount >= p.yearlyPriceZMW;
  });
  
  if (!plan) {
    throw new Error("Unable to determine plan from amount");
  }

  const isYearly = amount >= plan.yearlyPriceZMW;
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
      plan_id: plan.id,
      status: "active",
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      billing_interval: isYearly ? "yearly" : "monthly",
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
    .update({ subscription_id: subscription.id })
    .eq("id", paymentId);

  console.log(`[Subscription] Activated: ${plan.id} (${isYearly ? 'yearly' : 'monthly'}) for tenant ${tenantId}`);
  return subscription;
}

/**
 * Check for expired trials and process billing
 * This should be called by a scheduled job (e.g., daily cron)
 */
export async function processExpiredTrials() {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  // Find all trials that have ended
  const { data: expiredTrials, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("status", "trialing")
    .lt("trial_ends_at", now);

  if (error) {
    console.error("[Trial] Error fetching expired trials:", error);
    return;
  }

  console.log(`[Trial] Processing ${expiredTrials?.length || 0} expired trials`);

  for (const trial of expiredTrials || []) {
    try {
      // Check if tenant has a saved payment method
      const { data: paymentMethod } = await supabase
        .from("payment_methods")
        .select("*")
        .eq("tenant_id", trial.tenant_id)
        .eq("is_default", true)
        .single();

      if (!paymentMethod) {
        // No payment method - cancel subscription
        await supabase
          .from("subscriptions")
          .update({ status: "cancelled" })
          .eq("id", trial.id);
        
        console.log(`[Trial] Cancelled trial for tenant ${trial.tenant_id} - no payment method`);
        continue;
      }

      // Initiate payment for the plan
      const plan = PLANS.find((p) => p.id === trial.plan_id);
      if (!plan) continue;

      const amount = trial.billing_interval === "yearly" ? plan.yearlyPriceZMW : plan.priceZMW;
      
      // Create payment record
      const referenceId = generateReferenceId();
      const narration = `First in Queue - ${plan.name} Plan (${trial.billing_interval}) - Trial ended`;
      const accountNumber = paymentMethod.account_number || paymentMethod.phone_number || "";

      const { data: payment } = await supabase
        .from("payments")
        .insert({
          tenant_id: trial.tenant_id,
          lipila_reference_id: referenceId,
          amount,
          currency: "ZMW",
          status: "pending",
          narration,
          payment_method: paymentMethod.type,
          account_number: accountNumber,
        })
        .select()
        .single();

      if (!payment) {
        console.error(`[Trial] Failed to create payment record for tenant ${trial.tenant_id}`);
        continue;
      }

      // Initiate actual payment via Lipila mobile money
      if (paymentMethod.type === "mobile_money" && accountNumber) {
        try {
          const lipilaResponse = await collectMobileMoney({
            referenceId,
            amount,
            narration,
            accountNumber: formatZambianPhone(accountNumber),
            currency: "ZMW",
            email: paymentMethod.email || "",
          });

          // Update payment with Lipila response
          await supabase
            .from("payments")
            .update({
              payment_type: lipilaResponse.paymentType,
              lipila_identifier: lipilaResponse.identifier,
              status: lipilaResponse.status === "Successful" ? "successful" : "pending",
            })
            .eq("id", payment.id);

          console.log(`[Trial] Initiated Lipila payment ${payment.id} (${lipilaResponse.status}) for tenant ${trial.tenant_id}`);
        } catch (payErr) {
          console.error(`[Trial] Lipila payment failed for tenant ${trial.tenant_id}:`, payErr);
          await supabase
            .from("payments")
            .update({ status: "failed" })
            .eq("id", payment.id);
        }
      } else {
        // No supported auto-charge method — mark trial as past_due
        await supabase
          .from("subscriptions")
          .update({ status: "past_due" })
          .eq("id", trial.id);

        console.log(`[Trial] No auto-chargeable method for tenant ${trial.tenant_id}, marked as past_due`);
      }
      
    } catch (error) {
      console.error(`[Trial] Error processing expired trial for tenant ${trial.tenant_id}:`, error);
    }
  }
}
