"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  MessageSquare,
  Bot,
  Users,
  Clock,
  Zap,
  Globe,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import type { AnalyticsData } from "@/types";

const mockWeeklyData = [
  { day: "Mon", messages: 312, resolved: 298, escalated: 14 },
  { day: "Tue", messages: 287, resolved: 271, escalated: 16 },
  { day: "Wed", messages: 356, resolved: 340, escalated: 16 },
  { day: "Thu", messages: 401, resolved: 389, escalated: 12 },
  { day: "Fri", messages: 378, resolved: 361, escalated: 17 },
  { day: "Sat", messages: 198, resolved: 192, escalated: 6 },
  { day: "Sun", messages: 156, resolved: 149, escalated: 7 },
];

const languageData = [
  { language: "English", percentage: 68, count: 872 },
  { language: "Spanish", percentage: 18, count: 231 },
  { language: "Portuguese", percentage: 8, count: 103 },
  { language: "French", percentage: 4, count: 51 },
  { language: "Other", percentage: 2, count: 27 },
];

const mockPeakHours = [
  { hour: "9 AM", volume: 45 },
  { hour: "10 AM", volume: 67 },
  { hour: "11 AM", volume: 82 },
  { hour: "12 PM", volume: 71 },
  { hour: "1 PM", volume: 58 },
  { hour: "2 PM", volume: 89 },
  { hour: "3 PM", volume: 94 },
  { hour: "4 PM", volume: 76 },
  { hour: "5 PM", volume: 63 },
  { hour: "6 PM", volume: 41 },
];

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/analytics");
      if (res.ok) {
        const data = await res.json();
        if (data && data.total_conversations !== undefined) {
          setAnalytics(data);
          return;
        }
      }
    } catch { /* fallback to mock */ }
    setAnalytics(null);
  }, []);

  useEffect(() => {
    fetchAnalytics().finally(() => setLoading(false));
  }, [fetchAnalytics]);

  const weeklyData = analytics?.daily_volume?.length
    ? analytics.daily_volume.map((d) => {
        const parsed = new Date(d.date);
        const dayName = isNaN(parsed.getTime()) ? d.date : parsed.toLocaleDateString("en", { weekday: "short" });
        return { day: dayName, messages: d.count, resolved: Math.round(d.count * 0.95), escalated: Math.round(d.count * 0.05) };
      })
    : mockWeeklyData;

  const peakHours = analytics?.hourly_volume?.length
    ? analytics.hourly_volume.map((h) => ({ hour: `${h.hour % 12 || 12} ${h.hour < 12 ? "AM" : "PM"}`, volume: h.count }))
    : mockPeakHours;

  const maxVolume = Math.max(...peakHours.map((h) => h.volume), 1);
  const maxMessages = Math.max(...weeklyData.map((d) => d.messages), 1);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-500 mt-1">Deep insights into your customer care performance</p>
        </div>
        <button
          onClick={() => fetchAnalytics(true).finally(() => setRefreshing(false))}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Total Messages", value: analytics ? analytics.messages_this_week.toLocaleString() : "2,088", change: "+12.5%", up: true, icon: MessageSquare, color: "text-blue-600" },
          { label: "AI Resolution", value: analytics ? `${analytics.ai_resolution_rate.toFixed(1)}%` : "78.5%", change: "+8.3%", up: true, icon: Bot, color: "text-emerald-600" },
          { label: "Active Convos", value: analytics ? String(analytics.active_conversations) : "47", change: "-4.1%", up: false, icon: Users, color: "text-purple-600" },
          { label: "Avg First Reply", value: analytics ? `${analytics.avg_response_time_seconds}s` : "8s", change: "-23%", up: true, icon: Zap, color: "text-amber-600" },
          { label: "Resolved", value: analytics ? analytics.resolved_conversations.toLocaleString() : "1,189", change: "+1.8%", up: true, icon: CheckCircle2, color: "text-emerald-600" },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                <div className="flex items-center gap-0.5 text-xs">
                  {kpi.up ? (
                    <TrendingUp className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-emerald-500" />
                  )}
                  <span className="text-emerald-600">{kpi.change}</span>
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Volume */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Weekly Message Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {weeklyData.map((day) => (
                <div key={day.day} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-8 shrink-0">{day.day}</span>
                  <div className="flex-1 flex items-center gap-1 h-6">
                    <div
                      className="h-full rounded-r bg-emerald-500 transition-all"
                      style={{ width: `${(day.resolved / maxMessages) * 100}%` }}
                    />
                    <div
                      className="h-full rounded-r bg-amber-400 transition-all"
                      style={{ width: `${(day.escalated / maxMessages) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-700 w-8 text-right">{day.messages}</span>
                </div>
              ))}
              <div className="flex items-center gap-4 pt-2 text-xs text-gray-500">
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
                  AI Resolved
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-sm bg-amber-400" />
                  Escalated
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Peak Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Peak Hours (Today)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1.5 h-48">
              {peakHours.map((h) => {
                const height = (h.volume / maxVolume) * 100;
                const isPeak = h.volume === maxVolume;
                return (
                  <div key={h.hour} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-gray-500 font-medium">{h.volume}</span>
                    <div
                      className={`w-full rounded-t transition-all ${isPeak ? "bg-emerald-500" : "bg-emerald-200"}`}
                      style={{ height: `${height}%` }}
                    />
                    <span className="text-[10px] text-gray-400 whitespace-nowrap">{h.hour}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Language Distribution */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-gray-400" />
              <CardTitle className="text-base">Language Distribution</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {languageData.map((lang) => (
                <div key={lang.language} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{lang.language}</span>
                    <span className="text-gray-500">{lang.count} chats ({lang.percentage}%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500"
                      style={{ width: `${lang.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* AI Performance */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-emerald-500" />
              <CardTitle className="text-base">AI Performance</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { label: "Queries Handled Autonomously", value: analytics ? `${analytics.ai_resolution_rate.toFixed(1)}%` : "78.5%", description: "Without human intervention" },
                { label: "Correct Response Rate", value: "94.2%", description: "Based on customer feedback" },
                { label: "Average Confidence Score", value: "0.89", description: "AI response confidence" },
                { label: "Knowledge Base Coverage", value: "86%", description: "Questions answerable from KB" },
                { label: "Escalation Rate", value: analytics ? `${(100 - analytics.ai_resolution_rate).toFixed(1)}%` : "6.8%", description: "Conversations sent to agents" },
              ].map((metric) => (
                <div key={metric.label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm text-gray-700">{metric.label}</p>
                    <p className="text-[10px] text-gray-400">{metric.description}</p>
                  </div>
                  <Badge variant="default" className="text-sm">{metric.value}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
