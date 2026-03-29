import type { Metadata } from "next";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of Service for First in Queue. AI-powered WhatsApp customer care platform.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <section className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Terms of Service</h1>
          <p className="text-sm text-gray-400 mb-12">Last updated: March 2026</p>

          <div className="prose prose-gray max-w-none space-y-8 text-gray-600 text-sm leading-relaxed">
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">1. Acceptance of Terms</h2>
              <p>
                By using the First in Queue platform (&quot;Service&quot;), you agree to these Terms. If acting on behalf of a business, you confirm authority to bind that business.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">2. Description of Service</h2>
              <p>
                An AI-powered WhatsApp customer care platform including automated responses, conversation management, analytics, and related tools.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">3. Account Registration</h2>
              <p>
                Provide accurate information when registering. You are responsible for your account security and must notify us of any unauthorised access.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">4. Acceptable Use</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>No spam or unsolicited bulk messages via WhatsApp.</li>
                <li>No violation of WhatsApp&apos;s Business Policy or Meta&apos;s Terms.</li>
                <li>No harmful, offensive, or illegal content.</li>
                <li>No reverse-engineering of the Service.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">5. AI-Generated Responses</h2>
              <p>
                AI responses are based on your configuration. While we strive for accuracy, AI may occasionally err. You are responsible for configuring your assistant appropriately.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">6. Subscription & Billing</h2>
              <p>
                Billed monthly in ZMW via Lipila (Mobile Money or Card). All plans include a 7-day free trial and 30-day money-back guarantee. Upgrade, downgrade, or cancel anytime from your dashboard.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">7. Service Availability</h2>
              <p>
                We target 99.9% uptime but do not guarantee uninterrupted access. Planned maintenance will be communicated in advance.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">8. Data Ownership</h2>
              <p>
                You retain ownership of all your data. We do not claim ownership of your content. See our Privacy Policy for details.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">9. Limitation of Liability</h2>
              <p>
                To the maximum extent permitted by law, we are not liable for indirect, incidental, or consequential damages arising from use of the Service.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">10. Termination</h2>
              <p>
                Either party may terminate at any time. Data is retained for 30 days post-termination for export, then permanently deleted.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">11. Changes to Terms</h2>
              <p>
                We may update these Terms and will notify you of material changes. Continued use constitutes acceptance.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">12. Governing Law</h2>
              <p>
                These Terms are governed by the laws of the Republic of Zambia. Any disputes arising from these Terms shall be resolved in the courts of Zambia.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">13. Contact</h2>
              <p>
                For questions about these Terms, contact us at{" "}
                <a href="mailto:legal@firstinqueue.com" className="text-emerald-600 hover:text-emerald-700 font-medium">
                  legal@firstinqueue.com
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
