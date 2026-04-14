import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://firstinqueue.com";

export const metadata: Metadata = {
  title: "About Us — Built in Lusaka. Built for Business.",
  description:
    "First in Queue is built by Codarti in Lusaka, Zambia. We help African businesses deliver instant WhatsApp & voice customer support — 24/7, in 40+ languages.",
  alternates: {
    canonical: `${BASE_URL}/about`,
  },
  openGraph: {
    title: "About First in Queue",
    description:
      "Built in Zambia. AI-powered WhatsApp & voice customer care for African businesses.",
    url: `${BASE_URL}/about`,
  },
};

const stats = [
  {
    value: "78%",
    label: "Auto-resolution rate",
    context: "78 out of 100 customer conversations fully resolved by AI with zero human involvement.",
  },
  {
    value: "<10s",
    label: "Average first response",
    context: "Not minutes. Not hours. Under 10 seconds, at 3am or 3pm.",
  },
  {
    value: "40+",
    label: "Languages",
    context: "Auto-detected. Your customers answered in the language they are most comfortable with.",
  },
  {
    value: "24/7",
    label: "Always operational",
    context: "No holidays. No sick days. No lunch breaks. The business keeps responding.",
  },
];

const principles = [
  {
    num: "01",
    title: "The business owner should not need a developer",
    body: "Every feature in FiQ was designed for someone running a real business — not someone who writes code. The FiQ team handles technical setup. Full stop.",
  },
  {
    num: "02",
    title: "Price in kwacha. Pay in kwacha. Always.",
    body: "Foreign software that charges in USD creates an invisible tax on Zambian businesses. FiQ prices in ZMW and accepts Airtel Money, MTN, Zamtel, and card. No exchange rate surprises.",
  },
  {
    num: "03",
    title: "The AI should never lie to a customer",
    body: "If the answer is not in your knowledge base, FiQ tells the customer a human will follow up — it does not guess or invent. A wrong answer damages your reputation far more than a slight delay.",
  },
  {
    num: "04",
    title: "The risk should be on us, not on you",
    body: "Try it for 30 days. If it does not work, every kwacha comes back. No questions. No forms. We built the product well enough to stake that on it.",
  },
  {
    num: "05",
    title: "Local context is not optional — it is the product",
    body: "FiQ was built in Lusaka. We understand that a clinic in Chelston operates differently to a retail shop in Kitwe. That local understanding is not a feature — it is foundational.",
  },
  {
    num: "06",
    title: "Human agents matter — FiQ works with them",
    body: "FiQ handles the 80% of conversations that are routine. The moment something needs human judgment, the conversation is handed over immediately with full context. AI and humans work together.",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* SECTION 1: Hero — Pain-Led Headline */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm font-semibold text-emerald-600 tracking-wide uppercase mb-4">
            Built in Lusaka. For African Business.
          </p>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight leading-[1.1]">
            Every missed message is a{" "}
            <span className="bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent">
              missed sale.
            </span>
          </h1>
          <p className="text-lg text-gray-500 mt-6 max-w-2xl mx-auto leading-relaxed">
            We built FiQ because we watched good Zambian businesses lose customers every night — not because they had a bad product, but because no one answered the WhatsApp at 9pm.
          </p>
        </div>
      </section>

      {/* SECTION 2: The Problem We Set Out to Solve */}
      <section className="py-16 px-6 bg-gray-50 border-y border-gray-100">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <div>
            <p className="text-sm font-semibold text-emerald-600 tracking-wide uppercase mb-3">
              The problem we set out to solve
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">
              The real cost of slow replies
            </h2>
            <div className="space-y-4 text-gray-600 leading-relaxed">
              <p className="text-lg text-gray-700 font-light leading-relaxed">
                In Zambia, WhatsApp is how customers contact businesses. It is not a secondary channel — it is the channel. And most businesses handle it manually, on a single phone, during business hours only.
              </p>
              <p>
                That means every enquiry after 5pm goes unanswered until morning. By then, the customer has moved on. They did not wait. Customers in 2026 do not wait.
              </p>
              <p>
                The irony is that most of these businesses are doing everything else right. The product is good. The price is fair. The service is solid. They are losing customers not to a bad offering — but to a gap that should not exist.
              </p>
              <p className="font-semibold text-gray-900">
                That is the gap FiQ was built to close.
              </p>
            </div>
          </div>
          <div className="space-y-0">
            {stats.map((s) => (
              <div key={s.label} className="border border-gray-200 bg-white p-6 -mt-px first:mt-0 first:rounded-t-2xl last:rounded-b-2xl">
                <p className="text-3xl font-bold bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent">
                  {s.value}
                </p>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-1 mb-1">
                  {s.label}
                </p>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {s.context}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 3: The Founding Story */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* Left sidebar */}
          <div className="lg:col-span-4">
            <p className="text-sm font-semibold text-emerald-600 tracking-wide uppercase mb-3">
              The founding story
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">
              Why we built this
            </h2>
            <div className="border-l-4 border-emerald-500 bg-emerald-50 p-5 rounded-r-xl">
              <p className="text-gray-700 italic leading-relaxed">
                &ldquo;The problem was never the product. It was always the response time.&rdquo;
              </p>
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mt-3">
                — Codarti, Lusaka
              </p>
            </div>
          </div>

          {/* Right story body */}
          <div className="lg:col-span-8 space-y-5 text-gray-600 leading-relaxed">
            <p>
              Codarti is a Zambian technology company. We build software for African businesses. We have been doing it long enough to have seen the same pattern repeat itself across industries — healthcare, real estate, retail, finance, education — over and over.
            </p>
            <p>
              <strong className="text-gray-900">The pattern is this:</strong> a business invests years building something real. They develop a strong product, earn loyal customers, and build a reputation through hard work. Then they plateau — not because demand dried up, but because they cannot keep up with the enquiries. WhatsApp is overflowing. Messages are going unanswered. Bookings are lost to businesses that happened to reply first.
            </p>
            <p>
              The usual solution is to hire someone to manage messages. But a support agent in Zambia costs K3,000–5,000 per month, covers eight hours a day, takes leave, and needs management. You solve one problem and create four more.
            </p>
            <p>
              <strong className="text-gray-900">We built FiQ because the better solution already existed — it just was not accessible to Zambian businesses.</strong> The technology to handle customer conversations automatically, intelligently, and affordably was available. We connected it to WhatsApp, configured it for the local market, priced it in kwacha, built mobile money payments in, and made it so that any business owner — not just developers — could use it.
            </p>
            <p>
              No foreign currency. No complicated setup. No IT department required. The FiQ team handles the entire technical configuration. You provide your business information. We do everything else.
            </p>
            <p className="text-lg text-gray-900 font-medium border-t border-gray-200 pt-6 mt-6 leading-relaxed">
              Enterprise-level customer care should not require an enterprise-level budget or an enterprise-level IT team. Every business doing good work deserves to respond like the best companies in the world.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 4: The Numbers, Honestly Stated */}
      <section className="py-16 px-6 bg-gradient-to-br from-emerald-500 to-teal-600">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              The numbers, honestly stated
            </h2>
            <p className="text-emerald-100 leading-relaxed">
              We do not put made-up statistics on our site. Every number here reflects real performance across actual FiQ customers, as of April 2026. No rounding up. No cherry-picking the best-case scenario.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-0.5">
            {stats.map((s) => (
              <div key={s.label} className="bg-gray-900 p-6">
                <p className="text-3xl font-bold text-emerald-400">{s.value}</p>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-1 mb-1">
                  {s.label}
                </p>
                <p className="text-sm text-gray-500 leading-relaxed">{s.context}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 5: How We Operate — Philosophy Cards */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <p className="text-sm font-semibold text-emerald-600 tracking-wide uppercase mb-3">
            How we operate
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-12">
            Six things we believe without compromise
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {principles.map((p) => (
              <div key={p.num} className="rounded-2xl border border-gray-200 p-7 hover:shadow-lg transition-shadow">
                <span className="text-5xl font-bold text-emerald-100 block mb-2">{p.num}</span>
                <h3 className="text-base font-bold text-gray-900 mb-3">{p.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 6: 30-Day Guarantee + CTA */}
      <section className="py-16 px-6 bg-gray-50 border-y border-gray-100">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Guarantee badge */}
          <div className="flex justify-center">
            <div className="relative flex flex-col items-center justify-center w-64 h-64 rounded-full border-2 border-emerald-500 bg-emerald-50 text-center p-8">
              <div className="absolute inset-[-8px] rounded-full border border-emerald-300" />
              <div className="absolute inset-[-16px] rounded-full border border-emerald-200" />
              <p className="text-5xl font-bold text-emerald-600">30</p>
              <p className="text-xs font-bold text-gray-900 uppercase tracking-wide mt-1">Day Money-Back</p>
              <p className="text-xs font-bold text-gray-900 uppercase tracking-wide">Guarantee</p>
              <p className="text-xs text-gray-500 mt-2">On every paid plan.<br />No questions asked.</p>
            </div>
          </div>

          {/* Guarantee text */}
          <div>
            <p className="text-sm font-semibold text-emerald-600 tracking-wide uppercase mb-3">
              Zero risk to start
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              We are confident enough to guarantee it
            </h2>
            <div className="space-y-4 text-gray-600 leading-relaxed">
              <p>
                Every paid FiQ plan comes with a 30-day money-back guarantee. If you sign up, use the product, and genuinely find it does not work for your business within 30 days, you receive every kwacha back.
              </p>
              <p className="font-semibold text-gray-900">
                One email to support@codarti.com. Full refund. No questions. No lengthy process.
              </p>
            </div>
            <div className="mt-6 space-y-3">
              {[
                "Applies to Basic, Business, and Enterprise paid plans",
                "No free trial required — start with the permanent free tier or go straight to paid",
                "Claim within 30 days of first payment — single email, full refund issued",
                "No justification required — if it did not work, we refund",
              ].map((term) => (
                <div key={term} className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-600">{term}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 p-12 md:p-16 text-white">
            <p className="text-sm font-semibold text-emerald-200 tracking-wide uppercase mb-3">
              The next step is simple
            </p>
            <h2 className="text-3xl md:text-4xl font-bold">
              See it working on your actual business
            </h2>
            <p className="text-emerald-100 mt-4 max-w-lg mx-auto">
              Book a free demo. The FiQ team builds the demo around your specific business type — not a generic slideshow.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
              <Link
                href="/#book-demo"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-semibold text-emerald-700 hover:bg-emerald-50 transition-all shadow-lg"
              >
                Book a Demo
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 rounded-xl border-2 border-white/30 px-8 py-4 text-base font-semibold text-white hover:bg-white/10 transition-all"
              >
                See Pricing
              </Link>
            </div>
            <p className="text-sm text-emerald-200 mt-4">
              30-day money-back guarantee on all paid plans.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
