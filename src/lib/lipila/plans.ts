// =============================================
// Subscription Plan Definitions (Zambia Market)
// =============================================
//
// v2 model (docs/pricing-model-v2.md §4). The structural change from the old
// volume ladder is that WhatsApp and voice STOP BEING BUNDLED and become
// prepaid usage credit (src/lib/credit/), because they are the only real
// third-party pass-through costs. What Pro sells is CAPABILITY - branding
// removed, channels unlocked, unlimited properties and agents - not a message
// quota. That is what turns K499 from a 40% margin line into an ~89% one.
//
//   Free        K0            web chat only, FiQ branding shown
//   Pro         K499/mo       branding off, WhatsApp + voice + actions unlocked
//   Institution from K5,000   SLA, SSO, audit, residency, contracted usage
//
// Basic and Business remain below as LEGACY entries. They are hidden from every
// pricing surface but must keep their allowances so the subscriptions already
// paid for are honoured to the end of their period. They are removed once no
// active subscription references them.

export interface PlanDefinition {
  id: string;
  name: string;
  priceZMW: number;
  priceLabel: string;
  yearlyPriceZMW: number;
  yearlyPriceLabel: string;
  yearlyMonthlyLabel: string;
  /**
   * WhatsApp conversations INCLUDED in the subscription, metered per 24h
   * window (migration 018). Zero on Pro by design: WhatsApp is pass-through
   * cost and is paid for with usage credit at the published per-message rate.
   */
  messagesPerMonth: number;
  messagesLabel: string;
  /**
   * Monthly web-chat AI reply ceiling — a SEPARATE meter from `messagesPerMonth`.
   * Web replies are the low-marginal-cost class (pricing-model-v2 §5–6), so they
   * get their own, more generous cap. Enforced per-property by the widget path
   * via `getWebReplyCeiling`.
   */
  webAiRepliesPerMonth: number;
  /** Voice minutes included. Zero on Pro; drawn from usage credit instead. */
  voiceMinutesPerMonth: number;
  voiceMinutesLabel: string;
  whatsappNumbers: number;

  // --- Capability gates (pricing-model-v2 §4: gate on capability, not volume) ---

  /** Can this plan hide "Powered by First in Queue"? Free cannot. */
  brandingRemovable: boolean;
  /** Are WhatsApp, voice and automated actions available at all? */
  channelsUnlocked: boolean;
  /** null = unlimited. Properties and agents are zero-marginal-cost (§3). */
  maxProperties: number | null;
  maxAgents: number | null;
  /** Superseded plan, honoured until its period ends but never sold. */
  legacy?: boolean;

  features: string[];
  highlight?: boolean;
  cta: string;
  badge?: string;
}

// Trial & guarantee constants
export const GUARANTEE_DAYS = 30;

/**
 * Free-tier web-chat AI reply ceiling (pricing-model-v2 §12). Used as the
 * fail-safe fallback when a tenant has no active subscription or its plan can't
 * be resolved — a hard bound that keeps the "no unbounded OpenAI bill" invariant.
 */
export const FREE_WEB_AI_REPLIES = 500;

