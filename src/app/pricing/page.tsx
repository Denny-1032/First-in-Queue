import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, HelpCircle, ShieldCheck } from "lucide-react";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { FAQPageJsonLd } from "@/components/seo/json-ld";
import { PricingPlans } from "@/components/landing/pricing-plans";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://firstinqueue.com";

export const metadata: Metadata = {
  title: "Pricing — Affordable AI WhatsApp & Voice Plans in ZMW",
  description:
    "AI WhatsApp automation from K499/month. Business plan K1,699/month. 30-day money-back guarantee. Pay with Airtel Money, MTN, Zamtel, or card.",
  alternates: {
    canonical: `${BASE_URL}/pricing`,
  },
  openGraph: {
    title: "Pricing | First in Queue",
    description:
      "AI WhatsApp & voice plans from K499/month. 30-day money-back guarantee. Mobile money accepted.",
    url: `${BASE_URL}/pricing`,
  },
};

const faqs = [
  {
    question: "What's the 30-day money-back guarantee?",
    answer: "If you're not satisfied within 30 days of your first payment, contact us for a full refund. No questions asked.",
  },
  {
    question: "What do I get when I sign up?",
    answer: "When you create an account, you get 3 free voice minutes and 5 free WhatsApp messages to test the platform. To unlock full features, choose a paid plan.",
  },
  {
    question: "What counts as a WhatsApp conversation?",
    answer: "Each automated response counts as one conversation. Inbound customer messages and system messages don't count.",
  },
  {
    question: "Which payment methods do you accept?",
    answer: "Airtel Money, MTN Money, Zamtel Kwacha, and Visa/Mastercard. All prices in ZMW.",
  },
  {
    question: "Can I switch plans?",
    answer: "Yes. Upgrade or downgrade anytime from your dashboard. Upgrades are instant; downgrades apply at the end of your billing cycle.",
  },
  {
    question: "Do I need technical skills?",
    answer: "No. Setup takes 5 minutes. Our team handles WhatsApp API configuration for you.",
  },
  {
    question: "Which languages are supported?",
    answer: "40+ languages including English, Bemba, Nyanja, Tonga, Lozi, French, Portuguese, and more. Auto-detected from each message.",
  },
  {
    question: "What if I exceed my plan limits?",
    answer: "Service continues automatically. Additional usage is billed at K1.70 per WhatsApp message and K3.80 per voice minute. No service interruption.",
  },
  {
    question: "What are AI voice call minutes?",
    answer: "Your AI assistant can make and receive phone calls — handling customer enquiries, scheduling callbacks, and more. Voice minutes are tracked separately from WhatsApp conversations.",
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      <FAQPageJsonLd faqs={faqs} />
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-12 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight">
            Plans that grow{" "}
            <span className="bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent">
              with your business
            </span>
          </h1>
          <p className="text-lg text-gray-500 mt-6 max-w-2xl mx-auto">
            Get 3 free voice minutes and 5 messages on signup. Upgrade anytime.
          </p>

          {/* 30-day guarantee banner */}
          <div className="inline-flex items-center gap-2.5 mt-8 rounded-full bg-emerald-50 border border-emerald-200 px-6 py-3">
            <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
            <span className="text-sm font-semibold text-emerald-800">
              30-day money-back guarantee — no questions asked
            </span>
          </div>

          {/* Interactive billing toggle + plan cards (client component) */}
          <Suspense fallback={<div className="h-12 mt-8" />}>
            <PricingPlans />
          </Suspense>
        </div>
      </section>

      {/* Money-back guarantee callout */}
      <section className="py-12 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-8 md:p-10 text-center">
            <ShieldCheck className="h-10 w-10 text-emerald-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">30-Day Money-Back Guarantee</h3>
            <p className="text-sm text-gray-600 max-w-lg mx-auto">
              Try any plan risk-free. If you&apos;re not completely satisfied within 30 days
              of your first payment, we&apos;ll refund every Kwacha — no questions asked.
            </p>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section id="faq" className="py-20 px-6 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-6">
            {faqs.map((faq) => (
              <div key={faq.question} className="rounded-xl bg-white border border-gray-200 p-6">
                <div className="flex items-start gap-3">
                  <HelpCircle className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900">{faq.question}</h3>
                    <p className="text-sm text-gray-500 mt-2 leading-relaxed">{faq.answer}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 p-12 md:p-16 text-white">
            <h2 className="text-3xl md:text-4xl font-bold">See FiQ in action</h2>
            <p className="text-emerald-100 mt-4 max-w-lg mx-auto">
              Book a free demo. No commitment required.
            </p>
            <Link
              href="/#book-demo"
              className="inline-flex items-center gap-2 mt-8 rounded-xl bg-white px-8 py-4 text-base font-semibold text-emerald-700 hover:bg-emerald-50 transition-all shadow-lg"
            >
              Book a Demo
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
