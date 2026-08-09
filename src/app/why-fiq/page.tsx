import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Globe,
  Heart,
  MessageSquare,
  Phone,
  Shield,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { ScrollAnimate } from "@/components/ui/scroll-animate";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://firstinqueue.com";

export const metadata: Metadata = {
  title: "Why First in Queue? The Full Story",
  description:
    "The honest story behind First in Queue - WhatsApp, voice, and a free website chat widget for Zambian businesses. What we built, why it works, and exactly how we make money.",
  alternates: {
    canonical: `${BASE_URL}/why-fiq`,
  },
  openGraph: {
    title: "Why First in Queue? | The Full Story",
    description:
      "The honest story behind FiQ - what we built, how it works, and exactly how the pricing works. No fluff.",
    url: `${BASE_URL}/why-fiq`,
  },
};

export default function WhyFiqPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* ─── HERO: The opening hook ─── */}
      <section className="pt-32 pb-12 px-6">
        <div className="max-w-3xl mx-auto">
          <ScrollAnimate animation="fade-in">
            <p className="text-sm font-semibold text-emerald-600 tracking-wide uppercase mb-6">
              The full story
            </p>
          </ScrollAnimate>
          <ScrollAnimate animation="fade-up" delay={100}>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight leading-[1.1]">
              Why does First in Queue{" "}
              <span className="bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent">
                exist?
              </span>
            </h1>
          </ScrollAnimate>
          <ScrollAnimate animation="fade-up" delay={250}>
            <p className="text-xl text-gray-500 mt-6 leading-relaxed">
              And why should you - a busy business owner who has seen a hundred
              &ldquo;AI tools&rdquo; come and go - care about this one?
            </p>
          </ScrollAnimate>
          <ScrollAnimate animation="fade-up" delay={400}>
            <p className="text-lg text-gray-600 mt-6 leading-relaxed">
              Fair question. We owe you a straight answer. Grab a drink, this is
              the full story - no fluff, no corporate speak. Just an honest
              explanation of what we built, why, and exactly how the money works
              - including the part most companies hide.
            </p>
          </ScrollAnimate>
        </div>
      </section>

      {/* ─── SECTION 1: The Problem Nobody Talks About ─── */}
      <section className="py-16 px-6 bg-gray-50 border-y border-gray-100">
        <div className="max-w-3xl mx-auto">
          <ScrollAnimate animation="fade-up">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">
              Let&apos;s start with a question nobody asks out loud
            </h2>
          </ScrollAnimate>
          <ScrollAnimate animation="fade-up" delay={100}>
            <div className="space-y-5 text-gray-600 text-lg leading-relaxed">
              <p>
                How many customers did you lose last month - not because your
                product was bad, not because your price was wrong, but simply
                because{" "}
                <strong className="text-gray-900">
                  nobody replied fast enough?
                </strong>
              </p>
              <p>
                Think about it. A customer sends you a WhatsApp at 8pm asking
                about availability. You see it at 7am the next morning. You
                reply. They&apos;ve already bought from someone else.
              </p>
              <p>That isn&apos;t bad service. That&apos;s just… life.</p>
              <p>
                You can&apos;t sit on WhatsApp 24 hours a day. You have a
                business to run, a family to get home to, and a brain that needs
                sleep. The phone rings during meetings. Messages pile up over
                the weekend. Monday morning is a firefight.
              </p>
            </div>
          </ScrollAnimate>
          <ScrollAnimate animation="scale-in" delay={200}>
            <div className="mt-10 rounded-2xl border-2 border-red-100 bg-red-50 p-8">
              <p className="text-lg text-gray-900 font-semibold mb-4">
                Here&apos;s the part that stings:
              </p>
              <div className="space-y-4 text-gray-700 leading-relaxed">
                <p>
                  A slow reply doesn&apos;t feel like a loss. There&apos;s no
                  alert for &ldquo;a customer just gave up on you.&rdquo; No line
                  in your accounts for the sale that never happened. So it hides.
                </p>
                <p>
                  But the pattern is real, and you already know it from your own
                  behaviour: when <em>you</em> message a business and hear
                  nothing back for hours, you move on. Your customers are no
                  different. Speed isn&apos;t a nice-to-have - it&apos;s often
                  the whole decision.
                </p>
              </div>
            </div>
          </ScrollAnimate>
          <ScrollAnimate animation="fade-up" delay={300}>
            <p className="text-lg text-gray-600 mt-8 leading-relaxed">
              The painful truth?{" "}
              <strong className="text-gray-900">
                Most businesses are bleeding revenue they never even see.
              </strong>{" "}
              You can&apos;t track the customer who didn&apos;t wait - which is
              exactly why it goes unfixed for years.
            </p>
          </ScrollAnimate>
        </div>
      </section>

      {/* ─── SECTION 2: The "Usual Solutions" and Why They Fail ─── */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <ScrollAnimate animation="fade-up">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">
              &ldquo;Just hire someone to handle messages&rdquo;
            </h2>
          </ScrollAnimate>
          <ScrollAnimate animation="fade-up" delay={100}>
            <div className="space-y-5 text-gray-600 text-lg leading-relaxed">
              <p>
                That&apos;s the first thing everyone suggests. And on paper, it
                makes sense. Hire a customer service person. Problem solved.
              </p>
              <p>Except…</p>
            </div>
          </ScrollAnimate>

          <ScrollAnimate animation="fade-up" delay={200}>
            <div className="mt-8 space-y-4">
              {[
                {
                  label: "Salary",
                  detail: "K3,000–5,000/month for one person",
                  sub: "That's one person. Covering 8 hours. On weekdays only.",
                },
                {
                  label: "Coverage gap",
                  detail: "14 hours a day with nobody responding",
                  sub: "6pm to 8am. Weekends. Public holidays. Your busiest sales hours - unattended.",
                },
                {
                  label: "Capacity",
                  detail: "One conversation at a time",
                  sub: "When 5 customers message at once (which happens), 4 of them wait.",
                },
                {
                  label: "Leave & sickness",
                  detail: "Your support literally disappears",
                  sub: "No backup. No handover. The WhatsApp just… goes silent.",
                },
                {
                  label: "Training & management",
                  detail: "Weeks to onboard, constant oversight",
                  sub: "And if they leave? Start from scratch.",
                },
              ].map((item, i) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-gray-200 p-5 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-sm font-bold text-gray-400 mt-0.5 w-6 shrink-0">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {item.label}:{" "}
                        <span className="font-normal text-gray-500">
                          {item.detail}
                        </span>
                      </p>
                      <p className="text-sm text-gray-400 mt-1">{item.sub}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollAnimate>

          <ScrollAnimate animation="fade-up" delay={300}>
            <div className="mt-10 border-l-4 border-emerald-500 bg-emerald-50 p-6 rounded-r-xl">
              <p className="text-lg text-gray-700 italic leading-relaxed">
                &ldquo;To truly cover WhatsApp around the clock with people, you
                need three shifts - and that&apos;s a payroll most Zambian SMEs
                simply don&apos;t have, before you even count NAPSA, leave, and
                training. We know, because we asked them.&rdquo;
              </p>
            </div>
          </ScrollAnimate>
        </div>
      </section>

      {/* ─── SECTION 3: What FiQ Actually Is ─── */}
      <section className="py-16 px-6 bg-gray-50 border-y border-gray-100">
        <div className="max-w-3xl mx-auto">
          <ScrollAnimate animation="fade-up">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              So we built the thing we wished existed
            </h2>
            <p className="text-lg text-gray-500 mb-10 leading-relaxed">
              Not another chatbot that spits out generic answers. A teammate who
              happens to never sleep.
            </p>
          </ScrollAnimate>

          <ScrollAnimate animation="fade-up" delay={100}>
            <div className="space-y-5 text-gray-600 text-lg leading-relaxed">
              <p>
                <strong className="text-gray-900">First in Queue</strong> is an
                AI assistant that answers your customers across every place they
                reach you - your website, WhatsApp, and the phone - instantly,
                accurately, 24 hours a day, 365 days a year.
              </p>
              <p>
                It&apos;s not a replacement for your team. It&apos;s the team
                member who never sleeps, never calls in sick, speaks 40+
                languages, and handles as many conversations at once as your
                customers can throw at it - without ever making one of them
                wait.
              </p>
            </div>
          </ScrollAnimate>

          <ScrollAnimate animation="fade-up" delay={200}>
            <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-5">
              {[
                {
                  icon: Globe,
                  title: "Your website - answered",
                  desc: "A chat widget on your site, replying in seconds in the customer's language. Free to run, and the fastest way to stop losing the visitor who almost bought.",
                  color: "text-emerald-600 bg-emerald-100",
                },
                {
                  icon: MessageSquare,
                  title: "WhatsApp - handled",
                  desc: "Orders, enquiries, complaints, booking confirmations. Answered the moment they land, day or night, in the customer's own language.",
                  color: "text-green-600 bg-green-100",
                },
                {
                  icon: Phone,
                  title: "Phone calls - handled",
                  desc: "Inbound calls answered. Outbound follow-ups made. Appointments scheduled. No extra staff, no missed ring.",
                  color: "text-purple-600 bg-purple-100",
                },
                {
                  icon: Users,
                  title: "Human handoff - built in",
                  desc: "When something needs a real person, the conversation moves to your team with the full history attached. Nothing lost, nothing repeated.",
                  color: "text-blue-600 bg-blue-100",
                },
                {
                  icon: Shield,
                  title: "Honest AI - no guessing",
                  desc: "If the answer isn't in your knowledge base, FiQ says so and hands over. It never invents facts about your business. Your reputation stays intact.",
                  color: "text-amber-600 bg-amber-100",
                },
                {
                  icon: Zap,
                  title: "Live in days, not months",
                  desc: "You tell us about your business. We wire up the channels, train the AI, and switch it on. You watch it work from one dashboard.",
                  color: "text-rose-600 bg-rose-100",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-gray-200 bg-white p-6"
                >
                  <div
                    className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${item.color} mb-4`}
                  >
                    <item.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold text-gray-900 mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </ScrollAnimate>

          <ScrollAnimate animation="fade-up" delay={300}>
            <div className="mt-10 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 md:p-8">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 shrink-0">
                  <Globe className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900">
                    Start on your website - for free
                  </p>
                  <p className="text-gray-600 mt-2 leading-relaxed">
                    The website chat widget is the easiest place to begin. Paste
                    one line of code, and your site starts answering visitors in
                    seconds. No WhatsApp approval to wait on, no phone number to
                    buy. You can literally have it live before your tea gets
                    cold - and it stays free for as long as you want.
                  </p>
                </div>
              </div>
            </div>
          </ScrollAnimate>
        </div>
      </section>

      {/* ─── SECTION 4: The Math (Hormozi-style value stack) ─── */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <ScrollAnimate animation="fade-up">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              Let&apos;s do the actual maths
            </h2>
            <p className="text-lg text-gray-500 mb-10 leading-relaxed">
              Because &ldquo;it saves you money&rdquo; means nothing until you
              see the numbers side by side.
            </p>
          </ScrollAnimate>

          {/* Comparison table */}
          <ScrollAnimate animation="scale-in" delay={100}>
            <div className="rounded-2xl border border-gray-200 overflow-hidden shadow-lg">
              {/* Desktop */}
              <table className="w-full text-sm hidden md:table">
                <thead>
                  <tr className="bg-gray-900">
                    <th className="text-left px-6 py-4 font-semibold text-gray-400 text-xs uppercase tracking-wider">
                      What you&apos;re comparing
                    </th>
                    <th className="text-left px-6 py-4 font-semibold text-gray-400 text-xs uppercase tracking-wider">
                      Hiring staff
                    </th>
                    <th className="text-left px-6 py-4 font-semibold text-emerald-400 text-xs uppercase tracking-wider">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        First in Queue
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    [
                      "Cost to start",
                      "K3,000–5,000 per person",
                      "Free on your website",
                    ],
                    [
                      "Cost for the works",
                      "K9,000–15,000 (3 shifts)",
                      "K499/mo, everything unlocked",
                    ],
                    ["Response speed", "Minutes to hours", "Under 10 seconds"],
                    [
                      "Conversations at once",
                      "1 per agent",
                      "As many as come in",
                    ],
                    ["Languages", "1–2", "40+ (auto-detected)"],
                    [
                      "Sick days, leave, turnover",
                      "Yes - support stops",
                      "Never. Zero downtime.",
                    ],
                    [
                      "Time to go live",
                      "Weeks of hiring + training",
                      "Website in minutes, full setup in days",
                    ],
                    [
                      "Scales with demand",
                      "Hire more people",
                      "Automatic. No extra staff.",
                    ],
                  ].map(([label, old, fiq], i) => (
                    <tr
                      key={label}
                      className={`border-b border-gray-100 ${
                        i % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                      } hover:bg-emerald-50/30 transition-colors`}
                    >
                      <td className="px-6 py-4 text-gray-700 font-medium">
                        {label}
                      </td>
                      <td className="px-6 py-4 text-gray-400">{old}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 text-emerald-600 font-semibold">
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                          {fiq}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Mobile stacked */}
              <div className="md:hidden divide-y divide-gray-100">
                {[
                  ["Cost to start", "K3,000–5,000/person", "Free on your site"],
                  [
                    "Cost for the works",
                    "K9,000–15,000 (3 shifts)",
                    "K499/mo, all unlocked",
                  ],
                  ["Response speed", "Minutes to hours", "Under 10 seconds"],
                  ["Conversations at once", "1 per agent", "As many as come in"],
                  ["Languages", "1–2", "40+"],
                  ["Sick days / leave", "Support stops", "Never"],
                  ["Time to go live", "Weeks", "Minutes to days"],
                  ["Scales with demand", "Hire more people", "Automatic"],
                ].map(([label, old, fiq]) => (
                  <div
                    key={label}
                    className="p-5 hover:bg-gray-50 transition-colors"
                  >
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      {label}
                    </p>
                    <div className="flex justify-between items-baseline gap-4">
                      <span className="text-sm text-gray-400 line-through">
                        {old}
                      </span>
                      <span className="text-sm text-emerald-600 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                        {fiq}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollAnimate>

          <ScrollAnimate animation="fade-up" delay={200}>
            <div className="mt-8 rounded-2xl bg-emerald-50 border border-emerald-200 p-6 md:p-8">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 shrink-0">
                  <TrendingUp className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900">
                    Bottom line
                  </p>
                  <p className="text-gray-600 mt-2 leading-relaxed">
                    One support agent - covering 8 hours, 5 days - runs you about
                    K4,000 a month. First in Queue answers your website for{" "}
                    <strong className="text-gray-900">nothing</strong>, and
                    unlocks WhatsApp and voice for{" "}
                    <strong className="text-gray-900">K499</strong> - every hour
                    of every day, in every language, with zero sick days.{" "}
                    <strong className="text-emerald-700">
                      Less money, more coverage, no management headache.
                    </strong>
                  </p>
                </div>
              </div>
            </div>
          </ScrollAnimate>
        </div>
      </section>

      {/* ─── SECTION 5: How We Make Money (Transparency + v2 pricing) ─── */}
      <section className="py-16 px-6 bg-gray-50 border-y border-gray-100">
        <div className="max-w-3xl mx-auto">
          <ScrollAnimate animation="fade-up">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              &ldquo;Okay, but how do you actually make money?&rdquo;
            </h2>
            <p className="text-lg text-gray-500 mb-10 leading-relaxed">
              Here&apos;s the part most companies bury. We&apos;ll put it right
              in the middle, in plain words.
            </p>
          </ScrollAnimate>

          <ScrollAnimate animation="fade-up" delay={100}>
            <div className="space-y-5 text-gray-600 text-lg leading-relaxed">
              <p>
                We run on one honest rule:
              </p>
              <div className="rounded-2xl border-2 border-gray-900 bg-white p-6 md:p-7">
                <p className="text-lg md:text-xl font-bold text-gray-900 leading-snug">
                  Give away what costs us almost nothing. Only charge you for
                  what someone else charges <em>us</em>. Price the big
                  institutions on what it&apos;s worth to them.
                </p>
              </div>
              <p>
                That&apos;s not a slogan - it&apos;s the actual maths of running
                this thing, and it decides every line of the price card below.
              </p>
            </div>
          </ScrollAnimate>

          {/* The three cost classes, in plain language */}
          <ScrollAnimate animation="fade-up" delay={150}>
            <div className="mt-8 space-y-4">
              {[
                {
                  icon: Sparkles,
                  head: "Costs us almost nothing → it's mostly free",
                  body: "Your website chat widget, unlimited conversations, unlimited team members, the dashboard. Each AI answer costs us about one ngwee, so the first 500 every month are on us - and there's no third party taking a cut.",
                  tone: "text-emerald-600 bg-emerald-100",
                },
                {
                  icon: Wallet,
                  head: "Someone else bills us → you pay only for what you use",
                  body: "WhatsApp charges us per message. Phone calls cost real airtime and voice-processing money. We refuse to pretend otherwise - so these run on pay-as-you-go credit you top up like airtime. Use a little, pay a little. Use none, pay nothing.",
                  tone: "text-blue-600 bg-blue-100",
                },
                {
                  icon: Shield,
                  head: "Big institutions buy peace of mind → priced on value",
                  body: "Banks, ministries and large firms need uptime guarantees, security sign-off, and custom integrations. We price those on what a call centre would've cost them - not on our token bill.",
                  tone: "text-purple-600 bg-purple-100",
                },
              ].map((c) => (
                <div
                  key={c.head}
                  className="rounded-2xl border border-gray-200 bg-white p-6"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${c.tone} shrink-0`}
                    >
                      <c.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{c.head}</h3>
                      <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
                        {c.body}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollAnimate>

          <ScrollAnimate animation="fade-up" delay={200}>
            <p className="text-lg text-gray-600 mt-10 mb-6 leading-relaxed">
              Put it together and the whole price card fits on the back of a
              napkin:
            </p>
          </ScrollAnimate>

          {/* Price card */}
          <ScrollAnimate animation="fade-up" delay={250}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                {
                  plan: "Free",
                  price: "K0",
                  tag: "forever, not a trial",
                  what: "Website chat widget, unlimited conversations, unlimited team seats, 500 AI replies a month, one website. Shows a small “Powered by First in Queue.”",
                  color: "from-emerald-500 to-teal-600",
                },
                {
                  plan: "Pro",
                  price: "K499/mo",
                  tag: "or K4,990/yr - 2 months free",
                  what: "Everything in Free, branding removed, WhatsApp + voice + automated actions unlocked, unlimited websites & agents, 5,000 web AI replies a month.",
                  color: "from-blue-500 to-indigo-600",
                  popular: true,
                },
                {
                  plan: "Institution",
                  price: "Let's talk",
                  tag: "annual, invoice-friendly",
                  what: "For banks, ministries & large firms: uptime SLA, SSO, audit logs, data residency, a dedicated manager, on-site training, and custom integrations.",
                  color: "from-purple-500 to-violet-600",
                },
              ].map((p) => (
                <div
                  key={p.plan}
                  className={`rounded-2xl border ${
                    p.popular
                      ? "border-emerald-300 ring-2 ring-emerald-100"
                      : "border-gray-200"
                  } bg-white p-6 relative flex flex-col`}
                >
                  {p.popular && (
                    <span className="absolute -top-3 left-6 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  )}
                  <div
                    className={`inline-flex items-center gap-2 text-sm font-bold bg-gradient-to-r ${p.color} bg-clip-text text-transparent mb-3`}
                  >
                    {p.plan}
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{p.price}</p>
                  <p className="text-xs text-gray-400 mt-1">{p.tag}</p>
                  <p className="text-sm text-gray-500 mt-3 leading-relaxed">
                    {p.what}
                  </p>
                </div>
              ))}
            </div>
          </ScrollAnimate>

          {/* Usage credit callout */}
          <ScrollAnimate animation="fade-up" delay={300}>
            <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 shrink-0">
                  <Wallet className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">
                    WhatsApp &amp; voice run on prepaid credit
                  </h3>
                  <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
                    Top up like airtime - K-packs, whenever you want, with
                    optional auto-top-up. WhatsApp replies and voice minutes draw
                    down as they&apos;re used. And you never have to guess how
                    much you need: once traffic starts, your dashboard tells you
                    in plain words -{" "}
                    <span className="text-gray-700 font-medium">
                      &ldquo;at your current rate, K200 lasts about 3 weeks.&rdquo;
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </ScrollAnimate>

          <ScrollAnimate animation="fade-up" delay={350}>
            <div className="mt-8 space-y-4 text-gray-600 text-lg leading-relaxed">
              <p>
                <strong className="text-gray-900">
                  Only two questions to answer on day one:
                </strong>{" "}
                do you want your branding removed, and do you want WhatsApp and
                voice switched on? That&apos;s it. No forecasting how many
                messages you&apos;ll send. No five-tier ladder to decode. Start
                free, flip on Pro when you&apos;re ready, top up credit when you
                grow.
              </p>
              <p>
                Everything&apos;s in{" "}
                <strong className="text-gray-900">Zambian Kwacha</strong>,
                payable via Airtel Money, MTN Money, Zamtel, or card. No USD
                exchange-rate surprises. And we will{" "}
                <strong className="text-gray-900">
                  never print the word &ldquo;unlimited&rdquo; next to WhatsApp
                  or voice
                </strong>{" "}
                - because those cost real money to deliver, and pretending
                otherwise is how other tools spring a bill on you later.
              </p>
            </div>
          </ScrollAnimate>
        </div>
      </section>

      {/* ─── SECTION 6: The Free Tier Isn't Charity ─── */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <ScrollAnimate animation="fade-up">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              &ldquo;If the website widget is free… what&apos;s the catch?&rdquo;
            </h2>
            <p className="text-lg text-gray-500 mb-10 leading-relaxed">
              No catch. But we&apos;ll tell you exactly why we can afford it -
              because you deserve to know.
            </p>
          </ScrollAnimate>

          <ScrollAnimate animation="fade-up" delay={100}>
            <div className="space-y-5 text-gray-600 text-lg leading-relaxed">
              <p>
                Every free widget shows a small{" "}
                <strong className="text-gray-900">
                  &ldquo;Powered by First in Queue&rdquo;
                </strong>{" "}
                at the bottom of the chat. That little line is our advertising.
                When a customer in Lusaka chats with your shop and sees it, then
                sees it again on another site, and another - that&apos;s how the
                next business hears about us. No cold calls. No billboards.
              </p>
              <p>
                So serving thousands of small businesses for free isn&apos;t
                charity, and it isn&apos;t a loss we&apos;re quietly hoping to
                claw back. It&apos;s the cheapest, most honest marketing we
                have. You get a genuinely free tool. We get seen. Fair trade.
              </p>
              <p>
                The one honest limit: the free tier covers{" "}
                <strong className="text-gray-900">500 AI answers a month</strong>
                . Most small sites never come close - but if yours does, it&apos;s
                just a few ngwee per answer after that, and your dashboard shows
                you the number long before you ever pay it.
              </p>
              <p>
                Want the badge gone? That&apos;s literally what the{" "}
                <strong className="text-gray-900">K499 Pro plan</strong> is for -
                remove the branding, and unlock WhatsApp and voice while
                you&apos;re at it.
              </p>
            </div>
          </ScrollAnimate>

          <ScrollAnimate animation="scale-in" delay={200}>
            <div className="mt-10 rounded-2xl border border-gray-200 bg-gray-50 p-6 md:p-8">
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                The honest version
              </p>
              <p className="text-lg text-gray-700 leading-relaxed">
                Free-branded for small businesses who&apos;ll grow with us.
                Value-priced for the institutions who need guarantees. Nobody
                pays for what costs us nothing -{" "}
                <strong className="text-gray-900">
                  and nobody gets surprised by a bill for what does.
                </strong>
              </p>
            </div>
          </ScrollAnimate>
        </div>
      </section>

      {/* ─── SECTION 7: The Value Stack ─── */}
      <section className="py-16 px-6 bg-gray-50 border-y border-gray-100">
        <div className="max-w-3xl mx-auto">
          <ScrollAnimate animation="fade-up">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              Here&apos;s what you&apos;re actually getting
            </h2>
            <p className="text-lg text-gray-500 mb-10 leading-relaxed">
              Not in features - in outcomes. Because you don&apos;t buy
              software. You buy results.
            </p>
          </ScrollAnimate>

          <ScrollAnimate animation="fade-up" delay={100}>
            <div className="space-y-0">
              {[
                {
                  icon: Clock,
                  value: "24/7 customer response",
                  worth: "The work of a full support desk",
                  detail:
                    "Every message answered, every call picked up - at 3am, during holidays, on weekends. Your business never sleeps, and you still do.",
                },
                {
                  icon: Zap,
                  value: "Instant response speed",
                  worth: "Under 10 seconds, every time",
                  detail:
                    "The customer who messages at 9pm gets an answer before they can switch to your competitor. That's revenue you were quietly losing, saved.",
                },
                {
                  icon: Globe,
                  value: "A website that sells while you sleep",
                  worth: "Free to run",
                  detail:
                    "The chat widget turns curious visitors into conversations, and conversations into customers - without you touching your phone.",
                },
                {
                  icon: Users,
                  value: "Your team focuses on growth",
                  worth: "Hours per week freed up",
                  detail:
                    "Routine questions - handled. Repeat enquiries - handled. Your people work on the things that actually grow the business.",
                },
                {
                  icon: Heart,
                  value: "Customers feel cared for",
                  worth: "Higher retention, more referrals",
                  detail:
                    "Fast, accurate, friendly answers in their own language. That's not just support - that's a reason to come back and tell a friend.",
                },
                {
                  icon: Shield,
                  value: "30-day money-back guarantee",
                  worth: "Zero risk",
                  detail:
                    "If Pro doesn't help your business within 30 days, you get every kwacha back. One email. No questions.",
                },
              ].map((item) => (
                <div
                  key={item.value}
                  className="border border-gray-200 bg-white p-6 -mt-px first:mt-0 first:rounded-t-2xl last:rounded-b-2xl hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 shrink-0 mt-0.5">
                      <item.icon className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
                        <h3 className="font-bold text-gray-900">
                          {item.value}
                        </h3>
                        <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">
                          {item.worth}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
                        {item.detail}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollAnimate>

          <ScrollAnimate animation="scale-in" delay={200}>
            <div className="mt-10 rounded-2xl bg-gray-900 p-8 text-center">
              <p className="text-gray-400 text-sm uppercase tracking-wider mb-2">
                What a support desk like this would cost you
              </p>
              <p className="text-4xl font-bold text-white">
                K9,000–15,000
                <span className="text-lg text-gray-400 font-normal">
                  {" "}
                  a month
                </span>
              </p>
              <div className="flex items-center justify-center gap-3 mt-4">
                <div className="h-px w-12 bg-gray-700" />
                <p className="text-emerald-400 font-semibold">
                  Your investment: free to start, K499 for the works
                </p>
                <div className="h-px w-12 bg-gray-700" />
              </div>
              <p className="text-gray-500 text-sm mt-4">
                That&apos;s not a theoretical &ldquo;value.&rdquo; It&apos;s the
                actual payroll you&apos;re not signing.
              </p>
            </div>
          </ScrollAnimate>
        </div>
      </section>

      {/* ─── SECTION 8: Speed + Ease ─── */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <ScrollAnimate animation="fade-up">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              And here&apos;s the part people don&apos;t believe until they see it
            </h2>
            <p className="text-lg text-gray-500 mb-10 leading-relaxed">
              Getting started takes almost no effort from you. Seriously.
            </p>
          </ScrollAnimate>

          <ScrollAnimate animation="fade-up" delay={100}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  step: "01",
                  title: "Tell us about your business",
                  time: "5 minutes",
                  detail:
                    "Your name, what you do, and the questions customers ask most. That's all we need to start.",
                  color: "from-emerald-500 to-teal-600",
                },
                {
                  step: "02",
                  title: "Go live on your website - free",
                  time: "Minutes",
                  detail:
                    "Drop one line of code on your site and the chat widget is answering visitors. Want WhatsApp and voice too? We set those up over the next day or two.",
                  color: "from-blue-500 to-indigo-600",
                },
                {
                  step: "03",
                  title: "Watch it work",
                  time: "From day one",
                  detail:
                    "Support runs around the clock. You monitor everything from one dashboard. We handle the maintenance.",
                  color: "from-purple-500 to-violet-600",
                },
              ].map((s) => (
                <div
                  key={s.step}
                  className="rounded-2xl border border-gray-200 bg-white p-6"
                >
                  <div
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${s.color} text-white font-bold text-sm mb-4`}
                  >
                    {s.step}
                  </div>
                  <h3 className="text-base font-bold text-gray-900 mb-1">
                    {s.title}
                  </h3>
                  <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-3">
                    {s.time}
                  </p>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {s.detail}
                  </p>
                </div>
              ))}
            </div>
          </ScrollAnimate>

          <ScrollAnimate animation="fade-up" delay={200}>
            <div className="mt-10 space-y-3">
              {[
                "No coding required - one line of code, and we'll even paste it for you",
                "No technical skills needed - we do the setup",
                "No hiring, no training, no managing staff",
                "No foreign currency - everything in ZMW",
                "No contract lock-in - cancel anytime",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 text-gray-700"
                >
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                  <p className="text-base">{item}</p>
                </div>
              ))}
            </div>
          </ScrollAnimate>
        </div>
      </section>

      {/* ─── SECTION 9: Who We Are ─── */}
      <section className="py-16 px-6 bg-gray-50 border-y border-gray-100">
        <div className="max-w-3xl mx-auto">
          <ScrollAnimate animation="fade-up">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">
              Who&apos;s behind this?
            </h2>
          </ScrollAnimate>
          <ScrollAnimate animation="fade-up" delay={100}>
            <div className="space-y-5 text-gray-600 text-lg leading-relaxed">
              <p>
                First in Queue is built by{" "}
                <strong className="text-gray-900">Codarti</strong>, a Zambian
                technology company based in Lusaka. We build software for
                African businesses, and we built FiQ for the market we actually
                live and work in.
              </p>
              <p>
                We didn&apos;t build it because AI is trendy. We built it because
                we watched good businesses - clinics, restaurants, shops,
                agencies - lose customers to a problem that finally has a real
                solution.
              </p>
              <p>
                We use FiQ ourselves. Our own customer support runs on it. We eat
                our own cooking - so if something breaks, we feel it before you
                do.
              </p>
              <p>
                And when you message our support? You get a response in seconds.
                Because that&apos;s the whole point.
              </p>
            </div>
          </ScrollAnimate>
        </div>
      </section>

      {/* ─── SECTION 10: The Guarantee ─── */}
      <section className="py-16 px-6 bg-gradient-to-br from-emerald-500 to-teal-600">
        <div className="max-w-3xl mx-auto">
          <ScrollAnimate animation="scale-in">
            <div className="bg-white rounded-3xl p-8 md:p-12 text-center shadow-2xl">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 border-2 border-emerald-200 mb-6">
                <Shield className="h-10 w-10 text-emerald-600" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                The 30-Day &ldquo;It Works or It&apos;s Free&rdquo; Guarantee
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed max-w-xl mx-auto mb-6">
                The website widget is already free - so this is about Pro. Turn
                on WhatsApp and voice, use FiQ on your real business for a full
                30 days. If you genuinely feel it didn&apos;t help - any reason
                at all - send one email to{" "}
                <strong className="text-gray-900">support@codarti.com</strong>.
                Full refund. No questions. No forms.
              </p>
              <p className="text-sm text-gray-500">
                We can offer this because we&apos;d rather earn your business than
                trap it. If it&apos;s not helping, you shouldn&apos;t be paying -
                simple as that.
              </p>
            </div>
          </ScrollAnimate>
        </div>
      </section>

      {/* ─── SECTION 11: The Real Question ─── */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <ScrollAnimate animation="fade-up">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8 text-center">
              So the question isn&apos;t &ldquo;should I use FiQ?&rdquo;
            </h2>
          </ScrollAnimate>
          <ScrollAnimate animation="fade-up" delay={100}>
            <div className="space-y-5 text-gray-600 text-lg leading-relaxed text-center max-w-2xl mx-auto">
              <p>
                It costs nothing to put it on your website today. So the question
                is:{" "}
                <strong className="text-gray-900">
                  how many more customers are you willing to lose to slow
                  responses while you think about it?
                </strong>
              </p>
              <p>
                Every day without instant responses is another day of leaked
                revenue. Another customer who messaged at 8pm and bought from
                someone else by morning.
              </p>
              <p className="text-xl text-gray-900 font-semibold">
                You&apos;ve worked too hard on your business to lose customers to
                something this fixable - and this cheap to fix.
              </p>
            </div>
          </ScrollAnimate>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="pb-20 px-6">
        <ScrollAnimate animation="fade-up">
          <div className="max-w-4xl mx-auto text-center">
            <div className="rounded-3xl bg-gradient-to-br from-gray-900 to-gray-800 p-12 md:p-16 text-white">
              <p className="text-sm font-semibold text-emerald-400 tracking-wide uppercase mb-4">
                Start today
              </p>
              <h2 className="text-3xl md:text-4xl font-bold">
                Put FiQ on{" "}
                <span className="text-emerald-400">your</span> website - free
              </h2>
              <p className="text-gray-400 mt-4 max-w-lg mx-auto">
                Start free in minutes, or book a demo and we&apos;ll build it
                around your industry, your questions, your actual use case. In 15
                minutes you&apos;ll see exactly how it works.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-8 py-4 text-base font-semibold text-white hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg shadow-emerald-500/25"
                >
                  Get Started
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-white/20 px-8 py-4 text-base font-semibold text-white hover:bg-white/10 transition-all"
                >
                  View Pricing
                </Link>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-6 mt-8 text-sm text-gray-500">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  Free on your website
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  30-day money-back on Pro
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  No credit card to start
                </div>
              </div>
            </div>
          </div>
        </ScrollAnimate>
      </section>

      <Footer />
    </div>
  );
}
