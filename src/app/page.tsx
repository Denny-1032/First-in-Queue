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
  Star,
  Shield,
  Workflow,
  Clock,
  Sparkles,
} from "lucide-react";
import { MobileNav } from "@/components/landing/mobile-nav";

export default function Home() {
  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/fiq-logo.png?v=2" alt="First in Queue" width={200} height={200} className="h-9 w-9 object-contain" priority />
            <span className="text-xl font-bold text-gray-900">First in Queue</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">How It Works</a>
            <a href="#industries" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Industries</a>
            <a href="#pricing" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Pricing</a>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Login
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2 text-sm font-medium text-white hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg shadow-emerald-500/25"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <MobileNav />
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-sm text-emerald-700 font-medium mb-8">
            <Sparkles className="h-4 w-4" />
            AI-Powered WhatsApp Customer Care
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold text-gray-900 tracking-tight leading-[1.1] max-w-4xl mx-auto">
            Your customers are{" "}
            <span className="bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent">
              always first
            </span>
          </h1>
          <p className="text-lg text-gray-500 mt-6 max-w-xl mx-auto">
            AI-powered WhatsApp customer care that ensures nobody waits. Set up in minutes, serve thousands instantly.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-8 py-4 text-base font-semibold text-white hover:from-emerald-600 hover:to-teal-700 transition-all shadow-xl shadow-emerald-500/25"
            >
              Start Free Trial
              <ArrowRight className="h-5 w-5" />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 rounded-xl border-2 border-gray-200 px-8 py-4 text-base font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all"
            >
              See How It Works
            </a>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 mt-12 text-sm text-gray-500">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              No credit card required
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
            {/* Phone mockup header */}
            <div className="bg-emerald-600 px-6 py-4 flex items-center gap-3">
              <Image src="/fiq-logo.png?v=2" alt="First in Queue" width={200} height={200} className="h-9 w-9 object-contain rounded-full bg-white/10 p-0.5" />
              <div>
                <p className="text-white font-medium text-sm">FiQ Assistant</p>
                <p className="text-emerald-200 text-xs">online</p>
              </div>
            </div>
            {/* Chat messages */}
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

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">3 steps to go live</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Tell Us About Your Business", desc: "Share your business name, industry, and key info. That's all we need.", color: "from-emerald-500 to-teal-600" },
              { step: "02", title: "We Set Everything Up", desc: "Our team configures WhatsApp, AI, and your bot — zero technical effort from you.", color: "from-blue-500 to-indigo-600" },
              { step: "03", title: "Go Live", desc: "Your AI handles support 24/7 in 40+ languages. Fine-tune anytime from your dashboard.", color: "from-purple-500 to-violet-600" },
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
        </div>
      </section>

      {/* Industries */}
      <section id="industries" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Built for every industry</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { emoji: "🛒", name: "E-Commerce", desc: "Order tracking, returns, product inquiries" },
              { emoji: "🏥", name: "Healthcare", desc: "Appointments, results, patient support" },
              { emoji: "🍽️", name: "Restaurants", desc: "Reservations, menus, delivery orders" },
              { emoji: "🏠", name: "Real Estate", desc: "Property search, viewings, inquiries" },
              { emoji: "🎓", name: "Education", desc: "Admissions, schedules, student support" },
              { emoji: "✈️", name: "Travel", desc: "Bookings, itineraries, travel support" },
              { emoji: "💰", name: "Finance", desc: "Account inquiries, transactions, advice" },
              { emoji: "💻", name: "SaaS", desc: "Onboarding, billing, technical support" },
            ].map((ind) => (
              <div key={ind.name} className="rounded-2xl border border-gray-200 p-6 text-center hover:shadow-lg hover:border-emerald-200 transition-all cursor-pointer group">
                <span className="text-4xl">{ind.emoji}</span>
                <h3 className="text-base font-semibold text-gray-900 mt-3">{ind.name}</h3>
                <p className="text-xs text-gray-500 mt-1">{ind.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Simple pricing</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                name: "Starter",
                price: "$0",
                period: "/month",
                desc: "Perfect for trying First in Queue",
                features: ["500 messages/month", "1 WhatsApp number", "AI-powered responses", "Basic analytics", "Email support"],
                cta: "Start Free",
                highlight: false,
              },
              {
                name: "Growth",
                price: "$49",
                period: "/month",
                desc: "For growing businesses",
                features: ["10,000 messages/month", "2 WhatsApp numbers", "Advanced AI with GPT-4o", "Full analytics dashboard", "Human handoff", "Conversation flows", "Multi-language", "Priority support"],
                cta: "Start Trial",
                highlight: true,
              },
              {
                name: "Enterprise",
                price: "Custom",
                period: "",
                desc: "For large-scale operations",
                features: ["Unlimited messages", "Unlimited numbers", "Custom AI model training", "Custom integrations", "SLA guarantee", "Dedicated account manager", "On-premise option", "24/7 phone support"],
                cta: "Contact Sales",
                highlight: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl border-2 p-8 ${
                  plan.highlight
                    ? "border-emerald-500 bg-white shadow-xl shadow-emerald-500/10 relative"
                    : "border-gray-200 bg-white"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-1 text-xs font-semibold text-white">
                      <Star className="h-3 w-3" />
                      Most Popular
                    </span>
                  </div>
                )}
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{plan.desc}</p>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                    <span className="text-gray-500">{plan.period}</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/login"
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
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 p-12 md:p-16 text-white">
            <h2 className="text-3xl md:text-4xl font-bold">Ready to get started?</h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-semibold text-emerald-700 hover:bg-emerald-50 transition-all shadow-lg"
              >
                Get Started Free
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Image src="/fiq-logo.png?v=2" alt="First in Queue" width={200} height={200} className="h-8 w-8 object-contain" />
                <span className="text-lg font-bold text-gray-900">First in Queue</span>
              </div>
              <p className="text-sm text-gray-500">Nobody waits. Everyone&apos;s first.</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="#features" className="hover:text-gray-900 transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-gray-900 transition-colors">Pricing</a></li>
                <li><a href="#industries" className="hover:text-gray-900 transition-colors">Industries</a></li>
                <li><a href="#" className="hover:text-gray-900 transition-colors">Changelog</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Resources</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="#" className="hover:text-gray-900 transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-gray-900 transition-colors">API Reference</a></li>
                <li><a href="#" className="hover:text-gray-900 transition-colors">Guides</a></li>
                <li><a href="#" className="hover:text-gray-900 transition-colors">Blog</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Company</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="#" className="hover:text-gray-900 transition-colors">About</a></li>
                <li><a href="#" className="hover:text-gray-900 transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-gray-900 transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-gray-900 transition-colors">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-8 flex flex-col md:flex-row items-center justify-between text-sm text-gray-400">
            <p>&copy; {new Date().getFullYear()} First in Queue. All rights reserved.</p>
            <p className="mt-2 md:mt-0">Built with Next.js, Supabase & OpenAI</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
