"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bot,
  Users,
  MessageSquare,
  Phone,
  CheckCircle2,
  ArrowRight,
  Headphones,
  Clock,
  Zap,
} from "lucide-react";
import Link from "next/link";

export default function AgentsPage() {
  const [stats, setStats] = useState({
    aiHandled: 0,
    humanEscalations: 0,
    avgResponseTime: "< 3s",
    satisfactionRate: 98,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch("/api/analytics");
        if (res.ok) {
          const data = await res.json();
          setStats({
            aiHandled: data.ai_handled_conversations || 0,
            humanEscalations: data.human_escalations || 0,
            avgResponseTime: data.avg_response_time || "< 3s",
            satisfactionRate: data.satisfaction_rate || 98,
          });
        }
      } catch { /* use defaults */ }
      setLoading(false);
    }
    loadStats();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">AI & Human Agents</h1>
        <p className="text-gray-500 mt-1 text-sm">Your AI assistant handles conversations with human backup</p>
      </div>

      {/* AI Agent Banner */}
      <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50">
        <CardContent className="p-6 md:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 shrink-0">
              <Bot className="h-7 w-7 text-emerald-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-lg font-semibold text-gray-900">FiQ AI Assistant</h2>
                <Badge className="bg-emerald-500">Always Online</Badge>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Your AI assistant handles customer conversations 24/7 across WhatsApp and voice calls. 
                It understands context, answers questions, and only escalates to humans when truly needed.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/60 rounded-lg p-3">
                  <p className="text-2xl font-bold text-gray-900">{loading ? "—" : stats.aiHandled}</p>
                  <p className="text-xs text-gray-500">Conversations Handled</p>
                </div>
                <div className="bg-white/60 rounded-lg p-3">
                  <p className="text-2xl font-bold text-gray-900">{stats.avgResponseTime}</p>
                  <p className="text-xs text-gray-500">Avg Response Time</p>
                </div>
                <div className="bg-white/60 rounded-lg p-3">
                  <p className="text-2xl font-bold text-gray-900">{stats.satisfactionRate}%</p>
                  <p className="text-xs text-gray-500">Satisfaction Rate</p>
                </div>
                <div className="bg-white/60 rounded-lg p-3">
                  <p className="text-2xl font-bold text-gray-900">40+</p>
                  <p className="text-xs text-gray-500">Languages Supported</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Capabilities */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">AI Capabilities</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">WhatsApp Conversations</h3>
                  <p className="text-xs text-gray-500">Instant responses 24/7</p>
                </div>
              </div>
              <p className="text-xs text-gray-600">
                Handles customer enquiries, answers FAQs, processes bookings, and provides support via WhatsApp.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100">
                  <Phone className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Voice Calls</h3>
                  <p className="text-xs text-gray-500">Natural AI voice agent</p>
                </div>
              </div>
              <p className="text-xs text-gray-600">
                Makes and receives phone calls with natural voice, handles enquiries, and schedules callbacks.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                  <Zap className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Smart Automation</h3>
                  <p className="text-xs text-gray-500">Context-aware responses</p>
                </div>
              </div>
              <p className="text-xs text-gray-600">
                Understands intent, remembers context, and provides personalized responses based on your business data.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Human Handoff */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-5 w-5 text-gray-400" />
            Human Agent Handoff
          </CardTitle>
          <CardDescription>When AI escalates to your team</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Your AI assistant knows when to escalate conversations to human agents. This happens automatically when:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <span className="text-sm text-gray-700">Customer explicitly requests a human</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <span className="text-sm text-gray-700">Complex issues requiring human judgment</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <span className="text-sm text-gray-700">Sensitive topics (complaints, refunds)</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <span className="text-sm text-gray-700">Repeated failed attempts to help</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Headphones className="h-4 w-4" />
                <span>Escalations today: <strong className="text-gray-900">{loading ? "—" : stats.humanEscalations}</strong></span>
              </div>
              <Link href="/dashboard/conversations">
                <Button variant="outline" size="sm" className="gap-1.5">
                  View Conversations
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Business Plan Feature */}
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 shrink-0">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Need Human Agent Support?</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Business and Enterprise plans include human agent handoff features, allowing your team to take over conversations when needed.
                </p>
              </div>
            </div>
            <Link href="/pricing">
              <Button className="shrink-0 gap-2">
                View Plans
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
