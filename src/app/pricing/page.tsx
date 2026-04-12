"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle2, Star, HelpCircle, ShieldCheck } from "lucide-react";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { PLANS } from "@/lib/lipila/plans";
import { FAQPageJsonLd } from "@/components/seo/json-ld";

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

function PricingContent() {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const searchParams = useSearchParams();
  const fromSettings = searchParams.get("from") === "settings";
  const isYearly = billing === "yearly";

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

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <span className={`text-sm font-medium ${!isYearly ? "text-gray-900" : "text-gray-400"}`}>Monthly</span>
            <button
              onClick={() => setBilling(isYearly ? "monthly" : "yearly")}
              className={`relative w-14 h-7 rounded-full transition-colors ${isYearly ? "bg-emerald-500" : "bg-gray-200"}`}
            >
              <div className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${isYearly ? "translate-x-7" : "translate-x-0.5"}`} />
            </button>
            <span className={`text-sm font-medium ${isYearly ? "text-gray-900" : "text-gray-400"}`}>
              Yearly
            </span>
            {isYearly && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100 rounded-full px-2.5 py-0.5">
                Save 20%
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Plans — centered grid for 3 cards */}
      <section className="py-12 px-6">
        <div className="flex justify-center">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl">
            {PLANS.filter((plan) => plan.id !== "free").map((plan) => (
              <div
                key={plan.id}
                className={`rounded-2xl border-2 p-7 flex flex-col ${
                  plan.highlight
                    ? "border-emerald-500 bg-white shadow-xl shadow-emerald-500/10 relative"
                    : "border-gray-200 bg-white"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-1 text-xs font-semibold text-white whitespace-nowrap">
                      <Star className="h-3 w-3" />
                      {plan.badge}
                    </span>
                  </div>
                )}
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                  <div className="mt-3">
                    {plan.id === "enterprise" ? (
                      <span className="text-3xl font-bold text-gray-900">Custom</span>
                    ) : isYearly ? (
                      <>
                        <span className="text-3xl font-bold text-gray-900">{plan.yearlyMonthlyLabel}</span>
                        <span className="text-gray-500">/mo</span>
                        <p className="text-xs text-emerald-600 font-medium mt-1">
                          {plan.yearlyPriceLabel}/year &middot; Save 20%
                        </p>
                      </>
                    ) : (
                      <>
                        <span className="text-3xl font-bold text-gray-900">{plan.priceLabel}</span>
                        <span className="text-gray-500">/mo</span>
                      </>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-3 font-medium">
                    {plan.id === "basic" && "For small businesses getting started with automated customer support"}
                    {plan.id === "business" && "For growing businesses handling daily customer demand"}
                    {plan.id === "enterprise" && "For high-volume or mission-critical operations"}
                  </p>
                  {plan.id === "basic" && (
                    <p className="text-xs text-gray-500 mt-2 italic">"Ideal for businesses handling up to ~30 customer enquiries per day"</p>
                  )}
                </div>
                <ul className="space-y-2.5 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={
                    plan.id === "enterprise"
                      ? "/contact"
                      : fromSettings
                        ? `/trial-payment?plan=${plan.id}&billing=${billing}`
                        : "/login"
                  }
                  className={`block w-full text-center rounded-xl py-3 text-sm font-semibold transition-all ${
                    plan.highlight
                      ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/25"
                      : "border-2 border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {fromSettings && plan.id !== "enterprise" ? "Choose Plan" : plan.cta}
                </Link>
                {plan.id !== "enterprise" && (
                  <>
                    <p className="text-xs text-gray-500 text-center mt-3">
                      Additional usage charged at K1.70/message and K3.80/minute
                    </p>
                    <p className="text-xs text-emerald-600 text-center mt-1 font-medium">
                      30-day money-back guarantee
                    </p>
                  </>
                )}
                {plan.id === "enterprise" && (
                  <p className="text-xs text-gray-500 text-center mt-3 italic">
                    *Subject to fair usage policy
                  </p>
                )}
              </div>
            ))}
          </div>
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

export default function PricingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <PricingContent />
    </Suspense>
  );
}
