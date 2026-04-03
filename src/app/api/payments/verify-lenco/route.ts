import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { verifyPayment } from "@/lib/lenco/client";
import { activatePaidSubscription } from "@/lib/trial-helpers";

/**
 * Verify Lenco payment after widget success
 * Called by frontend after successful Lenco widget payment
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const reference = searchParams.get("reference");

  if (!reference) {
    return NextResponse.json({ error: "Missing reference" }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();

    // Find the payment record
    const { data: payment, error: findError } = await supabase
      .from("payments")
      .select("*")
      .eq("lipila_reference_id", reference)
      .single();

    if (findError || !payment) {
      console.error("[Lenco Verify] Payment not found for reference:", reference);
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // Verify payment with Lenco
    const lencoStatus = await verifyPayment(reference);

    if (lencoStatus.status !== "successful") {
      return NextResponse.json({
        success: false,
        error: `Payment not successful: ${lencoStatus.status}`,
        status: lencoStatus.status,
      });
    }

    // Update payment record
    await supabase
      .from("payments")
      .update({
        status: "successful",
        payment_type: lencoStatus.type,
        lenco_reference: lencoStatus.lencoReference,
        completed_at: lencoStatus.completedAt,
        webhook_data: lencoStatus,
      })
      .eq("id", payment.id);

    // Activate subscription
    const subscription = await activatePaidSubscription(
      payment.tenant_id,
      payment.id,
      payment.amount
    );

    if (!subscription) {
      throw new Error("Failed to activate subscription");
    }

    console.log("[Lenco Verify] Payment verified and subscription activated:", reference);

    return NextResponse.json({
      success: true,
      status: "successful",
      subscriptionId: subscription.id,
    });
  } catch (error) {
    console.error("[Lenco Verify] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Verification failed",
      },
      { status: 500 }
    );
  }
}
