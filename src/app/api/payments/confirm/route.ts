import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { checkCollectionStatus } from "@/lib/lipila/client";
import { verifyPayment } from "@/lib/lenco/client";
import { activateSubscription, resolvePlanFromAmount } from "@/lib/lipila/subscription-helpers";

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
      // Activate subscription using shared helper
      await activateSubscription(payment.tenant_id, payment.id, payment.amount);
      const { planId } = resolvePlanFromAmount(payment.amount);

      return NextResponse.redirect(`${appUrl}/dashboard/settings?payment=success&plan=${planId}`);
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
