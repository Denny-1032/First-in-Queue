import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Heart, Globe, Zap, Shield } from "lucide-react";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";

export const metadata: Metadata = {
  title: "About",
  description: "Built in Zambia. Automated WhatsApp & voice support so every customer gets an instant response — 24/7.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight">
            Fast. Efficient.{" "}
            <span className="bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent">
              Instant.
            </span>
          </h1>
          <p className="text-lg text-gray-500 mt-6 max-w-2xl mx-auto">
            Built in Zambia. Automated WhatsApp & voice support so every customer gets an instant response — 24/7.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">Our Mission</h2>
            <p className="text-gray-500 leading-relaxed">
              Every Zambian business deserves enterprise-level customer care. FiQ handles repetitive questions instantly and escalates complex issues to your team with full context — so you can focus on growing your business.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-6">
            {[
              { icon: Heart, label: "Customer-First", desc: "Built around the customer experience", color: "text-rose-600 bg-rose-100" },
              { icon: Globe, label: "Local & Global", desc: "40+ languages incl. Bemba, Nyanja & more", color: "text-blue-600 bg-blue-100" },
              { icon: Zap, label: "Simple", desc: "For business owners, not developers", color: "text-amber-600 bg-amber-100" },
              { icon: Shield, label: "Secure", desc: "Enterprise-grade data protection", color: "text-emerald-600 bg-emerald-100" },
            ].map((v) => (
              <div key={v.label} className="rounded-2xl bg-white border border-gray-200 p-5 text-center">
                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${v.color} mb-3`}>
                  <v.icon className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900">{v.label}</h3>
                <p className="text-xs text-gray-500 mt-1">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: "78%", label: "Avg. auto-resolution rate" },
            { value: "40+", label: "Languages supported" },
            { value: "<2s", label: "Average response time" },
            { value: "24/7", label: "Always available" },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-3xl font-bold bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent">{s.value}</p>
              <p className="text-sm text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 p-12 md:p-16 text-white">
            <h2 className="text-3xl md:text-4xl font-bold">See it in action</h2>
            <p className="text-emerald-100 mt-4 max-w-lg mx-auto">
              Book a free demo. No commitment required.
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
                href="/contact"
                className="inline-flex items-center gap-2 rounded-xl border-2 border-white/30 px-8 py-4 text-base font-semibold text-white hover:bg-white/10 transition-all"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
