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
  Calendar,
  CreditCard,
  Banknote,
  Star,
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

interface DemoBooking {
  id: string;
  name: string;
  company: string | null;
  contact: string;
  status: string;
  created_at: string;
  notes: string | null;
}

interface SubscriptionData {
  subscriptions: {
    id: string;
    tenant_id: string;
    plan_id: string;
    status: string;
    current_period_start: string;
    current_period_end: string;
    tenants: { name: string };
  }[];
  stats: {
    total: number;
    active: number;
    trialing: number;
    expired: number;
    estimated_monthly_revenue: number;
  };
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [bookings, setBookings] = useState<DemoBooking[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, clientsRes, bookingsRes, subsRes] = await Promise.all([
          fetch("/api/admin/stats"),
          fetch("/api/admin/clients"),
          fetch("/api/admin/bookings"),
          fetch("/api/admin/subscriptions"),
        ]);
        if (statsRes.ok) setStats(await statsRes.json());
        if (clientsRes.ok) setClients(await clientsRes.json());
        if (bookingsRes.ok) setBookings(await bookingsRes.json());
        if (subsRes.ok) setSubscriptions(await subsRes.json());
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
        <h1 className="text-xl sm:text-2xl font-bold text-white">Platform Overview</h1>
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

      {/* Revenue Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[
          { label: "Monthly Revenue (Est.)", value: `K${(subscriptions?.stats.estimated_monthly_revenue || 0).toLocaleString()}`, icon: Banknote, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Active Subscriptions", value: subscriptions?.stats.active || 0, icon: CreditCard, color: "text-blue-400", bg: "bg-blue-500/10" },
          { label: "Trialing", value: subscriptions?.stats.trialing || 0, icon: Star, color: "text-amber-400", bg: "bg-amber-500/10" },
        ].map((metric) => (
          <Card key={metric.label} className="bg-slate-900 border-slate-800">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`h-8 w-8 rounded-lg ${metric.bg} flex items-center justify-center`}>
                    <metric.icon className={`h-4 w-4 ${metric.color}`} />
                  </div>
                  <p className="text-xs text-slate-400">{metric.label}</p>
                </div>
                <p className="text-2xl font-bold text-white">{metric.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Demo Bookings */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white text-base">Recent Demo Bookings</CardTitle>
            <div className="flex items-center gap-2">
              {bookings.filter(b => b.status === "new").length > 0 && (
                <Badge className="bg-amber-500/10 text-amber-400 border-0">
                  {bookings.filter(b => b.status === "new").length} pending
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {bookings.slice(0, 5).map((booking) => (
              <div
                key={booking.id}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-slate-700 flex items-center justify-center">
                    <Calendar className="h-4 w-4 text-slate-300" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{booking.name}</p>
                    <p className="text-xs text-slate-500">
                      {booking.company || "No company"} • {booking.contact}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">
                    {new Date(booking.created_at).toLocaleDateString()}
                  </span>
                  <Badge
                    className={
                      booking.status === "new"
                        ? "bg-amber-500/10 text-amber-400 border-0 text-[10px]"
                        : booking.status === "contacted"
                        ? "bg-blue-500/10 text-blue-400 border-0 text-[10px]"
                        : "bg-emerald-500/10 text-emerald-400 border-0 text-[10px]"
                    }
                  >
                    {booking.status}
                  </Badge>
                </div>
              </div>
            ))}
            {bookings.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-4">No demo bookings yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
