import { getSupabaseAdmin } from "@/lib/supabase/server";
import { CREDIT_RATES } from "./rates";

// =============================================
// Usage credit: balance, draw-down, top-up, forecast
// =============================================
//
// The ledger (credit_transactions) is the audit trail; usage_credits.balance
// is a cache of it. Both are maintained by the RPCs in migration 019 - nothing
// here writes a balance directly.

export type CreditSource = "whatsapp_reply" | "voice_minute" | "topup" | "adjustment";

export interface CreditConsumeResult {
  /** True when the balance covered it, or an earlier call already paid for it. */
  allowed: boolean;
  balanceNgwee: number;
  /** True when this reference had already been charged - no new spend happened. */
  alreadyCharged: boolean;
}

/**
 * Draw credit down for metered usage.
 *
 * Pass a `referenceId` wherever the caller has a stable id for the thing being
 * charged (a Retell call id, a message id). The ledger is unique on
 * (tenant, source, reference) so a retried webhook charges once, not twice.
 *
 * Fails CLOSED. Any error - insufficient balance, a missing RPC, a dead
 * connection - returns allowed:false and spends nothing. The caller degrades
 * the channel; it must not proceed to incur a third-party cost.
 */
export async function consumeCredit(params: {
  tenantId: string;
  source: CreditSource;
  amountNgwee: number;
  referenceType?: string;
  referenceId?: string;
  quantity?: number;
  unitPriceNgwee?: number;
}): Promise<CreditConsumeResult> {
  const { tenantId, source, amountNgwee } = params;

  try {
    const { data, error } = await getSupabaseAdmin().rpc("consume_credit", {
      p_tenant_id: tenantId,
      p_source: source,
      p_amount_ngwee: amountNgwee,
      p_reference_type: params.referenceType ?? null,
      p_reference_id: params.referenceId ?? null,
      p_quantity: params.quantity ?? null,
      p_unit_price_ngwee: params.unitPriceNgwee ?? null,
    });

    if (error) {
      console.error("[Credit] consume_credit failed, failing closed:", error);
      return { allowed: false, balanceNgwee: 0, alreadyCharged: false };
    }

    const row = (Array.isArray(data) ? data[0] : data) as
      | { allowed: boolean; balance_ngwee: number; already_charged: boolean }
      | undefined;

    if (!row) {
      console.error("[Credit] consume_credit returned no row, failing closed");
      return { allowed: false, balanceNgwee: 0, alreadyCharged: false };
    }

    return {
      allowed: row.allowed,
      balanceNgwee: Number(row.balance_ngwee),
      alreadyCharged: row.already_charged,
    };
  } catch (e) {
    console.error("[Credit] consumeCredit threw, failing closed:", e);
    return { allowed: false, balanceNgwee: 0, alreadyCharged: false };
  }
}

/**
 * Credit a tenant's balance. Idempotent on `referenceId` - pass the payment id
 * so a replayed Lipila callback cannot credit the same payment twice.
 */
export async function addCredit(params: {
  tenantId: string;
  amountNgwee: number;
  source?: CreditSource;
  referenceType?: string;
  referenceId?: string;
}): Promise<{ balanceNgwee: number; alreadyCredited: boolean } | null> {
  try {
    const { data, error } = await getSupabaseAdmin().rpc("add_credit", {
      p_tenant_id: params.tenantId,
      p_amount_ngwee: params.amountNgwee,
      p_source: params.source ?? "topup",
      p_reference_type: params.referenceType ?? null,
      p_reference_id: params.referenceId ?? null,
    });

    if (error) {
      console.error("[Credit] add_credit failed:", error);
      return null;
    }

    const row = (Array.isArray(data) ? data[0] : data) as
      | { balance_ngwee: number; already_credited: boolean }
      | undefined;

    if (!row) return null;

    return { balanceNgwee: Number(row.balance_ngwee), alreadyCredited: row.already_credited };
  } catch (e) {
    console.error("[Credit] addCredit threw:", e);
    return null;
  }
}

/** Current balance in ngwee. Returns 0 for a tenant that has never topped up. */
export async function getCreditBalance(tenantId: string): Promise<number> {
  try {
    const { data } = await getSupabaseAdmin()
      .from("usage_credits")
      .select("balance_ngwee")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    return Number(data?.balance_ngwee ?? 0);
  } catch (e) {
    console.error("[Credit] getCreditBalance failed:", e);
    return 0;
  }
}

