"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Workflow,
  ArrowRight,
  Zap,
  Bot,
  Settings,
} from "lucide-react";
import Link from "next/link";

interface FlowStep {
  id: string;
  type: "message" | "question" | "action" | "condition" | "handoff";
  content?: string;
}

// Default AI-managed flows
const defaultFlows = [
  {
    id: "greeting",
    name: "Welcome & Greeting",
    trigger: "New conversation started",
    description: "Automatically greets customers and identifies their needs",
    steps: 3,
    active: true,
  },
  {
    id: "faq",
    name: "FAQ Handler",
    trigger: "Common questions detected",
    description: "Answers frequently asked questions from your knowledge base",
    steps: 2,
    active: true,
  },
  {
    id: "booking",
    name: "Appointment Booking",
    trigger: "Booking intent detected",
    description: "Guides customers through scheduling appointments or reservations",
    steps: 5,
    active: true,
  },
  {
    id: "escalation",
    name: "Human Handoff",
    trigger: "Complex issue or request",
    description: "Transfers conversation to a human agent when needed",
    steps: 2,
    active: true,
  },
  {
    id: "followup",
    name: "Follow-up Messages",
    trigger: "After conversation ends",
    description: "Sends satisfaction surveys and follow-up messages",
    steps: 2,
    active: true,
  },
];

export default function FlowsPage() {
  const [flows, setFlows] = useState(defaultFlows);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFlows() {
      try {
        const res = await fetch("/api/tenants");
        if (!res.ok) return;
        const tenants = await res.json();
        if (tenants.length > 0 && tenants[0].config?.flows?.length) {
          const configFlows = tenants[0].config.flows;
          const customFlows = configFlows.map((f: { id: string; name: string; trigger: string; steps: FlowStep[] }, idx: number) => ({
            id: f.id || String(idx),
            name: f.name,
            trigger: f.trigger,
            description: "Custom conversation flow",
            steps: f.steps?.length || 0,
            active: true,
          }));
          setFlows([...defaultFlows, ...customFlows]);
        }
      } catch { /* use defaults */ }
      setLoading(false);
    }
    loadFlows();
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Conversation Flows</h1>
          <p className="text-gray-500 mt-1 text-sm">AI-powered automated conversation workflows</p>
        </div>
        <Link href="/dashboard/ai-config">
          <Button variant="outline" className="gap-2">
            <Settings className="h-4 w-4" />
            Configure AI
          </Button>
        </Link>
      </div>

      {/* AI-Managed Banner */}
      <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50">
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <Bot className="h-5 w-5 text-emerald-600" />
            <span className="text-sm font-semibold text-gray-900">AI-managed</span>
            <span className="text-xs text-gray-500">·</span>
            <span className="text-xs text-gray-600">Intent detection · 40+ languages · 24/7</span>
          </div>
        </CardContent>
      </Card>

      {/* Active Flows */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Active Flows</h2>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {flows.map((flow) => {
              return (
                <Card key={flow.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
                          <Workflow className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900">{flow.name}</h3>
                          <p className="text-xs text-gray-500">{flow.steps} steps</p>
                        </div>
                      </div>
                      <Badge variant={flow.active ? "default" : "secondary"} className="text-[10px]">
                        {flow.active ? "Active" : "Paused"}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 mb-3">{flow.description}</p>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Zap className="h-3 w-3" />
                      <span>Trigger: {flow.trigger}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* How It Works */}
      <div className="flex items-center gap-2 text-xs text-gray-500 justify-center flex-wrap">
        <span className="font-medium text-gray-700">Customer messages</span>
        <ArrowRight className="h-3 w-3" />
        <span className="font-medium text-gray-700">AI detects intent</span>
        <ArrowRight className="h-3 w-3" />
        <span className="font-medium text-gray-700">Selects flow</span>
        <ArrowRight className="h-3 w-3" />
        <span className="font-medium text-gray-700">Responds or escalates</span>
      </div>
    </div>
  );
}
