import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { requireSession, AuthError } from "@/lib/auth/session";
import {
  collectCard,
  collectMobileMoney,
  generateReferenceId,
  formatZambianPhone,
} from "@/lib/lipila/client";
import { getTopupPack, formatNgwee, NGWEE_PER_KWACHA } from "@/lib/credit/rates";

/**
 * POST /api/credit/topup
 * Buy a prepaid usage-credit pack over Lipila - mobile money or card.
 *
 * The payment row is written with purpose='credit_topup'. That flag is what
 * keeps /api/payments/confirm from treating this as a plan purchase and
 * remapping the tenant's subscription from the amount. It is also what makes
 * the card path safe: settlePayment and the confirm redirect both already
 * branch on `purpose`, so a card top-up credits the ledger and lands back on
 * the billing tab with no extra settlement code.
 *
 * Credit is added on CONFIRMATION, never here - money has not arrived yet.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const tenantId = session.tenantId;

    const {
      packId,
      phoneNumber,
      email,
      paymentMethod = "mobile_money",
      firstName,
      lastName,
      city,
      country,
      address,
      zip,
    } = await request.json();

    const pack = getTopupPack(packId);
    if (!pack) {
      return NextResponse.json({ error: "Unknown top-up pack" }, { status: 400 });
    }
    if (paymentMethod !== "mobile_money" && paymentMethod !== "card") {
      return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });
    }
    // Lipila keys a card collection off the payer's contact number too, not the
    // card - so both methods need one.
    if (!phoneNumber) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }
    const payerEmail = email || session.email;
    if (paymentMethod === "card" && !payerEmail) {
      return NextResponse.json({ error: "Email is required for card payments" }, { status: 400 });
    }

    const referenceId = generateReferenceId();
    const amountKwacha = pack.ngwee / NGWEE_PER_KWACHA;
    const narration = `First in Queue - ${formatNgwee(pack.ngwee)} usage credit`;
    const supabase = getSupabaseAdmin();

    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        tenant_id: tenantId,
        lipila_reference_id: referenceId,
        amount: amountKwacha,
        currency: "ZMW",
        status: "pending",
        narration,
        purpose: "credit_topup",
        payment_method: paymentMethod,
        account_number: formatZambianPhone(phoneNumber),
      })
      .select()
      .single();

    if (paymentError || !payment) {
      console.error("[Credit Topup] Failed to create payment:", paymentError);
      return NextResponse.json(
        { error: "Failed to start top-up", reason: paymentError?.message ?? "insert_failed" },
        { status: 500 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const lipilaResponse =
      paymentMethod === "card"
        ? await collectCard({
            customerInfo: {
              firstName: firstName || "Customer",
              lastName: lastName || "-",
              phoneNumber: formatZambianPhone(phoneNumber),
              city: city || "Lusaka",
              country: country || "ZM",
              address: address || "-",
              zip: zip || "10101",
              email: payerEmail,
            },
            collectionRequest: {
              referenceId,
              amount: amountKwacha,
              narration,
              accountNumber: formatZambianPhone(phoneNumber),
              currency: "ZMW",
              // confirm re-checks the status with Lipila before crediting, so
              // this is safe as the landing page for an abandoned payment too.
              backUrl: `${appUrl}/api/payments/confirm?ref=${encodeURIComponent(referenceId)}`,
              referenceData: narration,
            },
          })
        : await collectMobileMoney({
            referenceId,
            amount: amountKwacha,
            narration,
            accountNumber: formatZambianPhone(phoneNumber),
            currency: "ZMW",
            email: payerEmail || "billing@firstinqueue.com",
          });

    await supabase
      .from("payments")
      .update({
        payment_type: lipilaResponse.paymentType,
        lipila_identifier: lipilaResponse.identifier,
      })
      .eq("id", payment.id);

    if (paymentMethod === "card") {
      if (!lipilaResponse.cardRedirectionUrl) {
        return NextResponse.json(
          { error: "Lipila did not return a card checkout URL" },
          { status: 502 }
        );
      }
      return NextResponse.json({
        paymentId: payment.id,
        referenceId,
        paymentMethod: "card",
        paymentType: lipilaResponse.paymentType,
        status: lipilaResponse.status,
        amountLabel: formatNgwee(pack.ngwee),
        cardRedirectionUrl: lipilaResponse.cardRedirectionUrl,
        message: "Redirecting you to the secure card checkout.",
      });
    }

    return NextResponse.json({
      paymentId: payment.id,
      referenceId,
      paymentMethod: "mobile_money",
      paymentType: lipilaResponse.paymentType,
      status: lipilaResponse.status,
      amountLabel: formatNgwee(pack.ngwee),
      message: "A payment prompt has been sent to your phone. Enter your PIN to add the credit.",
    });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[Credit Topup] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Top-up failed" },
      { status: 500 }
    );
  }
}
