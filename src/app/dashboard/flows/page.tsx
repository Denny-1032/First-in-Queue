"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Workflow,
  ArrowRight,
  MessageSquare,
  HelpCircle,
  Zap,
  GitBranch,
  UserCheck,
  Bot,
  CheckCircle2,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface FlowStep {
  id: string;
  type: "message" | "question" | "action" | "condition" | "handoff";
  content?: string;
}

const stepTypeIcons = {
  message: MessageSquare,
  question: HelpCircle,
  action: Zap,
  condition: GitBranch,
  handoff: UserCheck,
};

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
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 shrink-0">
              <Bot className="h-6 w-6 text-emerald-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">AI-Powered Conversations</h2>
              <p className="text-sm text-gray-600 mb-3">
                Your AI assistant automatically handles customer conversations using intelligent flows. 
                It understands context, answers questions, books appointments, and escalates to humans when needed.
              </p>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Auto-detects intent
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  40+ languages
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  24/7 availability
                </div>
              </div>
            </div>
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
      <Card>
        <CardHeader>
          <CardTitle className="text-base">How Conversation Flows Work</CardTitle>
          <CardDescription>Your AI assistant follows these steps automatically</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold text-sm">1</div>
              <div>
                <p className="text-sm font-medium text-gray-900">Customer Messages</p>
                <p className="text-xs text-gray-500">Via WhatsApp or Voice</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-300 hidden md:block" />
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-purple-600 font-bold text-sm">2</div>
              <div>
                <p className="text-sm font-medium text-gray-900">AI Understands Intent</p>
                <p className="text-xs text-gray-500">Analyzes context & needs</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-300 hidden md:block" />
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600 font-bold text-sm">3</div>
              <div>
                <p className="text-sm font-medium text-gray-900">Selects Best Flow</p>
                <p className="text-xs text-gray-500">Matches to right workflow</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-300 hidden md:block" />
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 font-bold text-sm">4</div>
              <div>
                <p className="text-sm font-medium text-gray-900">Responds & Acts</p>
                <p className="text-xs text-gray-500">Helps or escalates</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
