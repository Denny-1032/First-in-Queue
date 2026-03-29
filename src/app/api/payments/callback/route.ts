import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { LipilaCallbackPayload } from "@/lib/lipila/client";
import { activateSubscription } from "@/lib/lipila/subscription-helpers";

/**
 * Lipila Callback Endpoint
 * Receives real-time payment status updates from Lipila.
 * Set this URL as your callbackUrl in the Lipila dashboard.
 */
export async function POST(request: NextRequest) {
  try {
    const payload: LipilaCallbackPayload = await request.json();
    console.log("[Lipila Callback] Received:", JSON.stringify(payload));

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
      console.error("[Lipila Callback] Payment not found for referenceId:", referenceId);
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
    console.error("[Lipila Callback] Error:", error);
    return NextResponse.json({ error: "Callback processing failed" }, { status: 500 });
  }
}
