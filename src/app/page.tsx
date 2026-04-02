import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  Bot,
  ArrowRight,
  CheckCircle2,
  Shield,
  Clock,
  Phone,
  MessageSquare,
  AlertTriangle,
  Users,
  Zap,
  Globe,
  BarChart3,
} from "lucide-react";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { DemoBooking } from "@/components/landing/demo-booking";

export const metadata: Metadata = {
  title: "AI WhatsApp & Voice Customer Care for Zambian Businesses",
  description: "Never lose a customer to slow responses again. AI handles WhatsApp messages and phone calls 24/7. Book a free demo.",
};

export default function Home() {
  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <Navbar />

      {/* HERO — Business outcome focused */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 tracking-tight leading-[1.1]">
                Never lose a customer to{" "}
                <span className="bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent">
                  slow responses
                </span>{" "}
                again
              </h1>
              <p className="text-lg text-gray-500 mt-6 max-w-lg">
                AI answers your WhatsApp messages and phone calls instantly — 24/7, in 40+ languages. Your customers get help in seconds, not hours.
              </p>
              <div className="flex flex-col sm:flex-row items-start gap-4 mt-8">
                <Link
                  href="#book-demo"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-8 py-4 text-base font-semibold text-white hover:from-emerald-600 hover:to-teal-700 transition-all shadow-xl shadow-emerald-500/25"
                >
                  Book a Demo
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  href="#how-it-works"
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-gray-200 px-8 py-4 text-base font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all"
                >
                  See How It Works
                </Link>
              </div>
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 mt-8 text-sm text-gray-500">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  5-minute setup
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  No technical skills needed
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  Free demo
                </div>
              </div>
            </div>
            {/* Demo Booking Form — right side of hero */}
            <div className="lg:pl-8">
              <DemoBooking id="book-demo" />
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEM SECTION — Pain points */}
      <section className="py-16 px-6 bg-gray-50 border-y border-gray-100">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Sound familiar?</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Clock, text: "Customers wait hours for a reply — and leave", color: "text-red-500 bg-red-50" },
              { icon: AlertTriangle, text: "Your team misses messages on nights and weekends", color: "text-amber-500 bg-amber-50" },
              { icon: Users, text: "Support staff are overwhelmed and burning out", color: "text-orange-500 bg-orange-50" },
            ].map((p) => (
              <div key={p.text} className="rounded-2xl border border-gray-200 bg-white p-6 flex items-start gap-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${p.color} shrink-0`}>
                  <p.icon className="h-5 w-5" />
                </div>
                <p className="text-gray-700 font-medium text-sm leading-relaxed">{p.text}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-gray-500 mt-8 text-sm">
            Every missed message is a lost sale. FiQ makes sure that never happens.
          </p>
        </div>
      </section>

      {/* SOLUTION SECTION — What FiQ does */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">How FiQ solves it</h2>
            <p className="text-gray-500 mt-3 max-w-2xl mx-auto">
              One platform handles all your customer conversations — WhatsApp and phone — so your team can focus on growing the business.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: MessageSquare,
                title: "WhatsApp on autopilot",
                desc: "AI replies instantly to customer messages — orders, questions, complaints — in their language.",
                color: "bg-green-100 text-green-600",
              },
              {
                icon: Phone,
                title: "AI answers the phone",
                desc: "Handles inbound calls, makes follow-ups, and schedules appointments — no staff needed.",
                color: "bg-purple-100 text-purple-600",
              },
              {
                icon: Users,
                title: "Hands off to humans when needed",
                desc: "Complex issues get escalated to your team with full context. Nothing falls through the cracks.",
                color: "bg-blue-100 text-blue-600",
              },
            ].map((s) => (
              <div key={s.title} className="rounded-2xl border border-gray-200 p-8 hover:shadow-lg transition-all">
                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${s.color} mb-5`}>
                  <s.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LIVE DEMO — Chat simulation */}
      <section className="pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">See it in action</h2>
            <p className="text-gray-500 mt-3">A real customer conversation, resolved by AI in 8 seconds.</p>
          </div>
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

      {/* SOCIAL PROOF — Stats + Testimonials */}
      <section className="py-16 px-6 bg-gray-50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center mb-16">
            {[
              { value: "78%", label: "Issues resolved without staff" },
              { value: "<10s", label: "Average response time" },
              { value: "40+", label: "Languages supported" },
              { value: "24/7", label: "Always available" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent">
                  {stat.value}
                </p>
                <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
          {/* Testimonials */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                quote: "We used to miss 40% of WhatsApp messages. Now every customer gets a reply in seconds.",
                name: "Sarah M.",
                role: "E-commerce Owner, Lusaka",
              },
              {
                quote: "FiQ handles 80% of our enquiries automatically. My team finally has time to focus on complex cases.",
                name: "James K.",
                role: "Operations Manager, Healthcare",
              },
              {
                quote: "The AI voice calls for appointment reminders reduced our no-shows by 60%. Game changer.",
                name: "Linda C.",
                role: "Clinic Administrator",
              },
            ].map((t) => (
              <div key={t.name} className="rounded-2xl bg-white border border-gray-200 p-6">
                <p className="text-sm text-gray-700 leading-relaxed italic">&ldquo;{t.quote}&rdquo;</p>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* USE CASES — Problem → Solution → Result */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Works for your industry</h2>
          </div>
          <div className="space-y-6">
            {[
              {
                industry: "E-Commerce",
                problem: "Customers ask about orders, returns, and stock — your team can't keep up.",
                solution: "FiQ instantly answers order queries, processes returns, and checks stock levels via WhatsApp.",
                result: "90% of order queries resolved instantly. Zero missed messages.",
              },
              {
                industry: "Healthcare",
                problem: "Patients miss appointments. Rescheduling clogs up phone lines.",
                solution: "AI calls patients to confirm appointments, sends reminders, and reschedules via WhatsApp.",
                result: "60% fewer no-shows. Staff freed up for patient care.",
              },
              {
                industry: "Real Estate",
                problem: "Leads enquire about properties at night and on weekends — nobody responds.",
                solution: "FiQ responds instantly with property details, availability, and schedules viewings.",
                result: "3x more viewings booked. No lead goes cold.",
              },
            ].map((uc) => (
              <div key={uc.industry} className="rounded-2xl border border-gray-200 p-6 md:p-8">
                <span className="inline-block text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full mb-4">{uc.industry}</span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                  <div>
                    <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">Problem</p>
                    <p className="text-sm text-gray-600">{uc.problem}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Solution</p>
                    <p className="text-sm text-gray-600">{uc.solution}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1">Result</p>
                    <p className="text-sm text-gray-700 font-medium">{uc.result}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS — Brief */}
      <section id="how-it-works" className="py-20 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Up and running in 3 steps</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Tell us about your business", desc: "Share your name, industry, and common customer questions.", color: "from-emerald-500 to-teal-600" },
              { step: "02", title: "We set everything up", desc: "We configure WhatsApp, AI voice agent, and automated flows.", color: "from-blue-500 to-indigo-600" },
              { step: "03", title: "Go live", desc: "AI handles customer support 24/7. You focus on growing.", color: "from-purple-500 to-violet-600" },
            ].map((item) => (
              <div key={item.step} className="rounded-2xl bg-white border border-gray-200 p-8 shadow-sm">
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

      {/* TRUST SIGNALS */}
      <section className="py-12 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Shield, title: "Secure & Private", desc: "Your data is encrypted and never shared. Fully compliant." },
              { icon: Zap, title: "99.9% Uptime", desc: "Enterprise-grade reliability. Your support never goes offline." },
              { icon: Globe, title: "40+ Languages", desc: "Responds in your customer's language — automatically." },
            ].map((t) => (
              <div key={t.title} className="flex items-start gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 shrink-0">
                  <t.icon className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{t.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{t.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 p-12 md:p-16 text-white">
            <h2 className="text-3xl md:text-4xl font-bold">Stop losing customers to slow responses</h2>
            <p className="text-emerald-100 mt-4 max-w-lg mx-auto">
              Book a free demo and see how FiQ can handle your customer support — instantly.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
              <Link
                href="#book-demo"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-semibold text-emerald-700 hover:bg-emerald-50 transition-all shadow-lg"
              >
                Book a Demo
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
