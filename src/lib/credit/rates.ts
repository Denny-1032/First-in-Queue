// =============================================
// Usage credit: rates and top-up packs
// =============================================
//
// Money is held in NGWEE (integer) everywhere. 100 ngwee = K1. Nothing in the
// credit path uses a float: a rounding error in a balance is a rounding error
// in someone's money.

/** 100 ngwee to the kwacha. */
export const NGWEE_PER_KWACHA = 100;

export function kwachaToNgwee(kwacha: number): number {
  return Math.round(kwacha * NGWEE_PER_KWACHA);
}

/** Display helper: 170 -> "K1.70". */
export function formatNgwee(ngwee: number): string {
  const kwacha = ngwee / NGWEE_PER_KWACHA;
  return `K${kwacha.toLocaleString("en-ZM", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * What one unit of metered usage costs the customer, in ngwee.
 *
 * These match the overage rates already published on /pricing and in the FiQ
 * knowledge base. They are deliberately the same numbers: a customer who reads
 * "K1.70 per WhatsApp message" on the pricing page and then watches credit come
 * off at a different rate has caught us being inconsistent, and rightly.
 *
 * WHATSAPP_REPLY IS PROVISIONAL. Meta publishes Rest-of-Africa rates no later
 * than 1 September 2026, and per-message charging starts 1 October 2026
 * (docs/v2-implementation-plan.md §1.4). At K0.194 projected COGS this rate is
 * ~9x cost - defensible as a deterrent while the real number is unknown, but it
 * should be re-derived, and probably cut, once Meta publishes. That is a change
 * to this one constant.
 *
 * VOICE_MINUTE is not blocked on Meta: voice cost is Retell-driven (K3.51/min
 * measured), so K7.00 is the ~2x COGS rule from pricing-model-v2 §3.
 */
export const CREDIT_RATES = {
  /** K1.70 per outbound WhatsApp reply beyond the plan allowance. */
  WHATSAPP_REPLY_NGWEE: 170,
  /** K7.00 per voice minute beyond the plan allowance. */
  VOICE_MINUTE_NGWEE: 700,
} as const;

export interface TopupPack {
  id: string;
  ngwee: number;
  label: string;
  /** Rough guide shown next to the pack, derived from the rates above. */
  description: string;
}

/**
 * Prepaid packs, sized near pricing-model-v2 §4's $10/$25/$50/$100 at roughly
 * K17/USD. K200 is also the figure /why-fiq already uses in its public
 * "at your current rate, K200 lasts about 3 weeks" example.
 */
export const TOPUP_PACKS: TopupPack[] = [
  { id: "k200", ngwee: 20_000, label: "K200", description: "about 117 WhatsApp replies or 28 voice minutes" },
  { id: "k500", ngwee: 50_000, label: "K500", description: "about 294 WhatsApp replies or 71 voice minutes" },
  { id: "k1000", ngwee: 100_000, label: "K1,000", description: "about 588 WhatsApp replies or 142 voice minutes" },
  { id: "k2000", ngwee: 200_000, label: "K2,000", description: "about 1,176 WhatsApp replies or 285 voice minutes" },
];

export function getTopupPack(id: string): TopupPack | undefined {
  return TOPUP_PACKS.find((p) => p.id === id);
}
