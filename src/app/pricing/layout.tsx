import type { Metadata } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://firstinqueue.com";

export const metadata: Metadata = {
  title: "Pricing — Affordable AI WhatsApp & Voice Plans in ZMW",
  description:
    "Simple, transparent pricing in Zambian Kwacha. Start free with 3 voice minutes & 5 messages. Plans from K750/mo. 30-day money-back guarantee.",
  alternates: {
    canonical: `${BASE_URL}/pricing`,
  },
  openGraph: {
    title: "Pricing — AI Customer Care Plans | First in Queue",
    description:
      "Affordable WhatsApp & voice automation plans in ZMW. Start free, scale as you grow. 30-day money-back guarantee.",
    url: `${BASE_URL}/pricing`,
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
