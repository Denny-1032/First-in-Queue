"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Users,
  MessageSquare,
  Activity,
  ClipboardList,
  TrendingUp,
  ArrowRight,
  Building2,
  Wifi,
  WifiOff,
  BarChart3,
} from "lucide-react";

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
  config: { business_name?: string; industry?: string };
  is_active: boolean;
  setup_complete: boolean;
  messages_this_month: number;
  created_at: string;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, clientsRes] = await Promise.all([
          fetch("/api/admin/stats"),
          fetch("/api/admin/clients"),
        ]);
        if (statsRes.ok) setStats(await statsRes.json());
        if (clientsRes.ok) setClients(await clientsRes.json());
      } catch (e) {
        console.error("Failed to load admin data:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const maxVolume = Math.max(...(stats?.daily_volume?.map((d) => d.count) || [1]), 1);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Platform Overview</h1>
        <p className="text-sm text-slate-400 mt-1">Cross-tenant metrics and operations at a glance</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Clients", value: stats?.total_tenants || 0, icon: Users, color: "text-blue-400", bg: "bg-blue-500/10" },
          { label: "Active Bots", value: stats?.active_tenants || 0, icon: Activity, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Pending Setup", value: stats?.pending_setup || 0, icon: ClipboardList, color: "text-amber-400", bg: "bg-amber-500/10" },
          { label: "Messages Today", value: stats?.messages_today || 0, icon: MessageSquare, color: "text-purple-400", bg: "bg-purple-500/10" },
        ].map((kpi) => (
          <Card key={kpi.label} className="bg-slate-900 border-slate-800">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className={`h-10 w-10 rounded-lg ${kpi.bg} flex items-center justify-center`}>
                  <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                </div>
                <TrendingUp className="h-4 w-4 text-slate-600" />
              </div>
              <p className="text-2xl font-bold text-white">{kpi.value.toLocaleString()}</p>
              <p className="text-xs text-slate-400 mt-1">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Second row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[
          { label: "Messages This Week", value: stats?.messages_this_week || 0 },
          { label: "Messages This Month", value: stats?.messages_this_month || 0 },
          { label: "Active Conversations", value: stats?.active_conversations || 0 },
        ].map((metric) => (
          <Card key={metric.label} className="bg-slate-900 border-slate-800">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">{metric.label}</p>
                <p className="text-xl font-bold text-white mt-1">{metric.value.toLocaleString()}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-slate-700" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Message Volume Chart + Recent Clients */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Volume */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-base">Message Volume (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-40">
              {(stats?.daily_volume || []).map((day) => (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-slate-500">{day.count}</span>
                  <div
                    className="w-full bg-emerald-500/30 rounded-t transition-all"
                    style={{ height: `${Math.max((day.count / maxVolume) * 120, 4)}px` }}
                  >
                    <div
                      className="w-full bg-emerald-500 rounded-t"
                      style={{ height: "100%" }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500">{day.date}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Clients */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-base">Recent Clients</CardTitle>
              <Link href="/admin/clients" className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {clients.slice(0, 5).map((client) => (
                <Link
                  key={client.id}
                  href={`/admin/clients/${client.id}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-slate-700 flex items-center justify-center">
                      <Building2 className="h-4 w-4 text-slate-300" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{client.config?.business_name || client.name}</p>
                      <p className="text-xs text-slate-500">{client.config?.industry || "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {client.setup_complete ? (
                      <Badge className="bg-emerald-500/10 text-emerald-400 border-0 text-[10px]">
                        <Wifi className="h-2.5 w-2.5 mr-1" /> Live
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-500/10 text-amber-400 border-0 text-[10px]">
                        <WifiOff className="h-2.5 w-2.5 mr-1" /> Setup
                      </Badge>
                    )}
                  </div>
                </Link>
              ))}
              {clients.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">No clients yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
