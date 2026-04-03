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
    id: "basic",
    name: "Basic",
    priceZMW: 499,
    priceLabel: "K499",
    yearlyPriceZMW: 4790,
    yearlyPriceLabel: "K4,790",
    yearlyMonthlyLabel: "K399",
    messagesPerMonth: 1000,
    messagesLabel: "1,000 WhatsApp conversations/mo",
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
    messagesPerMonth: 999999,
    messagesLabel: "Unlimited WhatsApp conversations*",
    voiceMinutesPerMonth: 999999,
    voiceMinutesLabel: "Unlimited voice usage*",
    whatsappNumbers: 99,
    features: [
      "Unlimited WhatsApp conversations*",
      "Unlimited voice usage*",
      "Unlimited WhatsApp numbers",
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
