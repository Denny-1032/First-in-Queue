import type { Metadata } from "next";
import { Mail, MessageSquare, Clock, MapPin } from "lucide-react";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with First in Queue. Questions, demos, or custom plans.",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight">
            Get in{" "}
            <span className="bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent">
              touch
            </span>
          </h1>
          <p className="text-lg text-gray-500 mt-6 max-w-2xl mx-auto">
            Questions, demos, or custom plans — we&apos;re here to help.
          </p>
        </div>
      </section>

      {/* Contact Cards */}
      <section className="py-12 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="rounded-2xl border border-gray-200 p-8">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 mb-6">
              <Mail className="h-6 w-6 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Email Us</h2>
            <a
              href="mailto:copperjetofficial@gmail.com"
              className="text-emerald-600 font-semibold hover:text-emerald-700 transition-colors"
            >
              copperjetofficial@gmail.com
            </a>
          </div>

          <div className="rounded-2xl border border-gray-200 p-8">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 mb-6">
              <MessageSquare className="h-6 w-6 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">WhatsApp</h2>
            <a
              href="https://wa.me/260960667093"
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-600 font-semibold hover:text-green-700 transition-colors"
            >
              Message us on WhatsApp
            </a>
          </div>

          <div className="rounded-2xl border border-gray-200 p-8">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 mb-6">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Support Hours</h2>
            <p className="text-gray-700 font-medium text-sm">Monday – Friday: 8:00 AM – 5:00 PM (CAT)</p>
            <p className="text-gray-500 text-sm mt-1">Weekend: Email support only</p>
          </div>

          <div className="rounded-2xl border border-gray-200 p-8">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 mb-6">
              <MapPin className="h-6 w-6 text-purple-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Location</h2>
            <p className="text-gray-700 font-medium text-sm">Lusaka, Zambia</p>
            <p className="text-gray-500 text-sm mt-1">Serving businesses across Southern Africa</p>
          </div>
        </div>
      </section>

      {/* Enterprise */}
      <section className="py-16 px-6 bg-gray-50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">Enterprise or custom needs?</h2>
          <p className="text-gray-500 mb-8">
            Unlimited messages, custom integrations, or SLA guarantees? Let&apos;s talk.
          </p>
          <a
            href="mailto:copperjetofficial@gmail.com"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-8 py-4 text-base font-semibold text-white hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg shadow-emerald-500/25"
          >
            <Mail className="h-5 w-5" />
            Contact Sales
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
}
