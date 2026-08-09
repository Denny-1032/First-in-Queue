import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { checkCollectionStatus } from "@/lib/lipila/client";
import { resolvePlanFromPayment } from "@/lib/lipila/subscription-helpers";
import { settlePayment } from "@/lib/lipila/settle";

/**
 * Payment Confirmation Redirect
 * Where Lipila sends the customer back after a card checkout, and where the
 * mobile money flow can land too. Both providers are Lipila now, so there is a
 * single status check.
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

    const { data: payment } = await supabase
      .from("payments")
      .select("*")
      .eq("lipila_reference_id", referenceId)
      .single();

    if (!payment) {
      return NextResponse.redirect(`${appUrl}/pricing?payment=error&msg=not_found`);
    }

    const isTopup = payment.purpose === "credit_topup";

    const lipilaStatus = await checkCollectionStatus(referenceId);
    const status = lipilaStatus.status.toLowerCase() as "successful" | "failed" | "pending";

    if (status === "pending") {
      // The card checkout can return before the bank has confirmed. Leave the
      // row pending - the callback or the status poll will finish the job.
      return NextResponse.redirect(
        isTopup
          ? `${appUrl}/dashboard/settings?tab=billing&topup=pending`
          : `${appUrl}/pricing?payment=pending&ref=${referenceId}`
      );
    }

    const settled = await settlePayment(payment, status, {
      payment_type: lipilaStatus.paymentType,
      lipila_identifier: lipilaStatus.identifier,
      lipila_external_id: lipilaStatus.externalId || null,
      error_message: status === "failed" ? lipilaStatus.message : null,
    });

    if (status === "failed") {
      return NextResponse.redirect(
        isTopup
          ? `${appUrl}/dashboard/settings?tab=billing&topup=failed`
          : `${appUrl}/pricing?payment=failed&msg=Payment failed`
      );
    }

    if (isTopup) {
      if (settled.outcome === "credit_failed") {
        return NextResponse.redirect(`${appUrl}/dashboard/settings?tab=billing&topup=error`);
      }
      const balance = settled.outcome === "credited" ? `&balance=${settled.balanceNgwee}` : "";
      return NextResponse.redirect(
        `${appUrl}/dashboard/settings?tab=billing&topup=success${balance}`
      );
    }

    // Display only - the subscription itself was resolved from the payment row
    // inside activatePaidSubscription. null means the amount matched no plan,
    // which is worth surfacing rather than papering over.
    const resolved = resolvePlanFromPayment(payment);

    return NextResponse.redirect(
      `${appUrl}/dashboard/settings?payment=success&plan=${resolved?.planId ?? "unknown"}`
    );
  } catch (error) {
    console.error("[Payment Confirm] Error:", error);
    return NextResponse.redirect(`${appUrl}/pricing?payment=error&msg=server_error`);
  }
}
