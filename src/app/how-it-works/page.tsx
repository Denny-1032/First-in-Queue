import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  MessageSquare,
  Bot,
  Users,
  Settings,
  Zap,
  Shield,
  Phone,
} from "lucide-react";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";

export const metadata: Metadata = {
  title: "How It Works",
  description: "3 simple steps to AI-powered WhatsApp & voice customer care. No technical skills needed.",
};

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight">
            Up and running in{" "}
            <span className="bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent">
              3 simple steps
            </span>
          </h1>
          <p className="text-lg text-gray-500 mt-6 max-w-2xl mx-auto">
            No technical skills needed. We handle the setup so you can focus on customers.
          </p>
        </div>
      </section>

      {/* Steps */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto space-y-20">
          {/* Step 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold text-lg mb-6">
                01
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Tell us about your business</h2>
              <p className="text-gray-500 leading-relaxed mb-6">
                Share your business name, industry, and common customer questions.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-2 text-sm text-gray-600">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                  Choose your industry (e-commerce, healthcare, restaurant, and more)
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-600">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                  Add your business info, FAQs, and policies
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-600">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                  Set your AI assistant&apos;s name, tone, and personality
                </li>
              </ul>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-8 flex flex-col items-center justify-center gap-4">
              <Settings className="h-16 w-16 text-emerald-500" />
              <p className="text-sm text-gray-500 text-center">Guided setup wizard — no technical knowledge needed.</p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1 rounded-2xl border border-gray-200 bg-gray-50 p-8 flex flex-col items-center justify-center gap-4">
              <Zap className="h-16 w-16 text-blue-500" />
              <p className="text-sm text-gray-500 text-center">WhatsApp API + AI trained on your business data.</p>
            </div>
            <div className="order-1 md:order-2">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-lg mb-6">
                02
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">We set everything up for you</h2>
              <p className="text-gray-500 leading-relaxed mb-6">
                We connect your WhatsApp API, set up AI voice agents, and configure automated flows.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-2 text-sm text-gray-600">
                  <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                  WhatsApp Business API connection (fully managed)
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-600">
                  <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                  AI trained on your products, services, and policies
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-600">
                  <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                  Automated workflows for common customer requests
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-600">
                  <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                  AI voice agent configured for outbound & inbound calls
                </li>
              </ul>
            </div>
          </div>

          {/* Step 3 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 text-white font-bold text-lg mb-6">
                03
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Go live and let AI handle the rest</h2>
              <p className="text-gray-500 leading-relaxed mb-6">
                AI responds to customers 24/7 in 40+ languages. Monitor and fine-tune from your dashboard.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-2 text-sm text-gray-600">
                  <CheckCircle2 className="h-4 w-4 text-purple-500 mt-0.5 shrink-0" />
                  AI handles WhatsApp messages and phone calls instantly
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-600">
                  <CheckCircle2 className="h-4 w-4 text-purple-500 mt-0.5 shrink-0" />
                  Complex issues are automatically escalated to your team
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-600">
                  <CheckCircle2 className="h-4 w-4 text-purple-500 mt-0.5 shrink-0" />
                  Track performance with real-time analytics in your dashboard
                </li>
              </ul>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-8 flex flex-col items-center justify-center gap-4">
              <Bot className="h-16 w-16 text-purple-500" />
              <p className="text-sm text-gray-500 text-center">Resolves up to 78% of inquiries automatically.</p>
            </div>
          </div>
        </div>
      </section>

      {/* What You Get */}
      <section className="py-16 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-12">What&apos;s included</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Bot, title: "AI Assistant", desc: "GPT-4o powered, 24/7, 40+ languages.", color: "text-emerald-600 bg-emerald-100" },
              { icon: Phone, title: "AI Voice Calls", desc: "Outbound, inbound, and scheduled phone calls powered by AI.", color: "text-purple-600 bg-purple-100" },
              { icon: Users, title: "Smart Handoff", desc: "Seamless transfer to human agents with full context.", color: "text-blue-600 bg-blue-100" },
              { icon: MessageSquare, title: "Rich Messages", desc: "Buttons, lists, images, and documents.", color: "text-indigo-600 bg-indigo-100" },
              { icon: Shield, title: "Fully Managed", desc: "We handle hosting, API, and updates.", color: "text-amber-600 bg-amber-100" },
              { icon: Settings, title: "Easy Dashboard", desc: "Conversations, AI settings, and analytics in one place.", color: "text-rose-600 bg-rose-100" },
              { icon: Zap, title: "Conversation Flows", desc: "Automated workflows for bookings, orders, and more.", color: "text-cyan-600 bg-cyan-100" },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl bg-white border border-gray-200 p-6">
                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${item.color} mb-4`}>
                  <item.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                <p className="text-sm text-gray-500 mt-2 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 p-12 md:p-16 text-white">
            <h2 className="text-3xl md:text-4xl font-bold">Ready to get started?</h2>
            <p className="text-emerald-100 mt-4 max-w-lg mx-auto">
              5-minute setup. 7-day free trial. 30-day money-back guarantee.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-semibold text-emerald-700 hover:bg-emerald-50 transition-all shadow-lg"
              >
                Start Free Trial
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 rounded-xl border-2 border-white/30 px-8 py-4 text-base font-semibold text-white hover:bg-white/10 transition-all"
              >
                View Pricing
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
