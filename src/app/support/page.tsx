import { WebCallWidget } from "@/components/voice/web-call-widget";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "FiQ Support - First in Queue",
  description: "Get help with First in Queue. Talk to our AI support agent directly from your browser.",
};

async function getFiQSupportAgent() {
  try {
    const supabase = getSupabaseAdmin();
    
    // Get the FiQ support configuration
    const { data: config } = await supabase
      .from("fiq_support_config")
      .select("voice_agent_id, is_active")
      .eq("is_active", true)
      .single();

    if (!config?.voice_agent_id) {
      // Fallback: get any active voice agent
      const { data: agent } = await supabase
        .from("voice_agents")
        .select("retell_agent_id, name, greeting_message")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      
      return agent;
    }

    // Get the configured agent
    const { data: agent } = await supabase
      .from("voice_agents")
      .select("retell_agent_id, name, greeting_message")
      .eq("id", config.voice_agent_id)
      .eq("is_active", true)
      .single();

    return agent;
  } catch {
    return null;
  }
}

export default async function SupportPage() {
  const agent = await getFiQSupportAgent();

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            How can we help?
          </h1>
          <p className="text-gray-600">
            Get instant support from our AI assistant. No phone number needed.
          </p>
        </div>

        {/* Web Call Widget */}
        {agent ? (
          <WebCallWidget 
            agentId={agent.retell_agent_id}
            greeting={agent.greeting_message || "Talk to our AI support agent directly from your browser"}
          />
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Support Not Available
            </h3>
            <p className="text-gray-600 mb-4">
              Our voice support is currently being configured. Please check back later or contact us via email.
            </p>
            <a 
              href="mailto:support@firstinqueue.com" 
              className="text-emerald-600 hover:text-emerald-700 font-medium"
            >
              support@firstinqueue.com
            </a>
          </div>
        )}

        {/* Alternative Support Options */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <a 
            href="mailto:support@firstinqueue.com"
            className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200 hover:border-emerald-300 hover:shadow-sm transition-all"
          >
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-900">Email Support</p>
              <p className="text-sm text-gray-500">support@firstinqueue.com</p>
            </div>
          </a>

          <a 
            href="https://wa.me/1234567890"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200 hover:border-emerald-300 hover:shadow-sm transition-all"
          >
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-900">WhatsApp</p>
              <p className="text-sm text-gray-500">Chat on WhatsApp</p>
            </div>
          </a>
        </div>

        {/* FAQ Link */}
        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm">
            Looking for quick answers?{" "}
            <a href="/faq" className="text-emerald-600 hover:text-emerald-700 font-medium">
              View our FAQ
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
