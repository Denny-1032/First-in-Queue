import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import {
  collectMobileMoney,
  collectCard,
  generateReferenceId,
  formatZambianPhone,
} from "@/lib/lipila/client";
import { getPlanById } from "@/lib/lipila/plans";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      tenantId,
      planId,
      paymentMethod, // "mobile_money" | "card"
      phoneNumber,
      email,
      // Card-specific fields
      firstName,
      lastName,
      city,
      address,
      zip,
    } = body;

    // Validate required fields
    if (!tenantId || !planId || !paymentMethod || !email) {
      return NextResponse.json(
        { error: "Missing required fields: tenantId, planId, paymentMethod, email" },
        { status: 400 }
      );
    }

    const plan = getPlanById(planId);
    if (!plan) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    if (planId === "enterprise") {
      return NextResponse.json(
        { error: "Enterprise plan requires contacting sales" },
        { status: 400 }
      );
    }

    // Validate phone number early for mobile money
    if (paymentMethod === "mobile_money" && !phoneNumber) {
      return NextResponse.json(
        { error: "Phone number required for mobile money payment" },
        { status: 400 }
      );
    }

    const referenceId = generateReferenceId();
    const amount = plan.priceZMW;
    const narration = `First in Queue - ${plan.name} Plan Subscription`;

    // Create pending payment record
    const supabase = getSupabaseAdmin();
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        tenant_id: tenantId,
        lipila_reference_id: referenceId,
        amount,
        currency: "ZMW",
        status: "pending",
        narration,
        account_number: phoneNumber ? formatZambianPhone(phoneNumber) : email,
      })
      .select()
      .single();

    if (paymentError) {
      console.error("[Payments] Error creating payment record:", paymentError);
      return NextResponse.json({ error: "Failed to create payment" }, { status: 500 });
    }

    let lipilaResponse;

    if (paymentMethod === "mobile_money") {
      lipilaResponse = await collectMobileMoney({
        referenceId,
        amount,
        narration,
        accountNumber: formatZambianPhone(phoneNumber),
        currency: "ZMW",
        email,
      });
    } else if (paymentMethod === "card") {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

      lipilaResponse = await collectCard({
        customerInfo: {
          firstName: firstName || "Customer",
          lastName: lastName || "",
          phoneNumber: phoneNumber ? formatZambianPhone(phoneNumber) : "",
          city: city || "Lusaka",
          country: "ZM",
          address: address || "",
          zip: zip || "10101",
          email,
        },
        collectionRequest: {
          referenceId,
          amount,
          narration,
          accountNumber: phoneNumber ? formatZambianPhone(phoneNumber) : email,
          currency: "ZMW",
          backUrl: `${appUrl}/pricing`,
          redirectUrl: `${appUrl}/api/payments/confirm?ref=${referenceId}`,
        },
      });
    } else {
      return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });
    }

    // Update payment with Lipila response data
    await supabase
      .from("payments")
      .update({
        payment_type: lipilaResponse.paymentType,
        lipila_identifier: lipilaResponse.identifier,
      })
      .eq("id", payment.id);

    return NextResponse.json({
      paymentId: payment.id,
      referenceId,
      status: lipilaResponse.status,
      paymentType: lipilaResponse.paymentType,
      cardRedirectionUrl: lipilaResponse.cardRedirectionUrl,
      message:
        paymentMethod === "mobile_money"
          ? "A payment prompt has been sent to your phone. Please enter your PIN to complete the payment."
          : "Redirecting to card payment...",
    });
  } catch (error) {
    console.error("[Payments] Error initiating payment:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Payment initiation failed" },
      { status: 500 }
    );
  }
}
