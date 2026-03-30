"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  Clock,
  Calendar,
  Play,
  Search,
  ChevronDown,
  ChevronUp,
  Timer,
  TrendingUp,
  Mic,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { OutboundCallModal } from "@/components/dashboard/outbound-call-modal";
import { ScheduleCallModal } from "@/components/dashboard/schedule-call-modal";

interface VoiceCallRow {
  id: string;
  direction: "inbound" | "outbound";
  caller_phone: string | null;
  callee_phone: string | null;
  status: string;
  duration_seconds: number;
  recording_url: string | null;
  transcript: string | null;
  call_analysis: {
    call_summary?: string;
    user_sentiment?: string;
    call_successful?: boolean;
  } | null;
  disconnection_reason: string | null;
  metadata: Record<string, unknown>;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  voice_agents: { name: string } | null;
}

export default function VoiceCallsPage() {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [calls, setCalls] = useState<VoiceCallRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [directionFilter, setDirectionFilter] = useState<"" | "inbound" | "outbound">("");
  const [expandedCallId, setExpandedCallId] = useState<string | null>(null);
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [voiceMinutes, setVoiceMinutes] = useState({ used: 0, limit: 0, remaining: 0 });
  const [stats, setStats] = useState({ totalCalls: 0, callsToday: 0, avgDurationSeconds: 0, inboundCount: 0, outboundCount: 0 });

  // Fetch tenant ID
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
      const params = new URLSearchParams({ tenantId, limit: "50", offset: "0" });
      if (directionFilter) params.set("direction", directionFilter);
      const res = await fetch(`/api/voice/calls?${params}`);
      const data = await res.json();
      setCalls(data.calls || []);
      setTotal(data.total || 0);
    } catch {
      setCalls([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId, directionFilter]);

  const fetchStats = useCallback(async () => {
    if (!tenantId) return;
    try {
      const res = await fetch(`/api/voice/stats?tenantId=${tenantId}`);
      const data = await res.json();
      if (data.voiceMinutes) {
        setVoiceMinutes(data.voiceMinutes);
      }
      setStats({
        totalCalls: data.totalCalls || 0,
        callsToday: data.callsToday || 0,
        avgDurationSeconds: data.avgDurationSeconds || 0,
        inboundCount: data.inboundCount || 0,
        outboundCount: data.outboundCount || 0,
      });
    } catch {
      // silent
    }
  }, [tenantId]);

  useEffect(() => {
    fetchCalls();
    fetchStats();
  }, [fetchCalls, fetchStats]);

  const filteredCalls = calls.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.caller_phone?.toLowerCase().includes(q) ||
      c.callee_phone?.toLowerCase().includes(q) ||
      (c.metadata?.customer_name as string)?.toLowerCase().includes(q) ||
      c.call_analysis?.call_summary?.toLowerCase().includes(q)
    );
  });

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("en-ZM", {
      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
    });
  };

  const sentimentColor = (s?: string) => {
    if (s === "Positive") return "text-emerald-600 bg-emerald-50";
    if (s === "Negative") return "text-red-600 bg-red-50";
    return "text-gray-600 bg-gray-50";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Voice Calls</h1>
          <p className="text-sm text-gray-500">AI-powered phone calls with your customers</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setScheduleModalOpen(true)}
            className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
          >
            <Calendar className="h-4 w-4" />
            Schedule
          </Button>
          <Button
            onClick={() => setCallModalOpen(true)}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <PhoneCall className="h-4 w-4" />
            Make a Call
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                <Phone className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.totalCalls || total}</p>
                <p className="text-xs text-gray-500">Total Calls</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.callsToday}</p>
                <p className="text-xs text-gray-500">Calls Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                <Timer className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{formatDuration(stats.avgDurationSeconds)}</p>
                <p className="text-xs text-gray-500">Avg Duration</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                <Mic className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{voiceMinutes.used}<span className="text-sm font-normal text-gray-400">/{voiceMinutes.limit}</span></p>
                <p className="text-xs text-gray-500">Minutes Used</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100">
                <BarChart3 className="h-5 w-5 text-teal-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{voiceMinutes.remaining}</p>
                <p className="text-xs text-gray-500">Min Remaining</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-base">Call History</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search calls..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 w-56"
                />
              </div>
              <select
                value={directionFilter}
                onChange={(e) => setDirectionFilter(e.target.value as "" | "inbound" | "outbound")}
                className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">All</option>
                <option value="inbound">Inbound</option>
                <option value="outbound">Outbound</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 rounded-full border-2 border-emerald-200 border-t-emerald-600 animate-spin" />
            </div>
          ) : filteredCalls.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <Phone className="h-7 w-7 text-gray-400" />
              </div>
              <p className="text-gray-900 font-medium">No calls yet</p>
              <p className="text-sm text-gray-500 mt-1">Make your first AI voice call to get started.</p>
              <Button
                onClick={() => setCallModalOpen(true)}
                className="mt-4 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <PhoneCall className="h-4 w-4" />
                Make a Call
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredCalls.map((call) => {
                const isExpanded = expandedCallId === call.id;
                const customerName = (call.metadata?.customer_name as string) || null;
                const phone = call.direction === "outbound" ? call.callee_phone : call.caller_phone;

                return (
                  <div key={call.id} className="py-3">
                    {/* Call row */}
                    <button
                      onClick={() => setExpandedCallId(isExpanded ? null : call.id)}
                      className="w-full flex items-center gap-4 text-left hover:bg-gray-50 rounded-lg px-2 py-1.5 -mx-2 transition-colors"
                    >
                      <div className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                        call.direction === "inbound" ? "bg-blue-100" : "bg-emerald-100"
                      )}>
                        {call.direction === "inbound" ? (
                          <PhoneIncoming className="h-4 w-4 text-blue-600" />
                        ) : (
                          <PhoneOutgoing className="h-4 w-4 text-emerald-600" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-gray-900 truncate">
                            {customerName || phone || "Unknown"}
                          </span>
                          {call.call_analysis?.user_sentiment && (
                            <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0", sentimentColor(call.call_analysis.user_sentiment))}>
                              {call.call_analysis.user_sentiment}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          {call.call_analysis?.call_summary || (call.direction === "inbound" ? "Inbound call" : "Outbound call")}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-sm font-medium text-gray-900">{formatDuration(call.duration_seconds)}</p>
                        <p className="text-xs text-gray-400">{formatTime(call.started_at || call.created_at)}</p>
                      </div>

                      <Badge variant="secondary" className={cn(
                        "text-[10px] shrink-0",
                        call.status === "ended" ? "bg-gray-100 text-gray-600" :
                        call.status === "ongoing" ? "bg-emerald-100 text-emerald-700" :
                        call.status === "error" ? "bg-red-100 text-red-700" :
                        "bg-yellow-100 text-yellow-700"
                      )}>
                        {call.status}
                      </Badge>

                      {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                    </button>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="mt-3 ml-13 space-y-4 pl-4 border-l-2 border-gray-100">
                        {/* Recording */}
                        {call.recording_url && (
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-1.5">Recording</p>
                            <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
                              <Play className="h-5 w-5 text-emerald-600 shrink-0" />
                              <audio
                                src={call.recording_url}
                                controls
                                className="w-full h-8"
                                preload="none"
                              />
                            </div>
                          </div>
                        )}

                        {/* Transcript */}
                        {call.transcript && (
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-1.5">Transcript</p>
                            <div className="rounded-lg bg-gray-50 p-4 max-h-64 overflow-y-auto">
                              <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                                {call.transcript}
                              </pre>
                            </div>
                          </div>
                        )}

                        {/* Analysis */}
                        {call.call_analysis && (
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-1.5">AI Analysis</p>
                            <div className="rounded-lg bg-gray-50 p-4 space-y-2">
                              {call.call_analysis.call_summary && (
                                <p className="text-sm text-gray-700">{call.call_analysis.call_summary}</p>
                              )}
                              <div className="flex flex-wrap gap-2">
                                {call.call_analysis.call_successful !== undefined && (
                                  <Badge variant="secondary" className={call.call_analysis.call_successful ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}>
                                    {call.call_analysis.call_successful ? "Successful" : "Unsuccessful"}
                                  </Badge>
                                )}
                                {call.call_analysis.user_sentiment && (
                                  <Badge variant="secondary" className={sentimentColor(call.call_analysis.user_sentiment)}>
                                    {call.call_analysis.user_sentiment}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Metadata */}
                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500">
                          <span><Clock className="inline h-3 w-3 mr-1" />Duration: {formatDuration(call.duration_seconds)}</span>
                          {call.disconnection_reason && <span>Ended: {call.disconnection_reason.replace(/_/g, " ")}</span>}
                          {call.voice_agents?.name && <span>Agent: {call.voice_agents.name}</span>}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <OutboundCallModal
        isOpen={callModalOpen}
        onClose={() => { setCallModalOpen(false); fetchCalls(); }}
        tenantId={tenantId}
        remainingMinutes={voiceMinutes.remaining}
      />
      <ScheduleCallModal
        isOpen={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        tenantId={tenantId}
        onScheduled={fetchCalls}
      />
    </div>
  );
}
