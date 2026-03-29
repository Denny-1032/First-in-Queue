import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { checkCollectionStatus } from "@/lib/lipila/client";
import { activateSubscription } from "@/lib/lipila/subscription-helpers";

/**
 * Check payment status — polls Lipila and updates local record.
 * Used by the frontend to check MoMo payment status after prompt is sent.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const referenceId = searchParams.get("ref");

  if (!referenceId) {
    return NextResponse.json({ error: "Missing ref parameter" }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();

    // Get local payment record
    const { data: payment } = await supabase
      .from("payments")
      .select("*")
      .eq("lipila_reference_id", referenceId)
      .single();

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // If already resolved, return cached status
    if (payment.status === "successful" || payment.status === "failed") {
      return NextResponse.json({
        status: payment.status,
        paymentType: payment.payment_type,
        amount: payment.amount,
        currency: payment.currency,
      });
    }

    // Poll Lipila for latest status
    try {
      const lipilaStatus = await checkCollectionStatus(referenceId);

      if (lipilaStatus.status === "Successful" || lipilaStatus.status === "Failed") {
        const newStatus = lipilaStatus.status === "Successful" ? "successful" : "failed";

        await supabase
          .from("payments")
          .update({
            status: newStatus,
            payment_type: lipilaStatus.paymentType,
            lipila_identifier: lipilaStatus.identifier,
            lipila_external_id: lipilaStatus.externalId || null,
            error_message: lipilaStatus.status === "Failed" ? lipilaStatus.message : null,
          })
          .eq("id", payment.id);

        // If successful, activate subscription
        if (newStatus === "successful") {
          await activateSubscription(payment.tenant_id, payment.id, payment.amount);
        }

        return NextResponse.json({
          status: newStatus,
          paymentType: lipilaStatus.paymentType,
          amount: payment.amount,
          currency: payment.currency,
          message: lipilaStatus.message,
        });
      }
    } catch {
      // Lipila check failed — return local status
    }

    return NextResponse.json({
      status: "pending",
      paymentType: payment.payment_type,
      amount: payment.amount,
      currency: payment.currency,
    });
  } catch (error) {
    console.error("[Payment Status] Error:", error);
    return NextResponse.json({ error: "Failed to check status" }, { status: 500 });
  }
}
