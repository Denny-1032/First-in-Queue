import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { requireSession, AuthError } from "@/lib/auth/session";
import { collectMobileMoney, generateReferenceId, formatZambianPhone } from "@/lib/lipila/client";
import { getTopupPack, formatNgwee, NGWEE_PER_KWACHA } from "@/lib/credit/rates";

/**
 * POST /api/credit/topup
 * Buy a prepaid usage-credit pack over Lipila mobile money.
 *
 * The payment row is written with purpose='credit_topup'. That flag is what
 * keeps /api/payments/confirm from treating this as a plan purchase and
 * remapping the tenant's subscription from the amount.
 *
 * Credit is added on CONFIRMATION, never here - money has not arrived yet.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const tenantId = session.tenantId;

    const { packId, phoneNumber, email } = await request.json();

    const pack = getTopupPack(packId);
    if (!pack) {
      return NextResponse.json({ error: "Unknown top-up pack" }, { status: 400 });
    }
    if (!phoneNumber) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
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
        // Top-ups are mobile money only.
        payment_method: "mobile_money",
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

    const lipilaResponse = await collectMobileMoney({
      referenceId,
      amount: amountKwacha,
      narration,
      accountNumber: formatZambianPhone(phoneNumber),
      currency: "ZMW",
      email: email || session.email || "billing@firstinqueue.com",
    });

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
