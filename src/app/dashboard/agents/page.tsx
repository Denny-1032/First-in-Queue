"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  MessageSquare,
  Phone,
  CheckCircle2,
  ArrowRight,
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

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{loading ? "—" : stats.aiHandled}</p>
            <p className="text-xs text-gray-500">Handled</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{stats.avgResponseTime}</p>
            <p className="text-xs text-gray-500">Avg Response</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{stats.satisfactionRate}%</p>
            <p className="text-xs text-gray-500">Satisfaction</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{loading ? "—" : stats.humanEscalations}</p>
            <p className="text-xs text-gray-500">Escalations</p>
          </CardContent>
        </Card>
      </div>

      {/* Capabilities */}
      <Card>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-4 w-4 text-blue-600 shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">WhatsApp</p>
                <p className="text-xs text-gray-500">FAQs, bookings, support</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-purple-600 shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">Voice</p>
                <p className="text-xs text-gray-500">Calls, enquiries, callbacks</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Zap className="h-4 w-4 text-amber-600 shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">Automation</p>
                <p className="text-xs text-gray-500">Intent detection, context-aware</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Handoff + Upgrade */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-semibold text-gray-900">Human Handoff</span>
            </div>
            <Link href="/dashboard/conversations">
              <Button variant="outline" size="sm" className="gap-1.5">
                View Conversations
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
              Customer requests human
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
              Complex issues
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
              Complaints & refunds
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
              Repeated failures
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