export const PLANS: PlanDefinition[] = [
  {
    id: "free",
    name: "Free",
    priceZMW: 0,
    priceLabel: "Free",
    yearlyPriceZMW: 0,
    yearlyPriceLabel: "Free",
    yearlyMonthlyLabel: "Free",
    // Web only. WhatsApp and voice cost real money per use, so they are not
    // given away — they are unlocked by Pro and paid for with credit.
    messagesPerMonth: 0,
    messagesLabel: "Website chat only",
    webAiRepliesPerMonth: 500,
    voiceMinutesPerMonth: 0,
    voiceMinutesLabel: "Voice not included",
    whatsappNumbers: 0,
    brandingRemovable: false,
    channelsUnlocked: false,
    maxProperties: 1,
    maxAgents: 1,
    features: [
      "Website chat widget",
      "Unlimited conversations and team seats",
      "500 AI replies a month",
      "1 website",
      "Shows a small \"Powered by First in Queue\"",
    ],
    cta: "Get Started",
  },
  {
    id: "pro",
    name: "Pro",
    priceZMW: 499,
    priceLabel: "K499",
    yearlyPriceZMW: 4990,
    yearlyPriceLabel: "K4,990",
    yearlyMonthlyLabel: "K416",
    // Zero bundled pass-through usage. Every WhatsApp reply and voice minute is
    // drawn from prepaid credit at the rate published on /pricing. This is the
    // whole point of v2: no uncapped liability, and margin that does not
    // collapse when a customer is busy.
    messagesPerMonth: 0,
    messagesLabel: "WhatsApp billed from your usage credit",
    webAiRepliesPerMonth: 5000,
    voiceMinutesPerMonth: 0,
    voiceMinutesLabel: "Voice billed from your usage credit",
    whatsappNumbers: 2,
    brandingRemovable: true,
    channelsUnlocked: true,
    maxProperties: null,
    maxAgents: null,
    features: [
      "Everything in Free",
      "FiQ branding removed",
      "WhatsApp, voice and automated actions unlocked",
      "Unlimited websites and team agents",
      "5,000 web AI replies a month",
      "WhatsApp and voice paid from prepaid credit, never a surprise bill",
      "Human agent handoff",
    ],
    cta: "Choose Plan",
    badge: "Most Popular",
    highlight: true,
  },
  {
    id: "institution",
    name: "Institution",
    priceZMW: 5000,
    priceLabel: "Custom (Starting from K5,000/month)",
    yearlyPriceZMW: 60000,
    yearlyPriceLabel: "Custom",
    yearlyMonthlyLabel: "Custom",
    // Contracted, capped, never "unlimited" (pricing-model-v2 §2 costed these
    // exact figures). Anything above is negotiated, not automatic.
    messagesPerMonth: 5000,
    messagesLabel: "5,000 WhatsApp conversations/mo",
    webAiRepliesPerMonth: 50000,
    voiceMinutesPerMonth: 500,
    voiceMinutesLabel: "500 AI voice call minutes/mo",
    whatsappNumbers: 10,
    brandingRemovable: true,
    channelsUnlocked: true,
    maxProperties: null,
    maxAgents: null,
    features: [
      "Everything in Pro",
      "5,000 WhatsApp conversations/month",
      "500 AI voice call minutes/month",
      "Up to 10 WhatsApp numbers",
      "Higher allowances and overage agreed in your contract",
      "99.9% uptime SLA",
      "SSO, audit log and data residency",
      "Dedicated customer success manager",
      "Custom integrations (POS, ERP, CRM)",
      "On-site onboarding & training",
    ],
    cta: "Contact Sales",
  },

  // --- Legacy. Hidden from pricing; honoured until the period ends. ---
  {
    id: "basic",
    name: "Basic (legacy)",
    priceZMW: 499,
    priceLabel: "K499",
    yearlyPriceZMW: 4790,
    yearlyPriceLabel: "K4,790",
    yearlyMonthlyLabel: "K399",
    messagesPerMonth: 1000,
    messagesLabel: "1,000 WhatsApp conversations/mo",
    webAiRepliesPerMonth: 5000,
    voiceMinutesPerMonth: 30,
    voiceMinutesLabel: "30 AI voice call minutes/mo",
    whatsappNumbers: 1,
    brandingRemovable: true,
    channelsUnlocked: true,
    maxProperties: null,
    maxAgents: null,
    legacy: true,
    features: [],
    cta: "Choose Plan",
  },
  {
    id: "business",
    name: "Business (legacy)",
    priceZMW: 1699,
    priceLabel: "K1,699",
    yearlyPriceZMW: 16310,
    yearlyPriceLabel: "K16,310",
    yearlyMonthlyLabel: "K1,359",
    messagesPerMonth: 5000,
    messagesLabel: "5,000 WhatsApp conversations/mo",
    webAiRepliesPerMonth: 5000,
    voiceMinutesPerMonth: 120,
    voiceMinutesLabel: "120 AI voice call minutes/mo",
    whatsappNumbers: 2,
    brandingRemovable: true,
    channelsUnlocked: true,
    maxProperties: null,
    maxAgents: null,
    legacy: true,
    features: [],
    cta: "Choose Plan",
  },
];

/** Plans that are actually for sale. Legacy entries are honoured, not offered. */
export const SELLABLE_PLANS = PLANS.filter((p) => !p.legacy);

export function getPlanById(planId: string): PlanDefinition | undefined {
  return PLANS.find((p) => p.id === planId);
}

/**
 * Resolve the plan a tenant is entitled under, falling back to Free.
 *
 * Fails SAFE: an unknown or missing plan id yields Free, which is the least
 * capable plan. A gate that cannot read the plan must not hand out Pro.
 */
export function getPlanOrFree(planId: string | null | undefined): PlanDefinition {
  return (planId ? getPlanById(planId) : undefined) ?? PLANS[0];
}

export interface ResolvedPlan {
  planId: string;
  interval: "monthly" | "yearly";
}

/**
 * Resolve which plan a payment bought.
 *
 * Prefers the plan carried ON the payment row (migration 020 added
 * `payments.plan_id` / `payments.billing_interval`). That is the only reliable
 * answer: the amount alone cannot distinguish a plan whose price has since
 * changed, and it certainly cannot survive a partial payment.
 *
 * Lives here rather than in subscription-helpers so trial-helpers can use it
 * without an import cycle. plans.ts is a leaf module.
 */
export function resolvePlanFromPayment(payment: {
  plan_id?: string | null;
  billing_interval?: string | null;
  amount: number | string;
}): ResolvedPlan | null {
  if (payment.plan_id && getPlanById(payment.plan_id)) {
    return {
      planId: payment.plan_id,
      interval: payment.billing_interval === "yearly" ? "yearly" : "monthly",
    };
  }

  return resolvePlanFromAmount(Number(payment.amount));
}

/**
 * Legacy fallback: infer the plan from the amount paid, by EXACT match.
 *
 * Only for payment rows written before migration 020 carried the plan
 * explicitly. Legacy plans are matched on purpose - an old Business payment
 * must still resolve to Business.
 *
 * Deliberately NOT the old `amount >= price` sorted descending, which quietly
 * promoted anyone who overpaid by a ngwee and resolved every unrecognised
 * amount to the most expensive plan it happened to exceed. Returns null when
 * nothing matches, so callers decide rather than being handed a
 * plausible-looking wrong plan.
 */
export function resolvePlanFromAmount(amount: number): ResolvedPlan | null {
  const paid = Math.round(Number(amount) * 100);
  if (!Number.isFinite(paid) || paid <= 0) return null;

  for (const plan of PLANS) {
    if (plan.priceZMW > 0 && Math.round(plan.priceZMW * 100) === paid) {
      return { planId: plan.id, interval: "monthly" };
    }
    if (plan.yearlyPriceZMW > 0 && Math.round(plan.yearlyPriceZMW * 100) === paid) {
      return { planId: plan.id, interval: "yearly" };
    }
  }

  return null;
}
