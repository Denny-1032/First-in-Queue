import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { verifyWebhookSignature, type LencoWebhookPayload } from "@/lib/lenco/client";
import { activateSubscription } from "@/lib/lipila/subscription-helpers";

/**
 * Lenco Webhook Endpoint
 * Receives real-time payment status updates from Lenco.
 * Set this URL as your webhook URL in the Lenco dashboard: https://yourdomain.com/api/webhooks/lenco
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("x-lenco-signature");

    console.log("[Lenco Webhook] Received webhook");

    // Verify webhook signature
    if (!signature || !verifyWebhookSignature(body, signature)) {
      console.error("[Lenco Webhook] Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload: LencoWebhookPayload = JSON.parse(body);
    console.log("[Lenco Webhook] Event:", payload.event, "Reference:", payload.data.reference);

    const { event, data } = payload;

    if (!data.reference) {
      console.error("[Lenco Webhook] Missing reference in webhook data");
      return NextResponse.json({ error: "Missing reference" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Find the payment by Lenco reference ID
    const { data: payment, error: findError } = await supabase
      .from("payments")
      .select("*, tenant_id")
      .eq("lipila_reference_id", data.reference)
      .single();

    if (findError || !payment) {
      console.error("[Lenco Webhook] Payment not found for reference:", data.reference);
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // Map Lenco status to our status
    let paymentStatus: string;
    switch (event) {
      case "collection.successful":
        paymentStatus = "successful";
        break;
      case "collection.failed":
        paymentStatus = "failed";
        break;
      case "collection.settled":
        // Settlement is a separate event, don't change payment status
        paymentStatus = payment.status;
        break;
      default:
        console.log("[Lenco Webhook] Unhandled event:", event);
        return NextResponse.json({ received: true });
    }

    // Update payment record
    await supabase
      .from("payments")
      .update({
        status: paymentStatus,
        payment_type: data.type,
        lenco_reference: data.lencoReference,
        webhook_data: payload,
        error_message: data.reasonForFailure || null,
        completed_at: data.completedAt,
      })
      .eq("id", payment.id);

    // If payment was successful, activate/renew subscription
    if (event === "collection.successful") {
      console.log("[Lenco Webhook] Activating subscription for payment:", payment.id);
      await activateSubscription(payment.tenant_id, payment.id, payment.amount);
    }

    console.log("[Lenco Webhook] Processed successfully");
    return NextResponse.json({ received: true, event, status: paymentStatus });
  } catch (error) {
    console.error("[Lenco Webhook] Error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

/**
 * Health check endpoint for webhook configuration
 */
export async function GET() {
  return NextResponse.json({ status: "Lenco webhook endpoint is active" });
}
