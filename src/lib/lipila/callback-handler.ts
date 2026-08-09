import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { LipilaCallbackPayload } from "./client";
import { readWebhookHeaders, verifyWebhook } from "./webhook";
import { settlePayment } from "./settle";

/**
 * Shared Lipila callback handler.
 *
 * Two URLs point here because Lipila takes the destination from two places:
 * the per-request `callbackUrl` header (/api/payments/callback) and the
 * wallet-level callback configured in the dashboard (/api/webhooks/lipila).
 * They used to be copy-pasted routes that drifted; there is one body now.
 */
export async function handleLipilaCallback(
  request: NextRequest,
  source: string
): Promise<NextResponse> {
  const tag = `[Lipila ${source}]`;

  try {
    // Read the bytes as sent. Parsing first and re-serialising to verify would
    // reorder keys and break every signature.
    const rawBody = await request.text();

    const verdict = verifyWebhook(rawBody, readWebhookHeaders(request.headers));
    if (!verdict.ok) {
      console.error(`${tag} Rejected: ${verdict.reason}`);
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    let payload: LipilaCallbackPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Malformed JSON body" }, { status: 400 });
    }

    const { referenceId, status, paymentType, identifier, externalId, message } = payload;

    if (!referenceId) {
      return NextResponse.json({ error: "Missing referenceId" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data: payment, error: findError } = await supabase
      .from("payments")
      .select("*, tenant_id")
      .eq("lipila_reference_id", referenceId)
      .single();

    if (findError || !payment) {
      console.error(`${tag} Payment not found for referenceId:`, referenceId);
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const paymentStatus = status === "Successful" ? "successful" : "failed";

    const settled = await settlePayment(payment, paymentStatus, {
      payment_type: paymentType,
      lipila_identifier: identifier,
      lipila_external_id: externalId || null,
      callback_data: payload,
      error_message: status === "Failed" ? message : null,
    });

    console.log(`${tag} ${referenceId} -> ${paymentStatus} (${settled.outcome})`);

    // 200 even on already_settled: a non-2xx makes Lipila retry a callback that
    // has nothing left to do.
    return NextResponse.json({
      received: true,
      status: paymentStatus,
      outcome: settled.outcome,
    });
  } catch (error) {
    console.error(`${tag} Error:`, error);
    return NextResponse.json({ error: "Callback processing failed" }, { status: 500 });
  }
}
