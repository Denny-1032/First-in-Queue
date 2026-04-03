import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import {
  collectMobileMoney,
  collectCard,
  generateReferenceId,
  formatZambianPhone,
} from "@/lib/lipila/client";
import { getPlanById } from "@/lib/lipila/plans";
import { getWidgetConfig, generateLencoReference } from "@/lib/lenco/client";

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
      billingInterval, // "monthly" | "yearly"
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

    // Validate phone number for all payment methods (Lipila requires it)
    if (!phoneNumber) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    const referenceId = paymentMethod === "card" ? generateLencoReference() : generateReferenceId();
    const isYearly = billingInterval === "yearly";
    const amount = isYearly ? plan.yearlyPriceZMW : plan.priceZMW;
    const intervalLabel = isYearly ? "Yearly" : "Monthly";
    const narration = `First in Queue - ${plan.name} Plan (${intervalLabel})`;

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
        payment_method: paymentMethod,
      })
      .select()
      .single();

    if (paymentError) {
      console.error("[Payments] Error creating payment record:", paymentError);
      return NextResponse.json({ error: "Failed to create payment" }, { status: 500 });
    }

    let response;

    if (paymentMethod === "mobile_money") {
      // Use Lipila for mobile money (works fine)
      const lipilaResponse = await collectMobileMoney({
        referenceId,
        amount,
        narration,
        accountNumber: formatZambianPhone(phoneNumber),
        currency: "ZMW",
        email,
      });

      // Update payment with Lipila response data
      await supabase
        .from("payments")
        .update({
          payment_type: lipilaResponse.paymentType,
          lipila_identifier: lipilaResponse.identifier,
        })
        .eq("id", payment.id);

      response = {
        paymentId: payment.id,
        referenceId,
        status: lipilaResponse.status,
        paymentType: lipilaResponse.paymentType,
        message:
          "A payment prompt has been sent to your phone. Please enter your PIN to complete the payment.",
      };
    } else if (paymentMethod === "card") {
      // Use Lenco for card payments (Lipila card doesn't work)
      const widgetConfig = getWidgetConfig({
        reference: referenceId,
        email,
        amount,
        currency: "ZMW",
        channels: ["card"],
        customer: {
          firstName: firstName || "Customer",
          lastName: lastName || "",
          phone: formatZambianPhone(phoneNumber),
        },
        metadata: {
          tenantId,
          planId,
          billingInterval,
        },
      });

      response = {
        paymentId: payment.id,
        referenceId,
        paymentMethod: "card",
        widgetConfig,
        message: "Ready to load payment widget",
      };
    } else {
      return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("[Payments] Error initiating payment:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Payment initiation failed" },
      { status: 500 }
    );
  }
}
