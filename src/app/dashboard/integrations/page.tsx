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
