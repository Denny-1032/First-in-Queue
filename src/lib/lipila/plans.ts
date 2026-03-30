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
  voiceMinutesPerMonth: number;
  voiceMinutesLabel: string;
  whatsappNumbers: number;
  features: string[];
  highlight?: boolean;
  cta: string;
  badge?: string;
}

// Trial & guarantee constants
export const TRIAL_DAYS = 7;
export const GUARANTEE_DAYS = 30;

export const PLANS: PlanDefinition[] = [
  {
    id: "starter",
    name: "Starter",
    priceZMW: 499,
    priceLabel: "K499",
    yearlyPriceZMW: 4790,
    yearlyPriceLabel: "K4,790",
    yearlyMonthlyLabel: "K399",
    messagesPerMonth: 1000,
    messagesLabel: "1,000 messages/mo",
    voiceMinutesPerMonth: 30,
    voiceMinutesLabel: "30 voice minutes/mo",
    whatsappNumbers: 1,
    features: [
      "AI-powered responses",
      "30 AI voice call minutes",
      "1 WhatsApp number",
      "40+ languages auto-detected",
      "Conversation flows",
      "Analytics dashboard",
      "Priority email support",
    ],
    cta: "Start 7-Day Free Trial",
    badge: "Most Popular",
    highlight: true,
  },
  {
    id: "growth",
    name: "Growth",
    priceZMW: 1299,
    priceLabel: "K1,299",
    yearlyPriceZMW: 12470,
    yearlyPriceLabel: "K12,470",
    yearlyMonthlyLabel: "K1,039",
    messagesPerMonth: 5000,
    messagesLabel: "5,000 messages/mo",
    voiceMinutesPerMonth: 120,
    voiceMinutesLabel: "120 voice minutes/mo",
    whatsappNumbers: 2,
    features: [
      "Everything in Starter",
      "120 AI voice call minutes",
      "2 WhatsApp numbers",
      "Scheduled outbound calls",
      "Human agent handoff",
      "Advanced analytics",
      "Dedicated onboarding",
      "Phone & WhatsApp support",
    ],
    cta: "Start 7-Day Free Trial",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    priceZMW: 0,
    priceLabel: "Custom",
    yearlyPriceZMW: 0,
    yearlyPriceLabel: "Custom",
    yearlyMonthlyLabel: "Custom",
    messagesPerMonth: 999999,
    messagesLabel: "Unlimited messages",
    voiceMinutesPerMonth: 999999,
    voiceMinutesLabel: "Unlimited voice minutes",
    whatsappNumbers: 99,
    features: [
      "Everything in Growth",
      "Unlimited messages",
      "Unlimited voice minutes",
      "Unlimited WhatsApp numbers",
      "Custom AI training on your data",
      "99.9% uptime SLA",
      "Dedicated account manager",
      "Custom integrations (POS, ERP)",
      "On-site training available",
    ],
    cta: "Contact Sales",
  },
];

export function getPlanById(planId: string): PlanDefinition | undefined {
  return PLANS.find((p) => p.id === planId);
}
