import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Simple, transparent pricing in Zambian Kwacha. 7-day free trial. 30-day money-back guarantee.",
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
