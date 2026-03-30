import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { LipilaCallbackPayload } from "@/lib/lipila/client";
import { activateSubscription } from "@/lib/lipila/subscription-helpers";

/**
 * Lipila Webhook Endpoint
 * Receives real-time payment status updates from Lipila.
 * Configured in Lipila Dashboard → Wallets → Callback URL.
 *
 * URL: https://your-domain.com/api/webhooks/lipila
 */
export async function POST(request: NextRequest) {
  try {
    const payload: LipilaCallbackPayload = await request.json();
    console.log("[Lipila Webhook] Received:", JSON.stringify(payload));

    const { referenceId, status, paymentType, identifier, externalId, message } = payload;

    if (!referenceId) {
      return NextResponse.json({ error: "Missing referenceId" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Find the payment by Lipila reference ID
    const { data: payment, error: findError } = await supabase
      .from("payments")
      .select("*, tenant_id")
      .eq("lipila_reference_id", referenceId)
      .single();

    if (findError || !payment) {
      console.error("[Lipila Webhook] Payment not found for referenceId:", referenceId);
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // Map Lipila status to our status
    const paymentStatus = status === "Successful" ? "successful" : "failed";

    // Update payment record
    await supabase
      .from("payments")
      .update({
        status: paymentStatus,
        payment_type: paymentType,
        lipila_identifier: identifier,
        lipila_external_id: externalId || null,
        callback_data: payload,
        error_message: status === "Failed" ? message : null,
      })
      .eq("id", payment.id);

    // If payment was successful, activate/renew subscription
    if (paymentStatus === "successful") {
      await activateSubscription(payment.tenant_id, payment.id, payment.amount);
    }

    return NextResponse.json({ received: true, status: paymentStatus });
  } catch (error) {
    console.error("[Lipila Webhook] Error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
