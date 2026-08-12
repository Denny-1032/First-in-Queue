import type { Metadata } from "next";
import Link from "next/link";
import {
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
  CalendarDays,
} from "lucide-react";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { BookDemoButton } from "@/components/landing/demo-booking-dialog";
import { HeroChannels } from "@/components/landing/hero-channels";
import { TwoLaneStory } from "@/components/landing/two-lane-story";
import { SoftwareApplicationJsonLd } from "@/components/seo/json-ld";
import { ScrollAnimate } from "@/components/ui/scroll-animate";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://firstinqueue.com";

export const metadata: Metadata = {
  title: "Free Customer Care for Your Business",
  description:
    "Never miss another customer message. A free chat widget for your website answers them 24/7, in 40+ languages. Add WhatsApp and phone whenever you're ready. No card required.",
  alternates: {
    canonical: BASE_URL,
  },
  openGraph: {
    title: "Free Customer Care for Your Business | First in Queue",
    description:
      "Never miss another customer message. A free chat widget answers your website, WhatsApp and phone - 24/7, in 40+ languages.",
    url: BASE_URL,
    images: [
      {
        url: `${BASE_URL}/fiq-logo.png`,
        width: 1200,
        height: 630,
        alt: "First in Queue - customer care that never sleeps",
      },
    ],
  },
};

