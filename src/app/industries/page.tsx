import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://firstinqueue.com";

export const metadata: Metadata = {
  title: "Industries — AI Customer Care for Every Business Type",
  description:
    "Pre-configured AI templates for e-commerce, healthcare, restaurants, real estate, education, travel, finance, and SaaS. Ready in 5 minutes.",
  alternates: {
    canonical: `${BASE_URL}/industries`,
  },
  openGraph: {
    title: "Industries | First in Queue",
    description:
      "AI customer care templates for 8+ industries. E-commerce, healthcare, restaurants, real estate and more.",
    url: `${BASE_URL}/industries`,
  },
};

const industries = [
  {
    emoji: "🛒",
    name: "E-Commerce",
    pain: "A customer asks about delivery times at 8pm. No one answers. They buy from the shop that replied first. Every unanswered WhatsApp message is a lost sale — and most e-commerce businesses lose dozens every week without realising it.",
    outcome: "FiQ handles order enquiries, stock checks, and delivery updates instantly — day or night. Stores typically recover 30–40% of otherwise lost after-hours sales.",
    useCases: [
      "Order tracking and delivery updates",
      "Return and refund processing",
      "Product recommendations and availability",
      "Shipping policy and cost inquiries",
      "Payment issue resolution",
    ],
  },
  {
    emoji: "🏥",
    name: "Healthcare",
    pain: "Your clinic misses appointment bookings every evening after 5pm. Patients call, get no answer, and book somewhere else — or worse, they no-show because no one reminded them. The average clinic loses K15,000–25,000 a month to no-shows alone.",
    outcome: "FiQ sends automated reminders and handles bookings 24/7. Most clinics see no-shows drop by 25–40% in the first month.",
    useCases: [
      "Appointment scheduling and reminders",
      "Lab results and prescription inquiries",
      "Insurance and billing questions",
      "Clinic hours and location info",
      "Urgent care triage and escalation",
    ],
  },
  {
    emoji: "🍽️",
    name: "Restaurants",
    pain: "The phone rings during dinner service and no one picks up. The customer books elsewhere. You never even knew they called. Empty tables on a Friday night are not a capacity problem — they are a response time problem.",
    outcome: "WhatsApp reservations increase when customers can book instantly at any hour. Your staff stays focused on service, not answering phones.",
    useCases: [
      "Table reservations and party bookings",
      "Menu items, allergens, and dietary options",
      "Delivery order tracking and updates",
      "Operating hours and location details",
      "Catering and event inquiries",
    ],
  },
  {
    emoji: "🏠",
    name: "Real Estate",
    pain: "A lead messages at 7pm asking about a listing. Your office is closed. By morning, they have already viewed a property with another agent. In real estate, one missed lead can mean K10,000–50,000 in lost commission.",
    outcome: "Capture and qualify 100% of leads, day or night. Agents start every morning with pre-screened enquiries in their inbox.",
    useCases: [
      "Property search and listing inquiries",
      "Viewing and open house scheduling",
      "Lead qualification and scoring",
      "Mortgage and financing questions",
      "Neighborhood and market info",
    ],
  },
  {
    emoji: "🎓",
    name: "Education",
    pain: "A parent sends a WhatsApp at 9pm asking about school fees and enrollment. No response until Monday. By then, they have already enquired at two other schools. Every delayed response is a delayed enrollment — or a lost one worth K5,000–20,000 in tuition.",
    outcome: "Parents get instant answers when they ask, not when your office opens. Schools using FiQ see measurable improvements in enrollment conversion rates.",
    useCases: [
      "Admissions process and requirements",
      "Course schedules and registration",
      "Fee payments and financial aid",
      "Campus facilities and events",
      "Student support and counseling referrals",
    ],
  },
  {
    emoji: "✈️",
    name: "Travel & Hospitality",
    pain: "A guest in a different time zone needs help at 3am your time. No one answers. They leave a bad review. In hospitality, one bad review costs more than a dozen good ones can recover — and it stays visible for years.",
    outcome: "24/7 guest support across all time zones. Enquiries handled instantly, in the guest's language.",
    useCases: [
      "Booking confirmations and modifications",
      "Itinerary details and travel documents",
      "Hotel check-in and amenity info",
      "Flight and transfer updates",
      "Local recommendations and guides",
    ],
  },
  {
    emoji: "💰",
    name: "Finance",
    pain: "A client sends an urgent query about a suspicious transaction at 10pm. Your team sees it at 8am the next day. In financial services, delayed responses erode trust faster than any competitor can — and a single escalation handled late can cost K50,000+ in client churn.",
    outcome: "Instant acknowledgement and escalation for sensitive queries. Routine account questions handled automatically, around the clock.",
    useCases: [
      "Account balance and transaction history",
      "Card activation and PIN assistance",
      "Loan and mortgage inquiries",
      "Fraud detection and instant alerts",
      "Branch hours and ATM locations",
    ],
  },
  {
    emoji: "💻",
    name: "SaaS & Technology",
    pain: "Support tickets pile up overnight. A frustrated user churns before your team even reads the ticket. Each churned customer is K1,000–10,000 per month in recurring revenue gone — not because your product failed, but because your support was asleep.",
    outcome: "Resolve the majority of support tickets automatically. Reduce response time to seconds while keeping complex issues routed to the right human.",
    useCases: [
      "Account setup and onboarding",
      "Billing, invoices, and plan changes",
      "Common troubleshooting and how-tos",
      "Feature requests and feedback collection",
      "System status and outage updates",
    ],
  },
];

