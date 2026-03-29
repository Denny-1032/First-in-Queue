import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  MessageSquare,
  Bot,
  Zap,
  Globe,
  BarChart3,
  Users,
  ArrowRight,
  CheckCircle2,
  Shield,
  Workflow,
  Clock,
} from "lucide-react";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";

export const metadata: Metadata = {
  title: "AI WhatsApp Customer Care for Zambian Businesses",
  description: "Automate customer support on WhatsApp with AI. 40+ languages, 24/7 responses, 5-minute setup. Start your 7-day free trial.",
};

export default function Home() {
  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold text-gray-900 tracking-tight leading-[1.1] max-w-4xl mx-auto">
            Your customers are{" "}
            <span className="bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent">
              always first
            </span>
          </h1>
          <p className="text-lg text-gray-500 mt-6 max-w-xl mx-auto">
            AI-powered WhatsApp support. Set up in minutes, serve thousands instantly.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-8 py-4 text-base font-semibold text-white hover:from-emerald-600 hover:to-teal-700 transition-all shadow-xl shadow-emerald-500/25"
            >
              Start Free Trial
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/how-it-works"
              className="inline-flex items-center gap-2 rounded-xl border-2 border-gray-200 px-8 py-4 text-base font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all"
            >
              See How It Works
            </Link>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 mt-12 text-sm text-gray-500">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              7-day free trial
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              5-minute setup
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              WhatsApp-compliant
            </div>
          </div>
        </div>
      </section>

      {/* Chat Demo Preview */}
      <section className="pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-2xl border border-gray-200 bg-gradient-to-b from-gray-50 to-white shadow-2xl shadow-gray-200/50 overflow-hidden">
            <div className="bg-emerald-600 px-6 py-4 flex items-center gap-3">
              <Image src="/fiq-logo.png?v=2" alt="First in Queue" width={200} height={200} className="h-9 w-9 object-contain rounded-full bg-white/10 p-0.5" />
              <div>
                <p className="text-white font-medium text-sm">FiQ Assistant</p>
                <p className="text-emerald-200 text-xs">online</p>
              </div>
            </div>
            <div className="p-6 space-y-4 bg-[#f0f2f5]">
              <div className="flex justify-start">
                <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-gray-900 shadow-sm max-w-[70%]">
                  Hi! I ordered a laptop 3 days ago but haven&apos;t received any tracking info yet. Can you help?
                </div>
              </div>
              <div className="flex justify-end">
                <div className="bg-emerald-500 rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm text-white shadow-sm max-w-[70%]">
                  Hey there! I&apos;d be happy to help track your order. Could you share your order number? It should start with #ORD-
                </div>
              </div>
              <div className="flex justify-start">
                <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-gray-900 shadow-sm">
                  #ORD-2024-8847
                </div>
              </div>
              <div className="flex justify-end">
                <div className="bg-emerald-500 rounded-2xl rounded-tr-sm px-4 py-3 text-sm text-white shadow-sm max-w-[75%] whitespace-pre-line">
                  {"Found it! Here's your order status:\n\n✅ Order confirmed\n✅ Payment processed\n✅ Packed & shipped\n🚚 In transit — arriving tomorrow by 5 PM\n\nTracking: TRK-99281746\n\nAnything else I can help with?"}
                </div>
              </div>
              <div className="flex justify-center">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-white/80 rounded-full px-3 py-1">
                  <Bot className="h-3 w-3 text-emerald-500" />
                  Resolved by AI in 8 seconds
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-12 px-6 bg-gray-50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: "78%", label: "AI Resolution Rate" },
            { value: "<10s", label: "Avg Response Time" },
            { value: "40+", label: "Languages Supported" },
            { value: "99.9%", label: "Uptime SLA" },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent">
                {stat.value}
              </p>
              <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Everything you need</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: Bot, title: "AI Responses", desc: "GPT-4o powered, context-aware, on-brand replies.", color: "bg-emerald-100 text-emerald-600" },
              { icon: Globe, title: "40+ Languages", desc: "Auto-detects and replies in the customer's language.", color: "bg-blue-100 text-blue-600" },
              { icon: Users, title: "Smart Handoff", desc: "Escalates to humans with full context when needed.", color: "bg-purple-100 text-purple-600" },
              { icon: Workflow, title: "Flows", desc: "No-code workflows for orders, bookings, returns.", color: "bg-amber-100 text-amber-600" },
              { icon: BarChart3, title: "Analytics", desc: "Sentiment, resolution rates, and agent performance.", color: "bg-rose-100 text-rose-600" },
              { icon: Shield, title: "Compliant", desc: "Meta Business API compliant out of the box.", color: "bg-teal-100 text-teal-600" },
              { icon: Zap, title: "5-Min Setup", desc: "Tell us about your business — we handle the rest.", color: "bg-orange-100 text-orange-600" },
              { icon: MessageSquare, title: "Rich Media", desc: "Images, docs, buttons, lists, locations.", color: "bg-indigo-100 text-indigo-600" },
              { icon: Clock, title: "24/7", desc: "Always on, even outside business hours.", color: "bg-cyan-100 text-cyan-600" },
            ].map((feature) => (
              <div key={feature.title} className="group rounded-2xl border border-gray-200 p-6 hover:shadow-lg hover:border-gray-300 transition-all">
                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${feature.color} mb-4`}>
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{feature.title}</h3>
                <p className="text-sm text-gray-500 mt-2 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works — Brief */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">3 steps to go live</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Tell Us About Your Business", desc: "Share your business name and industry.", color: "from-emerald-500 to-teal-600" },
              { step: "02", title: "We Set Everything Up", desc: "We configure WhatsApp, AI, and your bot.", color: "from-blue-500 to-indigo-600" },
              { step: "03", title: "Go Live", desc: "AI handles support 24/7 in 40+ languages.", color: "from-purple-500 to-violet-600" },
            ].map((item) => (
              <div key={item.step} className="relative rounded-2xl bg-white border border-gray-200 p-8 shadow-sm">
                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${item.color} text-white font-bold text-lg mb-6`}>
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold text-gray-900">{item.title}</h3>
                <p className="text-gray-500 mt-3 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link href="/how-it-works" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
              Learn more about how it works
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Industries — Brief */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Built for every industry</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { emoji: "🛒", name: "E-Commerce" },
              { emoji: "🏥", name: "Healthcare" },
              { emoji: "🍽️", name: "Restaurants" },
              { emoji: "🏠", name: "Real Estate" },
              { emoji: "🎓", name: "Education" },
              { emoji: "✈️", name: "Travel" },
              { emoji: "💰", name: "Finance" },
              { emoji: "💻", name: "SaaS" },
            ].map((ind) => (
              <div key={ind.name} className="rounded-2xl border border-gray-200 p-6 text-center hover:shadow-lg hover:border-emerald-200 transition-all">
                <span className="text-4xl">{ind.emoji}</span>
                <h3 className="text-base font-semibold text-gray-900 mt-3">{ind.name}</h3>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link href="/industries" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
              See all industries and use cases
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing — Brief */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Simple, transparent pricing</h2>
          <p className="text-gray-500 max-w-lg mx-auto mb-4">
            7-day free trial. 30-day money-back guarantee. All prices in Zambian Kwacha.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-10">
            {[
              { name: "Starter", price: "K499/mo", desc: "1,000 messages", highlight: true },
              { name: "Growth", price: "K1,299/mo", desc: "5,000 messages" },
              { name: "Enterprise", price: "Custom", desc: "Unlimited" },
            ].map((p) => (
              <div key={p.name} className={`rounded-2xl border-2 p-6 ${p.highlight ? "border-emerald-500 bg-white shadow-lg" : "border-gray-200 bg-white"}`}>
                <h3 className="text-sm font-semibold text-gray-900">{p.name}</h3>
                <p className="text-2xl font-bold text-gray-900 mt-2">{p.price}</p>
                <p className="text-xs text-gray-500 mt-1">{p.desc}</p>
              </div>
            ))}
          </div>
          <Link href="/pricing" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
            View full pricing and FAQs
            <ArrowRight className="h-4 w-4" />
          </Link>
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
                href="/contact"
                className="inline-flex items-center gap-2 rounded-xl border-2 border-white/30 px-8 py-4 text-base font-semibold text-white hover:bg-white/10 transition-all"
              >
                Contact Sales
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
