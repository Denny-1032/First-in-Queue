"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  MessageSquare,
  Users,
  Wifi,
  WifiOff,
  TrendingUp,
  BarChart3,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PlatformStats {
  total_tenants: number;
  active_tenants: number;
  pending_setup: number;
  total_conversations: number;
  active_conversations: number;
  messages_today: number;
  messages_this_week: number;
  messages_this_month: number;
  daily_volume: { date: string; count: number }[];
}

interface ClientRow {
  id: string;
  name: string;
  config: { business_name?: string; industry?: string; personality?: { name?: string } };
  is_active: boolean;
  setup_complete: boolean;
  messages_this_month: number;
}

export default function AdminMonitoringPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [s, c] = await Promise.all([
          fetch("/api/admin/stats").then((r) => r.json()),
          fetch("/api/admin/clients").then((r) => r.json()),
        ]);
        setStats(s);
        setClients(c);
      } catch (e) {
        console.error("Failed to load monitoring data:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
    // Auto-refresh every 30s
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  const maxVolume = Math.max(...(stats?.daily_volume?.map((d) => d.count) || [1]), 1);

  // Sort clients by message volume (highest first)
  const topClients = [...clients].sort((a, b) => b.messages_this_month - a.messages_this_month);
  const totalMessages = clients.reduce((sum, c) => sum + c.messages_this_month, 0);

  // Health checks
  const connectedCount = clients.filter((c) => c.setup_complete && c.is_active).length;
  const pendingCount = clients.filter((c) => !c.setup_complete).length;
  const inactiveCount = clients.filter((c) => !c.is_active).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">System Monitoring</h1>
          <p className="text-sm text-slate-400 mt-1">Real-time platform health and performance metrics</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Auto-refreshing every 30s
        </div>
      </div>

      {/* Health Status */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-400" /> Platform Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg bg-slate-800/50">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span className="text-xs text-slate-400">Active Bots</span>
              </div>
              <p className="text-xl font-bold text-emerald-400">{connectedCount}</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-800/50">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-amber-400" />
                <span className="text-xs text-slate-400">Pending Setup</span>
              </div>
              <p className="text-xl font-bold text-amber-400">{pendingCount}</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-800/50">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <span className="text-xs text-slate-400">Inactive</span>
              </div>
              <p className="text-xl font-bold text-red-400">{inactiveCount}</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-800/50">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="h-4 w-4 text-blue-400" />
                <span className="text-xs text-slate-400">Active Conversations</span>
              </div>
              <p className="text-xl font-bold text-blue-400">{stats?.active_conversations || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Volume Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Volume Chart */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-base">Daily Message Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-44">
              {(stats?.daily_volume || []).map((day) => (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-slate-500">{day.count}</span>
                  <div
                    className="w-full rounded-t transition-all"
                    style={{ height: `${Math.max((day.count / maxVolume) * 130, 4)}px` }}
                  >
                    <div className="w-full h-full bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t opacity-80" />
                  </div>
                  <span className="text-[10px] text-slate-500">{day.date}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Clients by Volume */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-base">Top Clients by Volume (This Month)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topClients.slice(0, 8).map((client, i) => {
                const pct = totalMessages > 0 ? (client.messages_this_month / totalMessages) * 100 : 0;
                return (
                  <div key={client.id} className="flex items-center gap-3">
                    <span className="text-xs text-slate-600 w-4 text-right">{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-300 truncate">{client.config?.business_name || client.name}</span>
                        <span className="text-xs text-slate-500">{client.messages_this_month.toLocaleString()}</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-600 to-teal-400 rounded-full transition-all"
                          style={{ width: `${Math.max(pct, 2)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
              {topClients.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">No message data yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Key Metrics Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Messages Today", value: stats?.messages_today || 0, icon: MessageSquare, color: "text-blue-400" },
          { label: "Messages This Week", value: stats?.messages_this_week || 0, icon: TrendingUp, color: "text-purple-400" },
          { label: "Messages This Month", value: stats?.messages_this_month || 0, icon: BarChart3, color: "text-emerald-400" },
          { label: "Total Conversations", value: stats?.total_conversations || 0, icon: Users, color: "text-cyan-400" },
        ].map((m) => (
          <Card key={m.label} className="bg-slate-900 border-slate-800">
            <CardContent className="p-5">
              <m.icon className={cn("h-5 w-5 mb-2", m.color)} />
              <p className="text-2xl font-bold text-white">{m.value.toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-1">{m.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
