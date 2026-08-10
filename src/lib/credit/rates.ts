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
 * These are the only place the rates are stated to a customer: the dashboard
 * Usage Credit panel renders them from here. /pricing and the knowledge base
 * deliberately no longer quote figures, so there is nothing to drift out of
 * sync with - but the panel must keep showing what is actually charged.
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
  /** What the pack buys, derived from the rates above. */
  description: string;
  /** The same figures unformatted, for callers that lay them out themselves. */
  units: { whatsappReplies: number; voiceMinutes: number };
}

/**
 * How far a balance goes at today's rates.
 *
 * Floored, never rounded up: a customer who is told 117 replies must get at
 * least 117. These are exact at the stated rates - the only thing that varies
 * is the MIX, which the copy says out loud rather than hedging every number
 * with "about".
 */
export function packUnits(ngwee: number): { whatsappReplies: number; voiceMinutes: number } {
  return {
    whatsappReplies: Math.floor(ngwee / CREDIT_RATES.WHATSAPP_REPLY_NGWEE),
    voiceMinutes: Math.floor(ngwee / CREDIT_RATES.VOICE_MINUTE_NGWEE),
  };
}

/** "117 WhatsApp replies or 28 voice minutes" */
export function describePack(ngwee: number): string {
  const u = packUnits(ngwee);
  return `${u.whatsappReplies.toLocaleString("en-ZM")} WhatsApp replies or ${u.voiceMinutes.toLocaleString("en-ZM")} voice minutes`;
}

/**
 * Said once wherever packs are shown, so no individual figure has to hedge.
 * Answers the question the numbers raise: is this a bundle of messages, or
 * money? It is money - see the balance ledger in credit.ts.
 */
export const TOPUP_MIX_NOTE =
  "Credit is spent as you use it, in any mix. Website chat is never charged.";

function pack(id: string, ngwee: number, label: string): TopupPack {
  return { id, ngwee, label, description: describePack(ngwee), units: packUnits(ngwee) };
}

/**
 * Prepaid packs, sized near pricing-model-v2 §4's $10/$25/$50/$100 at roughly
 * K17/USD. K200 is also the figure /why-fiq already uses in its public
 * "at your current rate, K200 lasts about 3 weeks" example.
 */
export const TOPUP_PACKS: TopupPack[] = [
  pack("k200", 20_000, "K200"),
  pack("k500", 50_000, "K500"),
  pack("k1000", 100_000, "K1,000"),
  pack("k2000", 200_000, "K2,000"),
];

export function getTopupPack(id: string): TopupPack | undefined {
  return TOPUP_PACKS.find((p) => p.id === id);
}
