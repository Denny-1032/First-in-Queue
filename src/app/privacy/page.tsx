import type { Metadata } from "next";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://firstinqueue.com";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How First in Queue collects, uses, and protects your information. Compliant with Zambia Data Protection Act.",
  alternates: {
    canonical: `${BASE_URL}/privacy`,
  },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <section className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-sm text-gray-400 mb-12">Last updated: March 2026</p>

          <div className="prose prose-gray max-w-none space-y-8 text-gray-600 text-sm leading-relaxed">
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">1. Introduction</h2>
              <p>
                This policy explains how First in Queue (&quot;we&quot;, &quot;us&quot;) collects, uses, and protects information when you use our platform.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">2. Information We Collect</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Account info:</strong> Name, email, business name, industry.</li>
                <li><strong>Configuration:</strong> AI settings, knowledge base, FAQs, flows.</li>
                <li><strong>Conversations:</strong> Messages between your AI and customers via WhatsApp.</li>
                <li><strong>Usage data:</strong> Dashboard analytics and feature usage.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">3. How We Use Your Information</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>Operate the platform and AI assistant services.</li>
                <li>Process and respond to customer WhatsApp messages.</li>
                <li>Generate analytics and insights.</li>
                <li>Improve our platform (aggregated, anonymised data only).</li>
                <li>Communicate account updates and support.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">4. Data Storage & Security</h2>
              <p>
                Data is stored on Supabase (PostgreSQL) with row-level security, encrypted in transit (TLS 1.2+) and at rest.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">5. Third-Party Services</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Meta (WhatsApp Business API):</strong> Message sending/receiving.</li>
                <li><strong>OpenAI:</strong> AI response generation (not used to train their models).</li>
                <li><strong>Supabase:</strong> Database and authentication.</li>
                <li><strong>Lipila:</strong> Payment processing (Mobile Money &amp; card).</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">6. Data Sharing</h2>
              <p>
                We never sell or share your data for marketing. Data is only shared with the services listed above as needed to operate the platform.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">7. Data Retention</h2>
              <p>
                Data is retained while your account is active. Conversations auto-delete after 12 months. Request deletion anytime.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">8. Your Rights</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>Access, correct, or delete your personal data.</li>
                <li>Export your data in a portable format.</li>
                <li>Withdraw consent at any time.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">9. Data Protection Compliance</h2>
              <p>
                We comply with the Zambia Data Protection Act, 2021 and the Electronic Communications and Transactions Act of Zambia.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">10. Contact Us</h2>
              <p>
                If you have any questions about this Privacy Policy or wish to exercise your data rights, please contact us at{" "}
                <a href="mailto:privacy@firstinqueue.com" className="text-emerald-600 hover:text-emerald-700 font-medium">
                  privacy@firstinqueue.com
                </a>.
              </p>
            </section>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
