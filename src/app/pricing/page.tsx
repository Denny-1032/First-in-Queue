import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Star, HelpCircle, Smartphone, CreditCard, Shield } from "lucide-react";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { PLANS } from "@/lib/lipila/plans";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Simple, transparent pricing in Zambian Kwacha. 7-day free trial. 30-day money-back guarantee.",
};

const faqs = [
  {
    question: "How does the 7-day trial work?",
    answer: "Sign up and get full access to your chosen plan for 7 days — no payment required. If you don't subscribe before the trial ends, your account pauses.",
  },
  {
    question: "What's the 30-day money-back guarantee?",
    answer: "If you're not satisfied within 30 days of your first payment, contact us for a full refund. No questions asked.",
  },
  {
    question: "What counts as a message?",
    answer: "Each AI-generated response counts as one message. Inbound customer messages and system messages (read receipts, etc.) don't count.",
  },
  {
    question: "Which payment methods do you accept?",
    answer: "Airtel Money, MTN Money, Zamtel Kwacha, and Visa/Mastercard via Lipila. All prices in ZMW.",
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
    question: "What if the AI can't answer?",
    answer: "It escalates to a human agent on your team with full conversation context.",
  },
  {
    question: "Which languages are supported?",
    answer: "40+ languages including English, Bemba, Nyanja, Tonga, and Lozi. Auto-detected.",
  },
  {
    question: "What if I exceed my message limit?",
    answer: "We notify you at 80%. After the limit, messages queue until the next cycle or until you upgrade. No surprise charges.",
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight">
            Plans that grow{" "}
            <span className="bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent">
              with your business
            </span>
          </h1>
          <p className="text-lg text-gray-500 mt-6 max-w-2xl mx-auto">
            7-day free trial on every plan. 30-day money-back guarantee. Pay with Mobile Money or Card.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mt-8 text-sm text-gray-500">
            <div className="flex items-center gap-1.5">
              <Smartphone className="h-4 w-4 text-emerald-500 shrink-0" />
              Airtel, MTN & Zamtel
            </div>
            <div className="flex items-center gap-1.5">
              <CreditCard className="h-4 w-4 text-emerald-500 shrink-0" />
              Visa & Mastercard
            </div>
            <div className="flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-emerald-500 shrink-0" />
              Secure via Lipila
            </div>
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className="py-12 px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {PLANS.map((plan) => (
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
                  ) : (
                    <>
                      <span className="text-3xl font-bold text-gray-900">{plan.priceLabel}</span>
                      <span className="text-gray-500">/mo</span>
                    </>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">{plan.messagesLabel}</p>
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
                href={plan.id === "enterprise" ? "/contact" : "/login"}
                className={`block w-full text-center rounded-xl py-3 text-sm font-semibold transition-all ${
                  plan.highlight
                    ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/25"
                    : "border-2 border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Value Props for Zambia */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-12">
            Why Zambian businesses choose First in Queue
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-green-100 mb-4">
                <span className="text-2xl">🇿🇲</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Built for Zambia</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Kwacha pricing, local payment methods, and AI that speaks Bemba, Nyanja, and more.
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 mb-4">
                <span className="text-2xl">💬</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">WhatsApp-native</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                4M+ Zambians on WhatsApp daily. Meet customers where they are.
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 mb-4">
                <span className="text-2xl">⚡</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Risk-free</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                7-day free trial. 30-day money-back guarantee. Cancel anytime.
              </p>
            </div>
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
            <h2 className="text-3xl md:text-4xl font-bold">Start your free trial</h2>
            <p className="text-emerald-100 mt-4 max-w-lg mx-auto">
              7-day free trial. 30-day money-back guarantee.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 mt-8 rounded-xl bg-white px-8 py-4 text-base font-semibold text-emerald-700 hover:bg-emerald-50 transition-all shadow-lg"
            >
              Start Free Trial
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
