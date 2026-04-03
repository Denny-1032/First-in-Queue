"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Shield,
  Headphones,
  Mail,
} from "lucide-react";
import Link from "next/link";

const managedServices = [
  { name: "WhatsApp Business API", description: "Official Meta WhatsApp Cloud API connection", icon: "💬" },
  { name: "AI Engine (GPT-4o)", description: "Advanced AI for intelligent customer responses", icon: "🤖" },
  { name: "Voice AI (Retell)", description: "AI-powered phone calls with natural voice", icon: "🗣️" },
  { name: "Telephony (Twilio)", description: "Reliable voice calling infrastructure", icon: "📞" },
  { name: "Database & Auth", description: "Secure data storage and authentication", icon: "🔐" },
  { name: "Payment Processing", description: "Mobile money and card payment handling", icon: "💳" },
];

export default function IntegrationsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Integrations</h1>
        <p className="text-gray-500 mt-1 text-sm">All integrations are fully managed by First in Queue</p>
      </div>

      {/* Managed Services Banner */}
      <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50">
        <CardContent className="p-6 md:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 shrink-0">
              <Shield className="h-6 w-6 text-emerald-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Fully Managed Infrastructure</h2>
              <p className="text-sm text-gray-600 mb-4">
                We handle all technical integrations for you. No API keys to manage, no configurations to worry about. 
                Your WhatsApp Business API, AI engine, voice calling, and payment processing are all set up and maintained by our team.
              </p>
              <div className="flex items-center gap-2 text-sm text-emerald-700 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                Zero technical setup required
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* What's Included */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">What&apos;s Included</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {managedServices.map((service) => (
            <Card key={service.name} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{service.icon}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900">{service.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{service.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Managed by FiQ
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Custom Integrations */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 shrink-0">
                <Headphones className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Need a Custom Integration?</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Enterprise plans include custom integrations with your POS, ERP, CRM, or other business systems.
                </p>
              </div>
            </div>
            <Link href="/contact">
              <Button variant="outline" className="gap-2 shrink-0">
                <Mail className="h-4 w-4" />
                Contact Us
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
