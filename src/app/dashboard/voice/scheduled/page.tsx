"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  Phone,
  Plus,
  Trash2,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  PhoneCall,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import Link from "next/link";

interface ScheduledCallRow {
  id: string;
  customer_phone: string;
  customer_name: string | null;
  purpose: string | null;
  scheduled_at: string;
  status: string;
  retry_count: number;
  max_retries: number;
  result_summary: string | null;
  error_message: string | null;
  created_at: string;
  voice_agents: { name: string } | null;
}

const statusConfig: Record<string, { icon: typeof Clock; color: string; label: string }> = {
  pending: { icon: Clock, color: "bg-emerald-100 text-emerald-700", label: "Pending" },
  calling: { icon: PhoneCall, color: "bg-amber-100 text-amber-700", label: "Calling" },
  completed: { icon: CheckCircle2, color: "bg-emerald-100 text-emerald-700", label: "Completed" },
  failed: { icon: AlertTriangle, color: "bg-red-100 text-red-700", label: "Failed" },
  cancelled: { icon: XCircle, color: "bg-gray-100 text-gray-600", label: "Cancelled" },
};

export default function ScheduledCallsPage() {
  const { toast } = useToast();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [calls, setCalls] = useState<ScheduledCallRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("");

  useEffect(() => {
    fetch("/api/tenants")
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d) ? d : d.tenants || [];
        if (list[0]) setTenantId(list[0].id);
        else setLoading(false);
      })
      .catch(() => { setLoading(false); });
  }, []);

  const fetchCalls = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ tenantId });
      if (filter) params.set("status", filter);
      const res = await fetch(`/api/voice/scheduled?${params}`);
      const data = await res.json();
      setCalls(data.scheduledCalls || []);
    } catch {
      setCalls([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId, filter]);

  useEffect(() => { fetchCalls(); }, [fetchCalls]);

  const handleCancel = async (id: string) => {
    try {
      const res = await fetch(`/api/voice/scheduled/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (!res.ok) throw new Error("Failed to cancel");
      toast("Call cancelled", "success");
      fetchCalls();
    } catch {
      toast("Failed to cancel call", "error");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/voice/scheduled/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast("Scheduled call removed", "success");
      fetchCalls();
    } catch {
      toast("Failed to delete", "error");
    }
  };

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return {
      date: d.toLocaleDateString("en-ZM", { weekday: "short", day: "numeric", month: "short" }),
      time: d.toLocaleTimeString("en-ZM", { hour: "2-digit", minute: "2-digit" }),
    };
  };

  const upcoming = calls.filter((c) => c.status === "pending");
  const past = calls.filter((c) => c.status !== "pending");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/dashboard/voice" className="text-sm text-gray-500 hover:text-gray-700">Voice Calls</Link>
            <span className="text-gray-300">/</span>
            <span className="text-sm text-gray-900 font-medium">Scheduled</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Scheduled Calls</h1>
          <p className="text-sm text-gray-500">Manage upcoming and past scheduled calls</p>
        </div>
        <Button
          disabled
          title="Disabled, Contact Support"
          className="gap-2 bg-gray-300 text-gray-500 cursor-not-allowed"
        >
          <Plus className="h-4 w-4" />
          Schedule Call
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-px">
        {[
          { value: "", label: "All" },
          { value: "pending", label: "Upcoming" },
          { value: "completed", label: "Completed" },
          { value: "failed", label: "Failed" },
          { value: "cancelled", label: "Cancelled" },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={cn(
              "px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              filter === tab.value
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : calls.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <div className="h-16 w-16 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
              <Calendar className="h-7 w-7 text-emerald-400" />
            </div>
            <p className="text-gray-900 font-medium">No scheduled calls</p>
            <p className="text-sm text-gray-500 mt-1">Scheduled calls will appear here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Upcoming */}
          {upcoming.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-emerald-600" />
                  Upcoming ({upcoming.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-gray-100">
                  {upcoming.map((call) => {
                    const { date, time } = formatDateTime(call.scheduled_at);
                    const cfg = statusConfig[call.status] || statusConfig.pending;
                    const Icon = cfg.icon;

                    return (
                      <div key={call.id} className="flex items-center gap-4 py-3">
                        <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                          <span className="text-[10px] font-semibold leading-none">{date.split(" ")[0]}</span>
                          <span className="text-sm font-bold leading-tight">{date.split(" ")[1]}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-gray-900">{call.customer_name || call.customer_phone}</span>
                            <Badge variant="secondary" className={cn("text-[10px]", cfg.color)}>
                              <Icon className="h-3 w-3 mr-1" />
                              {cfg.label}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500 truncate">
                            {time} · {call.purpose || "No purpose specified"} · {call.customer_phone}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancel(call.id)}
                            className="h-8 w-8 p-0 text-gray-400 hover:text-red-600"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Past */}
          {past.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-500" />
                  Past ({past.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-gray-100">
                  {past.map((call) => {
                    const { date, time } = formatDateTime(call.scheduled_at);
                    const cfg = statusConfig[call.status] || statusConfig.pending;
                    const Icon = cfg.icon;

                    return (
                      <div key={call.id} className="flex items-center gap-4 py-3">
                        <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-gray-50 text-gray-500">
                          <span className="text-[10px] font-semibold leading-none">{date.split(" ")[0]}</span>
                          <span className="text-sm font-bold leading-tight">{date.split(" ")[1]}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-gray-900">{call.customer_name || call.customer_phone}</span>
                            <Badge variant="secondary" className={cn("text-[10px]", cfg.color)}>
                              <Icon className="h-3 w-3 mr-1" />
                              {cfg.label}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500 truncate">
                            {date} {time} · {call.purpose || "No purpose"} · {call.customer_phone}
                          </p>
                          {call.error_message && (
                            <p className="text-xs text-red-500 mt-0.5">{call.error_message}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {(call.status === "cancelled" || call.status === "failed") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(call.id)}
                              className="h-8 w-8 p-0 text-gray-400 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
