"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Zap,
  ExternalLink,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

interface Integration {
  id: string;
  name: string;
  description: string;
  category: string;
  connected: boolean;
  icon: string;
}

const integrations: Integration[] = [
  { id: "1", name: "WhatsApp Cloud API", description: "Meta's official WhatsApp Business messaging API", category: "Messaging", connected: true, icon: "💬" },
  { id: "2", name: "OpenAI", description: "GPT-powered AI for intelligent customer responses", category: "AI", connected: true, icon: "🤖" },
  { id: "3", name: "Supabase", description: "Database, auth, and real-time subscriptions", category: "Database", connected: true, icon: "⚡" },
  { id: "4", name: "Retell AI", description: "AI voice agent for phone calls — STT, LLM, and TTS", category: "Voice", connected: true, icon: "🗣️" },
  { id: "5", name: "Twilio", description: "Telephony provider for outbound and inbound voice calls", category: "Voice", connected: true, icon: "📞" },
  { id: "6", name: "Lipila", description: "Mobile money and card payments for Zambian businesses", category: "Payments", connected: true, icon: "�" },
  { id: "7", name: "Shopify", description: "E-commerce platform for order and product data", category: "E-commerce", connected: false, icon: "🛒" },
  { id: "8", name: "HubSpot", description: "CRM for contact management and deal tracking", category: "CRM", connected: false, icon: "📊" },
  { id: "9", name: "Salesforce", description: "Enterprise CRM and customer data platform", category: "CRM", connected: false, icon: "☁️" },
  { id: "10", name: "Zendesk", description: "Help desk and ticketing system", category: "Support", connected: false, icon: "🎫" },
  { id: "11", name: "Slack", description: "Team notifications and agent alerts", category: "Notifications", connected: false, icon: "📢" },
  { id: "12", name: "Zapier", description: "Connect with 5000+ apps via automation workflows", category: "Automation", connected: false, icon: "⚡" },
  { id: "13", name: "Google Sheets", description: "Export conversation data and analytics", category: "Data", connected: false, icon: "📗" },
  { id: "14", name: "Webhooks", description: "Custom HTTP webhooks for any event", category: "Developer", connected: false, icon: "🔗" },
];

export default function IntegrationsPage() {
  const { toast } = useToast();
  const [items, setItems] = useState(integrations);

  // Detect real connection status from tenant data
  useEffect(() => {
    async function detectConnections() {
      try {
        const res = await fetch("/api/tenants");
        if (!res.ok) return;
        const tenants = await res.json();
        if (tenants.length > 0) {
          const tenant = tenants[0];
          const whatsappConnected = !!tenant.whatsapp_phone_number_id;
          const openaiConnected = !!tenant.openai_api_key;
          setItems((prev) =>
            prev.map((it) => {
              if (it.name === "WhatsApp Cloud API") return { ...it, connected: whatsappConnected };
              if (it.name === "OpenAI") return { ...it, connected: openaiConnected };
              return it;
            })
          );
        }
      } catch { /* keep defaults */ }
    }
    detectConnections();
  }, []);

  const connectedCount = items.filter((i) => i.connected).length;
  const categories = [...new Set(items.map((i) => i.category))];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Integrations</h1>
        <p className="text-gray-500 mt-1 text-sm">{connectedCount} of {integrations.length} connected</p>
      </div>

      {/* Connected integrations */}
      {items.some((i) => i.connected) && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Connected</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.filter((i) => i.connected).map((integration) => (
              <Card key={integration.id} className="ring-1 ring-emerald-200 hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">{integration.icon}</span>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900">{integration.name}</h3>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{integration.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Connected
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={() => toast(`${integration.name} configuration opened`, "info")}
                    >
                      Configure
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Available integrations */}
      {items.some((i) => !i.connected) && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Available</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.filter((i) => !i.connected).map((integration) => (
              <Card key={integration.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">{integration.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-gray-900">{integration.name}</h3>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{integration.category}</Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{integration.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <Circle className="h-3.5 w-3.5" />
                      Not connected
                    </div>
                    <Button
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={() => {
                        setItems((prev) =>
                          prev.map((it) => it.id === integration.id ? { ...it, connected: true } : it)
                        );
                        toast(`${integration.name} connected successfully`);
                      }}
                    >
                      Connect
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
