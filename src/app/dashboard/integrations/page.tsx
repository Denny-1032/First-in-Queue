"use client";

import { useState } from "react";
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
  { id: "4", name: "Stripe", description: "Payment processing and subscription billing", category: "Payments", connected: false, icon: "💳" },
  { id: "5", name: "Shopify", description: "E-commerce platform for order and product data", category: "E-commerce", connected: false, icon: "🛒" },
  { id: "6", name: "HubSpot", description: "CRM for contact management and deal tracking", category: "CRM", connected: false, icon: "📊" },
  { id: "7", name: "Salesforce", description: "Enterprise CRM and customer data platform", category: "CRM", connected: false, icon: "☁️" },
  { id: "8", name: "Zendesk", description: "Help desk and ticketing system", category: "Support", connected: false, icon: "🎫" },
  { id: "9", name: "Slack", description: "Team notifications and agent alerts", category: "Notifications", connected: false, icon: "📢" },
  { id: "10", name: "Zapier", description: "Connect with 5000+ apps via automation workflows", category: "Automation", connected: false, icon: "⚡" },
  { id: "11", name: "Google Sheets", description: "Export conversation data and analytics", category: "Data", connected: false, icon: "📗" },
  { id: "12", name: "Webhooks", description: "Custom HTTP webhooks for any event", category: "Developer", connected: false, icon: "🔗" },
];

export default function IntegrationsPage() {
  const { toast } = useToast();
  const [items, setItems] = useState(integrations);
  const connectedCount = items.filter((i) => i.connected).length;
  const categories = [...new Set(items.map((i) => i.category))];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
        <p className="text-gray-500 mt-1">
          Connect Wavely with your existing tools — {connectedCount} of {integrations.length} connected
        </p>
      </div>

      {categories.map((category) => (
        <div key={category}>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">{category}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items
              .filter((i) => i.category === category)
              .map((integration) => (
                <Card key={integration.id} className={cn("hover:shadow-md transition-shadow", integration.connected && "ring-1 ring-emerald-200")}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{integration.icon}</span>
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900">{integration.name}</h3>
                          <p className="text-xs text-gray-500 mt-0.5">{integration.description}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      {integration.connected ? (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Connected
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          <Circle className="h-3.5 w-3.5" />
                          Not connected
                        </div>
                      )}
                      <Button
                        variant={integration.connected ? "outline" : "default"}
                        size="sm"
                        className="gap-1.5 text-xs"
                        onClick={() => {
                          if (integration.connected) {
                            toast(`${integration.name} configuration opened`, "info");
                          } else {
                            setItems((prev) =>
                              prev.map((it) => it.id === integration.id ? { ...it, connected: true } : it)
                            );
                            toast(`${integration.name} connected successfully`);
                          }
                        }}
                      >
                        {integration.connected ? "Configure" : "Connect"}
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
