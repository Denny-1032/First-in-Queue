// =============================================
// Subscription Plan Definitions (Zambia Market)
// =============================================

export interface PlanDefinition {
  id: string;
  name: string;
  priceZMW: number;
  priceLabel: string;
  yearlyPriceZMW: number;
  yearlyPriceLabel: string;
  yearlyMonthlyLabel: string;
  messagesPerMonth: number;
  messagesLabel: string;
  /**
   * Monthly web-chat AI reply ceiling — a SEPARATE meter from `messagesPerMonth`
   * (which counts WhatsApp conversations). Web replies are the low-marginal-cost
   * class (pricing-model-v2 §5–6), so they get their own, more generous cap.
   * Enforced per-property by the widget path via `getWebReplyCeiling`.
   */
  webAiRepliesPerMonth: number;
  voiceMinutesPerMonth: number;
  voiceMinutesLabel: string;
  whatsappNumbers: number;
  features: string[];
  highlight?: boolean;
  cta: string;
  badge?: string;
}

// Trial & guarantee constants
export const GUARANTEE_DAYS = 30;

// FREE TIER for new signups - limited credits to test platform
export const FREE_TIER = {
  voiceMinutes: 3,
  messages: 5,
};

/**
 * Free-tier web-chat AI reply ceiling (pricing-model-v2 §12). Used as the
 * fail-safe fallback when a tenant has no active subscription or its plan can't
 * be resolved — a hard bound that keeps the "no unbounded OpenAI bill" invariant.
 */
export const FREE_WEB_AI_REPLIES = 500;

export const PLANS: PlanDefinition[] = [
  // Free tier - not shown on pricing page, only for new signups
  {
    id: "free",
    name: "Free",
    priceZMW: 0,
    priceLabel: "Free",
    yearlyPriceZMW: 0,
    yearlyPriceLabel: "Free",
    yearlyMonthlyLabel: "Free",
    messagesPerMonth: 5,
    messagesLabel: "5 WhatsApp conversations",
    webAiRepliesPerMonth: 500,
    voiceMinutesPerMonth: 3,
    voiceMinutesLabel: "3 AI voice call minutes",
    whatsappNumbers: 1,
    features: [
      "5 WhatsApp conversations",
      "3 AI voice call minutes",
      "1 WhatsApp number",
      "Basic AI responses",
      "Upgrade anytime to unlock more",
    ],
    cta: "Get Started",
  },
  {
    id: "basic",
    name: "Basic",
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
    features: [
      "Up to 1,000 WhatsApp conversations/month",
      "Up to 30 AI voice call minutes/month",
      "1 WhatsApp number",
      "Automated responses (FAQs, enquiries, bookings)",
      "24/7 support in 40+ languages",
      "Basic analytics dashboard",
    ],
    cta: "Choose Plan",
  },
  {
    id: "business",
    name: "Business",
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
    features: [
      "Up to 5,000 WhatsApp conversations/month",
      "Up to 120 AI voice call minutes/month",
      "2 WhatsApp numbers",
      "Human agent handoff",
      "Scheduled outbound calls (reminders, follow-ups)",
      "Advanced analytics & reporting",
      "Dedicated onboarding support",
    ],
    cta: "Choose Plan",
    badge: "Most Popular",
    highlight: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    priceZMW: 5000,
    priceLabel: "Custom (Starting from K5,000/month)",
    yearlyPriceZMW: 5000,
    yearlyPriceLabel: "Custom",
    yearlyMonthlyLabel: "Custom",
    // WhatsApp and voice are real third-party pass-throughs, so they are
    // metered and never unlimited (pricing-model-v2 §3). These are the exact
    // allowances Enterprise was costed on in §2 - K2,727 COGS at 5,000 messages
    // and 500 voice minutes, a 45% margin. Break-even is 1,425 voice minutes,
    // so 500 keeps a 2.8x safety band. Overage is contracted, not published.
    messagesPerMonth: 5000,
    messagesLabel: "5,000 WhatsApp conversations/mo",
    // Web is low-marginal-cost but "never unlimited" (pricing-model-v2 §143):
    // a generous fair-use bound, negotiated per contract.
    webAiRepliesPerMonth: 50000,
    voiceMinutesPerMonth: 500,
    voiceMinutesLabel: "500 AI voice call minutes/mo",
    whatsappNumbers: 10,
    features: [
      "5,000 WhatsApp conversations/month",
      "500 AI voice call minutes/month",
      "Up to 10 WhatsApp numbers",
      "Higher allowances and overage agreed in your contract",
      "Custom AI trained on business data",
      "99.9% uptime SLA",
      "Dedicated account manager",
      "Custom integrations (POS, ERP, CRM)",
      "On-site onboarding & training",
    ],
    cta: "Contact Sales",
  },
];

export function getPlanById(planId: string): PlanDefinition | undefined {
  return PLANS.find((p) => p.id === planId);
}
