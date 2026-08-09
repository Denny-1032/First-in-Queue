import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Code2,
  Globe,
  MessageSquare,
  Phone,
  Radio,
  ShieldAlert,
  Users,
} from "lucide-react";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { ScrollAnimate } from "@/components/ui/scroll-animate";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://firstinqueue.com";

export const metadata: Metadata = {
  title: "How It Works - From Signup to a Live Chat Widget",
  description:
    "What actually happens when you set up First in Queue: sign up free, point it at your website, paste one line of HTML. WhatsApp and voice unlock on Pro.",
  alternates: {
    canonical: `${BASE_URL}/how-it-works`,
  },
  openGraph: {
    title: "How It Works | First in Queue",
    description:
      "Sign up, point it at your site, paste one script tag. The honest walkthrough - including what it cannot do yet.",
    url: `${BASE_URL}/how-it-works`,
  },
};

const SNIPPET = `<script src="${BASE_URL}/widget.js" data-key="YOUR_WIDGET_KEY" async></script>`;

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* ─── HERO ─── */}
      <section className="pt-32 pb-12 px-6">
        <div className="max-w-3xl mx-auto">
          <ScrollAnimate animation="fade-in">
            <p className="text-sm font-semibold text-emerald-600 tracking-wide uppercase mb-6">
              The walkthrough
            </p>
          </ScrollAnimate>
          <ScrollAnimate animation="fade-up" delay={100}>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight leading-[1.1]">
              What actually happens when you{" "}
              <span className="bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent">
                set this up
              </span>
            </h1>
          </ScrollAnimate>
          <ScrollAnimate animation="fade-up" delay={250}>
            <p className="text-xl text-gray-500 mt-6 leading-relaxed">
              No sales call required. You sign up, point FiQ at your website,
              and paste one line of HTML. That is the whole install.
            </p>
          </ScrollAnimate>
          <ScrollAnimate animation="fade-up" delay={400}>
            <p className="text-lg text-gray-600 mt-6 leading-relaxed">
              Below is the real sequence, in the order you will hit it, with the
              actual snippet you will paste. Where something needs us or needs
              Meta, we say so instead of pretending it is instant.
            </p>
          </ScrollAnimate>
        </div>
      </section>

      {/* ─── STEP 1 ─── */}
      <section className="py-16 px-6 bg-gray-50 border-y border-gray-100">
        <div className="max-w-3xl mx-auto">
          <ScrollAnimate animation="fade-up">
            <div className="flex items-center gap-4 mb-6">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold text-lg shrink-0">
                01
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                Sign up. No card, no call.
              </h2>
            </div>
          </ScrollAnimate>

          <ScrollAnimate animation="fade-up" delay={100}>
            <div className="space-y-5 text-gray-600 text-lg leading-relaxed">
              <p>
                Email, password, business name. You land in the dashboard on the
                free plan with a workspace already created for you.
              </p>
              <p>
                Free is not a countdown. There is no trial to expire and nothing
                switches off on day 14. It is a real plan:{" "}
                <strong className="text-gray-900">
                  the website chat widget, 500 AI replies a month, one website,
                  unlimited conversations and unlimited team seats
                </strong>
                . The only catch is a small &ldquo;Powered by First in
                Queue&rdquo; on the widget, which Pro removes.
              </p>
              <p>
                WhatsApp and voice are not in the free plan, and that is
                deliberate rather than a growth tactic - every WhatsApp
                conversation and every voice minute costs us real money the
                moment it happens. We explain that whole trade in{" "}
                <Link
                  href="/why-fiq"
                  className="text-emerald-600 font-medium hover:text-emerald-700 underline underline-offset-2"
                >
                  why FiQ exists
                </Link>
                .
              </p>
            </div>
          </ScrollAnimate>
        </div>
      </section>

      {/* ─── STEP 2 ─── */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <ScrollAnimate animation="fade-up">
            <div className="flex items-center gap-4 mb-6">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-lg shrink-0">
                02
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                Give it your website address
              </h2>
            </div>
          </ScrollAnimate>

          <ScrollAnimate animation="fade-up" delay={100}>
            <div className="space-y-5 text-gray-600 text-lg leading-relaxed">
              <p>
                This is the step that does the actual work. You paste your URL
                and FiQ crawls your site - your pages, your prices, your
                policies, your opening hours - and turns them into the knowledge
                the assistant answers from.
              </p>
              <p>
                It takes a minute or two on a normal business site. When it
                finishes you get a list of what it read, and you can add
                anything it could not find: the questions customers actually
                ask, the answers that live in your head rather than on a page.
              </p>
            </div>
          </ScrollAnimate>

          <ScrollAnimate animation="scale-in" delay={200}>
            <div className="mt-10 rounded-2xl border-2 border-amber-100 bg-amber-50 p-8">
              <div className="flex items-start gap-3">
                <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-1" />
                <div className="space-y-3 text-gray-700 leading-relaxed">
                  <p className="text-lg text-gray-900 font-semibold">
                    Worth being straight about
                  </p>
                  <p>
                    A crawl of a thin website produces a thin assistant. If your
                    site is three pages and a phone number, spend ten minutes in
                    the knowledge editor before you go live. The quality of what
                    it says to your customers is set here, not by the model.
                  </p>
                </div>
              </div>
            </div>
          </ScrollAnimate>
        </div>
      </section>

      {/* ─── STEP 3 ─── */}
      <section className="py-16 px-6 bg-gray-50 border-y border-gray-100">
        <div className="max-w-3xl mx-auto">
          <ScrollAnimate animation="fade-up">
            <div className="flex items-center gap-4 mb-6">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 text-white font-bold text-lg shrink-0">
                03
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                Paste one script tag
              </h2>
            </div>
          </ScrollAnimate>

          <ScrollAnimate animation="fade-up" delay={100}>
            <p className="text-gray-600 text-lg leading-relaxed">
              Under <strong className="text-gray-900">Websites</strong> in the
              dashboard, every site you add gets its own widget key and its own
              snippet. Copy it, drop it before the closing{" "}
              <code className="rounded bg-gray-200 px-1.5 py-0.5 text-sm font-mono text-gray-800">
                &lt;/body&gt;
              </code>{" "}
              tag on your site, publish. That is it.
            </p>
          </ScrollAnimate>

          <ScrollAnimate animation="fade-up" delay={200}>
            <div className="mt-8 rounded-2xl border border-gray-800 bg-gray-900 overflow-hidden">
              <div className="flex items-center gap-2 border-b border-gray-800 px-5 py-3">
                <Code2 className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-medium text-gray-400 tracking-wide uppercase">
                  Your install snippet
                </span>
              </div>
              <div className="overflow-x-auto px-5 py-4">
                <pre className="text-sm leading-relaxed text-emerald-300 font-mono whitespace-pre">
                  <code>{SNIPPET}</code>
                </pre>
              </div>
            </div>
            <p className="text-sm text-gray-400 mt-3">
              The dashboard fills in your real key. It loads asynchronously, so
              it never blocks your page from rendering.
            </p>
          </ScrollAnimate>

          <ScrollAnimate animation="fade-up" delay={300}>
            <div className="mt-10 space-y-4">
              {[
                {
                  label: "It works anywhere HTML does",
                  detail:
                    "WordPress, Shopify, Wix, Webflow, a hand-written site, a Next.js app. There is a WordPress plugin if you would rather not touch a theme file.",
                },
                {
                  label: "Locked to your domains",
                  detail:
                    "Each key only answers on the domains you list. Someone copying your snippet onto their own site gets nothing.",
                },
                {
                  label: "It tells you when it is live",
                  detail:
                    "The widget checks in as visitors load it, so the dashboard shows verified rather than making you guess whether the paste worked.",
                },
                {
                  label: "Rotate the key any time",
                  detail:
                    "One click. Update the snippet within the hour and the old key stops working.",
                },
              ].map((item, i) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-gray-200 bg-white p-5 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-sm font-bold text-gray-400 mt-0.5 w-6 shrink-0">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <p className="font-semibold text-gray-900">{item.label}</p>
                      <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                        {item.detail}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollAnimate>
        </div>
      </section>

      {/* ─── WHAT HAPPENS ON A CHAT ─── */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <ScrollAnimate animation="fade-up">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              So what happens when someone actually messages you?
            </h2>
            <p className="text-lg text-gray-500 mb-10 leading-relaxed">
              The loop is the same whether it arrives on your website, on
              WhatsApp, or over the phone.
            </p>
          </ScrollAnimate>

          <ScrollAnimate animation="fade-up" delay={100}>
            <div className="space-y-4">
              {[
                {
                  icon: MessageSquare,
                  title: "It answers from your knowledge, not the internet",
                  desc: "Grounded in what the crawl read and what you added. When it does not know, it says so and offers to pass you the question - it does not invent a delivery time.",
                  color: "text-emerald-600 bg-emerald-100",
                },
                {
                  icon: Bot,
                  title: "It does things, not just talks",
                  desc: "Takes a booking, captures a lead, checks your hours. Flows cover the requests that repeat, so a booking ends up in your dashboard rather than in a chat log nobody reads.",
                  color: "text-indigo-600 bg-indigo-100",
                },
                {
                  icon: Users,
                  title: "It hands over before it embarrasses you",
                  desc: "Anything sensitive, angry, or outside what it knows goes to your team with the full conversation attached. Your agent picks up mid-thread, not from scratch.",
                  color: "text-blue-600 bg-blue-100",
                },
                {
                  icon: Radio,
                  title: "You watch it happen",
                  desc: "Every conversation, booking and handoff lands in the dashboard live. Analytics show what customers keep asking - usually the most useful thing you learn in month one.",
                  color: "text-purple-600 bg-purple-100",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-gray-200 p-6 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`inline-flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${item.color}`}
                    >
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {item.title}
                      </h3>
                      <p className="text-gray-500 mt-1.5 leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollAnimate>
        </div>
      </section>

      {/* ─── STEP 4: PRO ─── */}
      <section className="py-16 px-6 bg-gray-50 border-y border-gray-100">
        <div className="max-w-3xl mx-auto">
          <ScrollAnimate animation="fade-up">
            <div className="flex items-center gap-4 mb-6">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white font-bold text-lg shrink-0">
                04
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                When you are ready: WhatsApp and voice
              </h2>
            </div>
          </ScrollAnimate>

          <ScrollAnimate animation="fade-up" delay={100}>
            <div className="space-y-5 text-gray-600 text-lg leading-relaxed">
              <p>
                Upgrading to Pro removes the FiQ branding, lifts the website
                limit, and unlocks the two channels that cost money to run.
              </p>
              <p>
                <strong className="text-gray-900">WhatsApp is the one step that is not instant.</strong>{" "}
                It needs a WhatsApp Business API number, which means Meta
                verification - not the app on your phone. We do that part for
                you and email you when the number is live. It is usually hours,
                occasionally a couple of days, and it is Meta&apos;s clock, not
                ours.
              </p>
              <p>
                Voice is faster. You pick a number and a voice, and the
                assistant starts answering calls and can place outbound and
                scheduled ones.
              </p>
            </div>
          </ScrollAnimate>

          <ScrollAnimate animation="scale-in" delay={200}>
            <div className="mt-10 border-l-4 border-emerald-500 bg-emerald-50 p-6 rounded-r-xl">
              <p className="text-lg text-gray-700 leading-relaxed">
                Both channels run on prepaid usage credit rather than a bundled
                quota. You top up, you see the balance and the current rate in
                the dashboard, and when it runs out WhatsApp and voice go quiet
                until you top up again. Your website chat keeps working
                regardless.{" "}
                <strong className="text-gray-900">
                  There is no bill waiting for you at the end of a busy month.
                </strong>
              </p>
            </div>
          </ScrollAnimate>

          <ScrollAnimate animation="fade-up" delay={300}>
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { icon: Globe, label: "Website chat", note: "Free plan, never charged to credit" },
                { icon: MessageSquare, label: "WhatsApp", note: "Pro, paid from credit" },
                { icon: Phone, label: "Voice calls", note: "Pro, paid from credit" },
              ].map((c) => (
                <div
                  key={c.label}
                  className="rounded-xl border border-gray-200 bg-white p-5"
                >
                  <c.icon className="h-5 w-5 text-gray-400 mb-3" />
                  <p className="font-semibold text-gray-900">{c.label}</p>
                  <p className="text-sm text-gray-500 mt-1">{c.note}</p>
                </div>
              ))}
            </div>
          </ScrollAnimate>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <ScrollAnimate animation="scale-in">
            <div className="rounded-3xl bg-gradient-to-br from-gray-900 to-gray-800 p-12 md:p-16 text-white">
              <h2 className="text-3xl md:text-4xl font-bold">
                Steps 1 to 3 take about ten minutes
              </h2>
              <p className="text-gray-400 mt-4 max-w-lg mx-auto">
                And they cost nothing. Put the widget on your site, see what it
                does with your own customers, then decide whether WhatsApp and
                voice are worth it.
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
              <p className="text-sm text-gray-500 mt-6">
                Would rather be walked through it?{" "}
                <Link
                  href="/#book-demo"
                  className="text-emerald-400 font-medium hover:text-emerald-300 underline underline-offset-2"
                >
                  Book a demo
                </Link>{" "}
                and we will build one around your business.
              </p>
            </div>
          </ScrollAnimate>
        </div>
      </section>

      <Footer />
    </div>
  );
}
