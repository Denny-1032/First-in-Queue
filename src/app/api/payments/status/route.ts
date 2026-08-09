import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { checkCollectionStatus } from "@/lib/lipila/client";
import { settlePayment } from "@/lib/lipila/settle";

/**
 * Check payment status - polls Lipila and updates local record.
 * Used by the checkout modal while a MoMo prompt is outstanding, and by the
 * card flow if the customer gets back before the callback lands.
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
        purpose: payment.purpose ?? "subscription",
      });
    }

    // Poll Lipila for latest status
    try {
      const lipilaStatus = await checkCollectionStatus(referenceId);

      if (lipilaStatus.status === "Successful" || lipilaStatus.status === "Failed") {
        const newStatus = lipilaStatus.status === "Successful" ? "successful" : "failed";

        // settlePayment writes the row and applies the purchase - a credit
        // top-up adds credit, a plan purchase activates the subscription. This
        // route used to activate a subscription either way.
        await settlePayment(payment, newStatus, {
          payment_type: lipilaStatus.paymentType,
          lipila_identifier: lipilaStatus.identifier,
          lipila_external_id: lipilaStatus.externalId || null,
          error_message: lipilaStatus.status === "Failed" ? lipilaStatus.message : null,
        });

        return NextResponse.json({
          status: newStatus,
          paymentType: lipilaStatus.paymentType,
          amount: payment.amount,
          currency: payment.currency,
          purpose: payment.purpose ?? "subscription",
          message: lipilaStatus.message,
        });
      }
    } catch {
      // Lipila check failed - return local status
    }

    return NextResponse.json({
      status: "pending",
      paymentType: payment.payment_type,
      amount: payment.amount,
      currency: payment.currency,
      purpose: payment.purpose ?? "subscription",
    });
  } catch (error) {
    console.error("[Payment Status] Error:", error);
    return NextResponse.json({ error: "Failed to check status" }, { status: 500 });
  }
}
