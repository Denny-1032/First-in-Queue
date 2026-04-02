import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";

export const metadata: Metadata = {
  title: "Industries",
  description: "Pre-configured AI templates for e-commerce, healthcare, restaurants, real estate, education, travel, finance, and SaaS.",
};

const industries = [
  {
    emoji: "🛒",
    name: "E-Commerce",
    tagline: "Turn shoppers into loyal customers",
    description: "Answer questions about orders, shipping, returns, and products instantly.",
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
    tagline: "Better patient communication, around the clock",
    description: "Book appointments, share results, and answer health questions — compliantly.",
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
    tagline: "Fill more tables, handle fewer calls",
    description: "Handle reservations, menu questions, delivery status, and special requests.",
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
    tagline: "Never miss a lead, day or night",
    description: "Qualify leads, schedule viewings, and answer listing questions automatically.",
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
    tagline: "Support students and parents effortlessly",
    description: "Handle admissions, schedules, and fee inquiries with instant AI responses.",
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
    tagline: "Seamless travel support across time zones",
    description: "Manage bookings, itineraries, and real-time updates in any language.",
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
    tagline: "Secure, compliant customer communication",
    description: "Handle account inquiries and transactions securely with fraud escalation.",
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
    tagline: "Reduce support tickets, increase retention",
    description: "Onboard users, troubleshoot issues, and handle billing automatically.",
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
            Pre-configured AI templates, escalation rules, and flows for your industry.
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
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{ind.name}</h2>
                      <p className="text-sm text-emerald-600 font-medium">{ind.tagline}</p>
                    </div>
                  </div>
                  <p className="text-gray-500 leading-relaxed mb-6">{ind.description}</p>
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
                    <p className="text-sm text-gray-400 mt-4">Pre-built AI template included</p>
                    <Link
                      href="/login"
                      className="inline-flex items-center gap-2 mt-4 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-2.5 text-sm font-medium text-white hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg shadow-emerald-500/25"
                    >
                      Try for Free
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
              We&apos;ll create a custom AI template for your industry.
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