export interface CreditForecast {
  balanceNgwee: number;
  /** Mean ngwee spent per day over the sample window. */
  burnRateNgweePerDay: number;
  /** Whole days the balance covers at the observed rate; null when unknowable. */
  daysRemaining: number | null;
  /** Days of history the estimate is based on. */
  sampleDays: number;
  /** Number of draw-downs in the sample. Below ~5 the estimate is noise. */
  sampleSize: number;
}

/**
 * Forecast how long the balance lasts, from THIS tenant's observed draw-down.
 *
 * Deliberately not modelled from a replies-per-conversation constant.
 * docs/v2-implementation-plan.md §1.5 measured 22.7 bot replies per
 * conversation against pricing-model-v2's assumed 4-6, on a contaminated
 * sample - the constant is not trustworthy, and /why-fiq already promises
 * customers a figure ("at your current rate, K200 lasts about 3 weeks"). An
 * estimate wrong by 4x in the customer's disfavour is a support ticket.
 *
 * Returns daysRemaining: null rather than a guess when there is nothing to
 * extrapolate from. Callers should say "not enough usage yet", not "forever".
 */
export async function getCreditForecast(tenantId: string, sampleDays = 14): Promise<CreditForecast> {
  const balanceNgwee = await getCreditBalance(tenantId);
  const since = new Date(Date.now() - sampleDays * 24 * 60 * 60 * 1000).toISOString();

  try {
    const { data } = await getSupabaseAdmin()
      .from("credit_transactions")
      .select("amount_ngwee, created_at")
      .eq("tenant_id", tenantId)
      .lt("amount_ngwee", 0)
      .gte("created_at", since)
      .order("created_at", { ascending: true });

    const rows = data ?? [];
    if (rows.length === 0) {
      return { balanceNgwee, burnRateNgweePerDay: 0, daysRemaining: null, sampleDays, sampleSize: 0 };
    }

    const spent = rows.reduce((sum, r) => sum + Math.abs(Number(r.amount_ngwee)), 0);

    // Measure against elapsed time since the first draw-down, not the full
    // window: a tenant three days into using credit should not have its rate
    // divided by fourteen and be told the balance lasts five times as long as
    // it will.
    const firstAt = new Date(rows[0].created_at).getTime();
    const elapsedDays = Math.max((Date.now() - firstAt) / (24 * 60 * 60 * 1000), 1);
    const burnRateNgweePerDay = spent / elapsedDays;

    return {
      balanceNgwee,
      burnRateNgweePerDay,
      daysRemaining: burnRateNgweePerDay > 0 ? Math.floor(balanceNgwee / burnRateNgweePerDay) : null,
      sampleDays,
      sampleSize: rows.length,
    };
  } catch (e) {
    console.error("[Credit] getCreditForecast failed:", e);
    return { balanceNgwee, burnRateNgweePerDay: 0, daysRemaining: null, sampleDays, sampleSize: 0 };
  }
}

/**
 * Charge one WhatsApp reply sent beyond the plan's conversation allowance.
 *
 * Called only after the allowance is exhausted - inside the allowance the reply
 * is already paid for by the subscription.
 */
export async function chargeWhatsAppOverage(tenantId: string, referenceId?: string): Promise<CreditConsumeResult> {
  return consumeCredit({
    tenantId,
    source: "whatsapp_reply",
    amountNgwee: CREDIT_RATES.WHATSAPP_REPLY_NGWEE,
    referenceType: referenceId ? "message" : undefined,
    referenceId,
    quantity: 1,
    unitPriceNgwee: CREDIT_RATES.WHATSAPP_REPLY_NGWEE,
  });
}

/**
 * Charge voice minutes used beyond the plan allowance.
 *
 * Unlike WhatsApp this is charged AFTER the fact: Retell only reports duration
 * on call_ended, so the cost is not known until the call is over. The balance
 * can therefore go to zero mid-call; `checkVoiceMinutes` is what stops the next
 * call from starting.
 */
export async function chargeVoiceOverage(
  tenantId: string,
  overageMinutes: number,
  callId?: string
): Promise<CreditConsumeResult> {
  return consumeCredit({
    tenantId,
    source: "voice_minute",
    amountNgwee: CREDIT_RATES.VOICE_MINUTE_NGWEE * overageMinutes,
    referenceType: callId ? "voice_call" : undefined,
    referenceId: callId,
    quantity: overageMinutes,
    unitPriceNgwee: CREDIT_RATES.VOICE_MINUTE_NGWEE,
  });
}
