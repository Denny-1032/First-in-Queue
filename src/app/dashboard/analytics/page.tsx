"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
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
    } catch { /* API unavailable */ }
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
    : [];

  const peakHours = analytics?.hourly_volume?.length
    ? analytics.hourly_volume.map((h) => ({ hour: `${h.hour % 12 || 12} ${h.hour < 12 ? "AM" : "PM"}`, volume: h.count }))
    : [];

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-500 mt-1 text-sm">Deep insights into your customer care performance</p>
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: "Total Messages", value: analytics ? analytics.messages_this_week.toLocaleString() : "0", icon: MessageSquare, color: "text-blue-600" },
          { label: "AI Resolution", value: analytics ? `${analytics.ai_resolution_rate.toFixed(1)}%` : "0%", icon: Bot, color: "text-emerald-600" },
          { label: "Active Convos", value: analytics ? String(analytics.active_conversations) : "0", icon: Users, color: "text-purple-600" },
          { label: "Avg First Reply", value: analytics ? `${analytics.avg_response_time_seconds}s` : "0s", icon: Zap, color: "text-amber-600" },
          { label: "Resolved", value: analytics ? analytics.resolved_conversations.toLocaleString() : "0", icon: CheckCircle2, color: "text-emerald-600" },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
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
            {peakHours.every((h) => h.volume === 0) ? (
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <Clock className="h-8 w-8 text-gray-300 mb-2" />
                <p className="text-sm text-gray-400">No activity today</p>
                <p className="text-xs text-gray-300 mt-1">Hourly data will appear as messages arrive</p>
              </div>
            ) : (
            <div className="flex items-end gap-1 h-48">
              {peakHours.map((h, idx) => {
                const height = (h.volume / maxVolume) * 100;
                const isPeak = h.volume === maxVolume;
                const showLabel = idx % 3 === 0;
                return (
                  <div key={h.hour} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <span className="text-[10px] text-gray-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">{h.volume}</span>
                    <div
                      className={`w-full rounded-t transition-all group-hover:opacity-80 ${isPeak ? "bg-emerald-500" : "bg-emerald-200"}`}
                      style={{ height: `${Math.max(height, 2)}%` }}
                    />
                    {showLabel ? (
                      <span className="text-[10px] text-gray-400 whitespace-nowrap">{h.hour}</span>
                    ) : (
                      <span className="text-[10px] text-transparent">&nbsp;</span>
                    )}
                  </div>
                );
              })}
            </div>
            )}
          </CardContent>
        </Card>

        {/* Language Distribution */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-gray-400" />
              <CardTitle className="text-base">Topic Insights</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics?.top_topics?.length ? (
                analytics.top_topics.map((topic) => {
                  const maxCount = Math.max(...analytics.top_topics.map((t) => t.count), 1);
                  return (
                    <div key={topic.topic} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">{topic.topic}</span>
                        <span className="text-gray-500">{topic.count} chats</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500"
                          style={{ width: `${(topic.count / maxCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">No topic data yet. Start conversations to see insights.</p>
              )}
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
                { label: "Queries Handled Autonomously", value: analytics ? `${analytics.ai_resolution_rate.toFixed(1)}%` : "0%", description: "Without human intervention" },
                { label: "Total Conversations", value: analytics ? String(analytics.total_conversations) : "0", description: "All-time conversations" },
                { label: "Avg Resolution Time", value: analytics ? `${Math.round(analytics.avg_resolution_time_seconds / 60)}m` : "0m", description: "Time to resolve" },
                { label: "Customer Satisfaction", value: analytics ? `${analytics.customer_satisfaction}/5` : "0/5", description: "Based on customer feedback" },
                { label: "Escalation Rate", value: analytics ? `${(100 - analytics.ai_resolution_rate).toFixed(1)}%` : "0%", description: "Conversations sent to agents" },
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