export default function IndustriesPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight">
            Built for{" "}
            <span className="bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent">
              every industry
            </span>
          </h1>
          <p className="text-lg text-gray-500 mt-6 max-w-2xl mx-auto">
            Pre-configured templates, escalation rules, and response flows for your industry.
          </p>
        </div>
      </section>

      {/* Industries */}
      <section className="py-12 px-6">
        <div className="max-w-6xl mx-auto space-y-12">
          {industries.map((ind, idx) => (
            <div
              key={ind.name}
              className="rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="grid grid-cols-1 md:grid-cols-5">
                <div className={`md:col-span-3 p-8 md:p-10 ${idx % 2 === 1 ? "md:order-2" : ""}`}>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl">{ind.emoji}</span>
                    <h2 className="text-xl font-bold text-gray-900">{ind.name}</h2>
                  </div>
                  <p className="text-gray-600 leading-relaxed mb-4">{ind.pain}</p>
                  <p className="text-emerald-600 font-medium text-sm leading-relaxed mb-6 border-t border-gray-100 pt-4">{ind.outcome}</p>
                  <ul className="space-y-2">
                    {ind.useCases.map((uc) => (
                      <li key={uc} className="flex items-start gap-2 text-sm text-gray-600">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                        {uc}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={`md:col-span-2 bg-gradient-to-br from-gray-50 to-gray-100 p-8 md:p-10 flex items-center justify-center ${idx % 2 === 1 ? "md:order-1" : ""}`}>
                  <div className="text-center">
                    <span className="text-6xl">{ind.emoji}</span>
                    <p className="text-sm text-gray-400 mt-4">Pre-built template included</p>
                    <Link
                      href="/#book-demo"
                      className="inline-flex items-center gap-2 mt-4 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-2.5 text-sm font-medium text-white hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg shadow-emerald-500/25"
                    >
                      Book a Demo
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 p-12 md:p-16 text-white">
            <h2 className="text-3xl md:text-4xl font-bold">Don&apos;t see your industry?</h2>
            <p className="text-emerald-100 mt-4 max-w-lg mx-auto">
              We&apos;ll create a custom template for your industry.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-semibold text-emerald-700 hover:bg-emerald-50 transition-all shadow-lg"
              >
                Contact Us
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/#book-demo"
                className="inline-flex items-center gap-2 rounded-xl border-2 border-white/30 px-8 py-4 text-base font-semibold text-white hover:bg-white/10 transition-all"
              >
                Book a Demo
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
