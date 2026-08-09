import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { checkCollectionStatus } from "@/lib/lipila/client";
import { verifyPayment } from "@/lib/lenco/client";
import { activateSubscription, resolvePlanFromPayment } from "@/lib/lipila/subscription-helpers";
import { addCredit } from "@/lib/credit/credit";
import { kwachaToNgwee } from "@/lib/credit/rates";

/**
 * Payment Confirmation Redirect
 * Handles redirects from both Lipila (mobile money) and Lenco (card) payment flows.
 * We check the payment status and redirect to appropriate page.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const referenceId = searchParams.get("ref");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!referenceId) {
    return NextResponse.redirect(`${appUrl}/pricing?payment=error&msg=missing_reference`);
  }

  try {
    const supabase = getSupabaseAdmin();

    // Find the payment record first
    const { data: payment } = await supabase
      .from("payments")
      .select("*")
      .eq("lipila_reference_id", referenceId)
      .single();

    if (!payment) {
      return NextResponse.redirect(`${appUrl}/pricing?payment=error&msg=not_found`);
    }

    let status: "successful" | "failed" | "pending";
    
    // Check status based on payment method
    if (payment.payment_method === "card") {
      // Use Lenco verification for card payments
      const lencoStatus = await verifyPayment(referenceId);
      // Normalize Lenco status (already lowercase)
      status = lencoStatus.status === "pay-offline" ? "pending" : lencoStatus.status;
      
      // Update payment with Lenco data
      await supabase
        .from("payments")
        .update({
          status,
          payment_type: lencoStatus.type,
          lenco_reference: lencoStatus.lencoReference,
          completed_at: lencoStatus.completedAt,
        })
        .eq("id", payment.id);
    } else {
      // Use Lipila for mobile money (returns capitalized status)
      const lipilaStatus = await checkCollectionStatus(referenceId);
      status = lipilaStatus.status.toLowerCase() as "successful" | "failed" | "pending";
      
      // Update payment with Lipila data
      await supabase
        .from("payments")
        .update({
          status,
          payment_type: lipilaStatus.paymentType,
          lipila_identifier: lipilaStatus.identifier,
          lipila_external_id: lipilaStatus.externalId || null,
        })
        .eq("id", payment.id);
    }

    if (status === "successful") {
      // A credit top-up is NOT a plan purchase. Without this branch the amount
      // would be run through resolvePlanFromAmount and silently change the
      // tenant's subscription - a K500 top-up read as a plan upgrade.
      if (payment.purpose === "credit_topup") {
        // Idempotent on the payment id: this redirect can be replayed by a
        // refresh or a duplicate callback, and money must not be created twice.
        const credited = await addCredit({
          tenantId: payment.tenant_id,
          amountNgwee: kwachaToNgwee(Number(payment.amount)),
          referenceType: "payment",
          referenceId: payment.id,
        });

        if (!credited) {
          console.error(`[Payment Confirm] Top-up ${payment.id} paid but NOT credited`);
          return NextResponse.redirect(`${appUrl}/dashboard/settings?tab=billing&topup=error`);
        }

        return NextResponse.redirect(
          `${appUrl}/dashboard/settings?tab=billing&topup=success&balance=${credited.balanceNgwee}`
        );
      }

      // Activate subscription using shared helper
      await activateSubscription(payment.tenant_id, payment.id, payment.amount);

      // Display only - the subscription itself was resolved from the payment
      // row inside activatePaidSubscription. null means the amount matched no
      // plan, which is worth surfacing rather than papering over.
      const resolved = resolvePlanFromPayment(payment);

      return NextResponse.redirect(
        `${appUrl}/dashboard/settings?payment=success&plan=${resolved?.planId ?? "unknown"}`
      );
    } else if (status === "failed") {
      await supabase
        .from("payments")
        .update({ status: "failed", error_message: "Payment failed" })
        .eq("id", payment.id);

      return NextResponse.redirect(`${appUrl}/pricing?payment=failed&msg=Payment failed`);
    } else {
      // Still pending
      return NextResponse.redirect(`${appUrl}/pricing?payment=pending&ref=${referenceId}`);
    }
  } catch (error) {
    console.error("[Payment Confirm] Error:", error);
    return NextResponse.redirect(`${appUrl}/pricing?payment=error&msg=server_error`);
  }
}
