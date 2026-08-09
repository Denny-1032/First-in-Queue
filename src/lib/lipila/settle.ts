import { getSupabaseAdmin } from "@/lib/supabase/server";
import { activatePaidSubscription } from "@/lib/trial-helpers";
import { addCredit } from "@/lib/credit/credit";
import { kwachaToNgwee } from "@/lib/credit/rates";
import type { LipilaPaymentType } from "./client";

/**
 * A paid-for payment lands through four different doors: the Lipila callback,
 * the Lipila webhook, the browser returning to /api/payments/confirm, and the
 * status poll the checkout modal runs. Each one used to decide for itself what
 * a successful payment meant, and three of the four got it wrong: only the
 * confirm redirect checked `purpose`, so a K500 credit top-up that settled via
 * the webhook was run through the plan resolver and silently rewrote the
 * tenant's subscription.
 *
 * Every door now calls settlePayment.
 */

export type SettledOutcome =
  | { outcome: "activated"; }
  | { outcome: "credited"; balanceNgwee: number }
  | { outcome: "credit_failed" }
  | { outcome: "failed" }
  | { outcome: "already_settled" };

export interface PaymentRow {
  id: string;
  tenant_id: string;
  amount: number | string;
  status: string;
  purpose?: string | null;
}

export interface SettleUpdate {
  payment_type?: LipilaPaymentType | string | null;
  lipila_identifier?: string | null;
  lipila_external_id?: string | null;
  callback_data?: unknown;
  error_message?: string | null;
  completed_at?: string | null;
}

/**
 * Record the terminal status of a payment and apply what was bought.
 *
 * Idempotent on the payment row: a payment already marked successful is left
 * alone. Lipila retries callbacks, the customer refreshes the return page, and
 * the checkout modal polls - money must not be granted twice.
 */
export async function settlePayment(
  payment: PaymentRow,
  status: "successful" | "failed",
  update: SettleUpdate = {}
): Promise<SettledOutcome> {
  const supabase = getSupabaseAdmin();

  if (payment.status === "successful" || payment.status === "failed") {
    return { outcome: "already_settled" };
  }

  await supabase
    .from("payments")
    .update({
      status,
      ...stripUndefined(update),
      ...(status === "successful" && !update.completed_at
        ? { completed_at: new Date().toISOString() }
        : {}),
    })
    .eq("id", payment.id);

  if (status === "failed") return { outcome: "failed" };

  if (payment.purpose === "credit_topup") {
    // addCredit is itself idempotent on (referenceType, referenceId).
    const credited = await addCredit({
      tenantId: payment.tenant_id,
      amountNgwee: kwachaToNgwee(Number(payment.amount)),
      referenceType: "payment",
      referenceId: payment.id,
    });

    if (!credited) {
      console.error(`[Settle] Top-up ${payment.id} paid but NOT credited`);
      return { outcome: "credit_failed" };
    }

    return { outcome: "credited", balanceNgwee: credited.balanceNgwee };
  }

  await activatePaidSubscription(payment.tenant_id, payment.id, Number(payment.amount));
  return { outcome: "activated" };
}

function stripUndefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Partial<T>;
}