export default function Home() {
  return (
    // overflow-x-CLIP, not hidden: `hidden` makes this box a scroll container
    // (overflow-y resolves to auto), and the scroll-driven reveals in
    // globals.css then measure against a box that never scrolls, so every
    // section renders already-revealed. `clip` trims the same overflow without
    // creating a scrollport.
    <div className="min-h-screen bg-white overflow-x-clip">
      <SoftwareApplicationJsonLd />
      <Navbar />

      {/* HERO - Business outcome focused */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="animate-enter animate-enter-1 text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 tracking-tight leading-[1.1]">
                <span className="bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent">
                  Free
                </span>{" "}
                customer care for your business
              </h1>
              <p className="animate-enter animate-enter-2 text-lg text-gray-500 mt-6 max-w-lg">
                Put our chat widget on your website and it answers customers for you - instantly, 24/7, in 40+ languages. Free forever on your site. Add WhatsApp and phone support whenever you are ready.
              </p>
              <div className="animate-enter animate-enter-3 flex flex-col sm:flex-row items-start gap-4 mt-8">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-8 py-4 text-base font-semibold text-white hover:from-emerald-600 hover:to-teal-700 transition-all shadow-xl shadow-emerald-500/25"
                >
                  Get Started
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <BookDemoButton className="inline-flex items-center gap-2 rounded-xl border-2 border-gray-200 px-8 py-4 text-base font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all">
                  Book a Demo
                </BookDemoButton>
              </div>
              <div className="animate-enter animate-enter-4 flex flex-wrap items-center gap-4 sm:gap-6 mt-8 text-sm text-gray-500">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  500 free replies a month
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  No technical skills needed
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  No card required
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3">
                30-day money-back guarantee. Try it risk-free.
              </p>
            </div>
            {/* The product itself, running - not a form asking for a number
                first, and not a screenshot of a conversation. All three
                channels sit here so nobody has to scroll to find the other two. */}
            <div className="animate-enter animate-enter-4 lg:pl-8">
              <HeroChannels />
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEM SECTION - Pain points */}
      <section className="py-16 px-6 bg-gray-50 border-y border-gray-100">
        <div className="max-w-5xl mx-auto">
          <ScrollAnimate animation="fade-up">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Sound familiar?</h2>
            </div>
          </ScrollAnimate>
          <ScrollAnimate animation="fade-up" delay={100}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Clock, text: "Customers wait hours for a reply - and leave", color: "text-red-500 bg-red-50" },
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
          </ScrollAnimate>
          <ScrollAnimate animation="fade-in" delay={200}>
            <p className="text-center text-gray-500 mt-8 text-sm">
              Every missed message is a lost sale. FiQ makes sure that never happens.
            </p>
          </ScrollAnimate>
        </div>
      </section>

      {/* SOLUTION SECTION - What FiQ does */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <ScrollAnimate animation="fade-up">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">How FiQ solves it</h2>
              <p className="text-gray-500 mt-3 max-w-2xl mx-auto">
                Every way a customer reaches you - your website, WhatsApp, the phone - answered in one place, so your team can focus on growing the business.
              </p>
            </div>
          </ScrollAnimate>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: Globe,
                title: "Your website answers back",
                desc: "The chat widget replies to visitors while they are still on the page - the moment they would otherwise leave.",
                color: "bg-emerald-100 text-emerald-600",
              },
              {
                icon: MessageSquare,
                title: "WhatsApp on autopilot",
                desc: "Replies instantly to customer messages - orders, questions, complaints - in their language.",
                color: "bg-green-100 text-green-600",
              },
              {
                icon: Phone,
                title: "Answers the phone for you",
                desc: "Takes inbound calls and makes follow-ups, day or night - no extra staff needed.",
                color: "bg-emerald-100 text-emerald-600",
              },
              {
                icon: CalendarDays,
                title: "Fills your calendar",
                desc: "Offers the slots you actually have free, books the appointment, and sends the reminder before it.",
                color: "bg-amber-100 text-amber-600",
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
          <ScrollAnimate animation="fade-in" delay={150}>
            <p className="text-center text-gray-500 mt-8 text-sm max-w-2xl mx-auto">
              And anything it should not decide alone goes straight to your team, with the whole
              conversation attached. Nothing falls through the cracks.
            </p>
          </ScrollAnimate>
        </div>
      </section>

      {/* SOCIAL PROOF - Stats + Testimonials */}
      <section className="py-16 px-6 bg-gray-50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto">
          <ScrollAnimate animation="scale-in">
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
          </ScrollAnimate>
          {/* ROI COMPARISON - Price anchoring (moved from above) */}
          <ScrollAnimate animation="fade-up" delay={100}>
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">One message, two Saturdays</h2>
            <p className="text-gray-500 mt-2 text-sm">The same customer, with and without FiQ</p>
          </div>
          <TwoLaneStory />
          <div className="flex items-center justify-center gap-2 mt-8">
            <div className="h-px flex-1 max-w-[60px] bg-emerald-200" />
            <p className="text-center text-gray-700 font-semibold text-sm">
              Most businesses save K2,500–4,500 every month. FiQ pays for itself in the first week.
            </p>
            <div className="h-px flex-1 max-w-[60px] bg-emerald-200" />
          </div>

          {/* Scrolling Testimonials - temporarily hidden, will be re-enabled with real testimonials */}
          {/* <div className="overflow-hidden mt-12">
            <div className="flex animate-marquee gap-6 hover:[animation-play-state:paused]" style={{ width: "max-content" }}>
              {[
                {
                  quote: "Honestly didn't expect much but wow - my WhatsApp replies are instant now. Customers actually think I never sleep lol.",
                  name: "Cosmas K.",
                  role: "Shop Owner, Lusaka",
                },
                {
                  quote: "Game changer for my clinic. Patients get appointment confirmations immediately, and I'm not glued to my phone 24/7 anymore.",
                  name: "Situmbeko M.",
                  role: "Medical Administrator",
                },
                {
                  quote: "Was skeptical at first but the automated responses are surprisingly good. Saved me from hiring extra staff last month.",
                  name: "Linda C.",
                  role: "Restaurant Manager",
                },
                {
                  quote: "My customers keep asking how I reply so fast. Little do they know it's not me at 11pm 😂 FiQ just works.",
                  name: "Ahmed S.",
                  role: "Online Retailer, Kitwe",
                },
                {
                  quote: "Tried other solutions before but this one actually understands our local context. The Bemba responses are spot on.",
                  name: "Grace T.",
                  role: "Real Estate Agent",
                },
                {
                  quote: "No more missed enquiries when I'm in meetings. FiQ handles the routine stuff and flags what actually needs my attention.",
                  name: "Michael B.",
                  role: "Finance Consultant",
                },
              ].map((t, i) => (
                <div key={i} className="rounded-2xl bg-white border border-gray-200 p-6 min-w-[300px] max-w-[340px] shrink-0">
                  <p className="text-sm text-gray-700 leading-relaxed italic">&ldquo;{t.quote}&rdquo;</p>
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div> */}
          </ScrollAnimate>
        </div>
      </section>

      {/* HOW IT WORKS - Brief */}
      <section id="how-it-works" className="py-20 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <ScrollAnimate animation="fade-up">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Up and running in 3 steps</h2>
            </div>
          </ScrollAnimate>
          <ScrollAnimate animation="fade-up" delay={100}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Sign up free", desc: "Email and business name. You are in the dashboard in a minute, no card needed.", color: "from-emerald-500 to-teal-600" },
              { step: "02", title: "Point it at your website", desc: "FiQ reads your pages and builds the knowledge it answers from. Add anything it missed.", color: "from-sky-500 to-blue-600" },
              { step: "03", title: "Paste one script tag", desc: "The chat widget goes live on your site. Add WhatsApp and voice whenever you are ready.", color: "from-teal-500 to-emerald-600" },
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
          </ScrollAnimate>
        </div>
      </section>

      {/* TRUST SIGNALS */}
      <section className="py-12 px-6">
        <div className="max-w-5xl mx-auto">
          <ScrollAnimate animation="fade-up">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Shield, title: "Secure & Private", desc: "Your data is encrypted and never shared. Fully compliant." },
              { icon: Zap, title: "99.9% Uptime", desc: "Enterprise-grade reliability. Your support never goes offline." },
              { icon: Globe, title: "40+ Languages", desc: "Responds in your customer's language - automatically." },
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
          </ScrollAnimate>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <ScrollAnimate animation="scale-in">
          <div className="rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 p-12 md:p-16 text-white">
            <h2 className="text-3xl md:text-4xl font-bold">Stop losing customers to slow responses</h2>
            <p className="text-emerald-100 mt-4 max-w-lg mx-auto">
              Put the chat widget on your website free, in minutes. Add WhatsApp and voice when you are ready.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-semibold text-emerald-700 hover:bg-emerald-50 transition-all shadow-lg"
              >
                Get Started
                <ArrowRight className="h-5 w-5" />
              </Link>
              <BookDemoButton className="inline-flex items-center gap-2 rounded-xl border-2 border-white/30 px-8 py-4 text-base font-semibold text-white hover:bg-white/10 transition-all">
                Book a Demo
              </BookDemoButton>
            </div>
            <p className="text-sm text-emerald-200 mt-4">
              30-day money-back guarantee - if it doesn&apos;t work, every kwacha back.
            </p>
          </div>
          </ScrollAnimate>
        </div>
      </section>

      <Footer />
    </div>
  );
}
