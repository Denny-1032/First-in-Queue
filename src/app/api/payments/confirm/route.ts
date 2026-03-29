import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { checkCollectionStatus } from "@/lib/lipila/client";
import { activateSubscription, resolvePlanFromAmount } from "@/lib/lipila/subscription-helpers";

/**
 * Card Payment Confirmation Redirect
 * After card payment on Lipila's 3D Secure page, the user is redirected here.
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

    // Check status with Lipila
    const lipilaStatus = await checkCollectionStatus(referenceId);

    // Find the payment record
    const { data: payment } = await supabase
      .from("payments")
      .select("*")
      .eq("lipila_reference_id", referenceId)
      .single();

    if (!payment) {
      return NextResponse.redirect(`${appUrl}/pricing?payment=error&msg=not_found`);
    }

    if (lipilaStatus.status === "Successful") {
      // Update payment status
      await supabase
        .from("payments")
        .update({
          status: "successful",
          payment_type: lipilaStatus.paymentType,
          lipila_identifier: lipilaStatus.identifier,
          lipila_external_id: lipilaStatus.externalId || null,
        })
        .eq("id", payment.id);

      // Activate subscription using shared helper
      await activateSubscription(payment.tenant_id, payment.id, payment.amount);
      const planId = resolvePlanFromAmount(payment.amount);

      return NextResponse.redirect(`${appUrl}/dashboard?payment=success&plan=${planId}`);
    } else if (lipilaStatus.status === "Failed") {
      await supabase
        .from("payments")
        .update({ status: "failed", error_message: lipilaStatus.message })
        .eq("id", payment.id);

      return NextResponse.redirect(`${appUrl}/pricing?payment=failed&msg=${encodeURIComponent(lipilaStatus.message || "Payment failed")}`);
    } else {
      // Still pending
      return NextResponse.redirect(`${appUrl}/pricing?payment=pending&ref=${referenceId}`);
    }
  } catch (error) {
    console.error("[Payment Confirm] Error:", error);
    return NextResponse.redirect(`${appUrl}/pricing?payment=error&msg=server_error`);
  }
}
