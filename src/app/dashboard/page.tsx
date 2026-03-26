"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Users,
  Bot,
  TrendingUp,
  Clock,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Smile,
  Meh,
  Frown,
  Zap,
  RefreshCw,
} from "lucide-react";
import type { AnalyticsData } from "@/types";

function StatCard({
  title,
  value,
  change,
  changeType,
  icon: Icon,
  iconColor,
}: {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "up" | "down";
  icon: React.ElementType;
  iconColor: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            {change && (
              <div className="flex items-center gap-1 text-xs">
                {changeType === "up" ? (
                  <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-red-500" />
                )}
                <span className={changeType === "up" ? "text-emerald-600" : "text-red-600"}>
                  {change}
                </span>
                <span className="text-gray-400">vs last week</span>
              </div>
            )}
          </div>
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconColor}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const mockAnalytics: AnalyticsData = {
  total_conversations: 1284,
  active_conversations: 47,
  resolved_conversations: 1189,
  avg_response_time_seconds: 12,
  avg_resolution_time_seconds: 340,
  ai_resolution_rate: 78.5,
  customer_satisfaction: 4.6,
  messages_today: 342,
  messages_this_week: 2156,
  top_topics: [
    { topic: "Order Status", count: 234 },
    { topic: "Returns & Refunds", count: 189 },
    { topic: "Product Inquiry", count: 156 },
    { topic: "Shipping", count: 134 },
    { topic: "Account Issues", count: 98 },
  ],
  sentiment_breakdown: { positive: 62, neutral: 28, negative: 10 },
  hourly_volume: Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    count: Math.floor(Math.random() * 30) + 5,
  })),
  daily_volume: Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return { date: d.toISOString().slice(0, 10), count: Math.floor(Math.random() * 400) + 200 };
  }),
};

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchAnalytics = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/analytics");
      if (res.ok) {
        const data = await res.json();
        if (data && data.total_conversations !== undefined) {
          setAnalytics(data);
          setLastUpdated(new Date());
          return;
        }
      }
    } catch {
      // API unavailable, use mock data
    }
    setAnalytics(mockAnalytics);
    setLastUpdated(new Date());
    if (isRefresh) setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchAnalytics().finally(() => setLoading(false));
  }, [fetchAnalytics]);

  if (loading || !analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Overview of your customer care performance</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-gray-400">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => fetchAnalytics(true).finally(() => setRefreshing(false))}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Active Conversations"
          value={analytics.active_conversations}
          change="12%"
          changeType="up"
          icon={MessageSquare}
          iconColor="bg-gradient-to-br from-blue-500 to-blue-600"
        />
        <StatCard
          title="Messages Today"
          value={analytics.messages_today}
          change="8%"
          changeType="up"
          icon={Zap}
          iconColor="bg-gradient-to-br from-amber-500 to-orange-600"
        />
        <StatCard
          title="AI Resolution Rate"
          value={`${analytics.ai_resolution_rate}%`}
          change="3.2%"
          changeType="up"
          icon={Bot}
          iconColor="bg-gradient-to-br from-emerald-500 to-teal-600"
        />
        <StatCard
          title="Avg Response Time"
          value={`${analytics.avg_response_time_seconds}s`}
          change="15%"
          changeType="up"
          icon={Clock}
          iconColor="bg-gradient-to-br from-purple-500 to-violet-600"
        />
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sentiment Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Customer Sentiment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smile className="h-5 w-5 text-emerald-500" />
                  <span className="text-sm text-gray-600">Positive</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${analytics.sentiment_breakdown.positive}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-10 text-right">
                    {analytics.sentiment_breakdown.positive}%
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Meh className="h-5 w-5 text-amber-500" />
                  <span className="text-sm text-gray-600">Neutral</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-500"
                      style={{ width: `${analytics.sentiment_breakdown.neutral}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-10 text-right">
                    {analytics.sentiment_breakdown.neutral}%
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Frown className="h-5 w-5 text-red-500" />
                  <span className="text-sm text-gray-600">Negative</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-red-500"
                      style={{ width: `${analytics.sentiment_breakdown.negative}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-10 text-right">
                    {analytics.sentiment_breakdown.negative}%
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Topics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Topics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.top_topics.map((topic, i) => (
                <div key={topic.topic} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600">
                      {i + 1}
                    </span>
                    <span className="text-sm text-gray-700">{topic.topic}</span>
                  </div>
                  <Badge variant="secondary">{topic.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm text-gray-600">Resolved</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{analytics.resolved_conversations.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-500" />
                  <span className="text-sm text-gray-600">Total Conversations</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{analytics.total_conversations.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-purple-500" />
                  <span className="text-sm text-gray-600">Messages This Week</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{analytics.messages_this_week.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  <span className="text-sm text-gray-600">Avg Resolution</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {Math.floor(analytics.avg_resolution_time_seconds / 60)}m {analytics.avg_resolution_time_seconds % 60}s
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Message Volume Chart (simplified bar chart) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Weekly Message Volume</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-40">
            {analytics.daily_volume.map((day, idx) => {
              const maxCount = Math.max(...analytics.daily_volume.map((d) => d.count), 1);
              const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
              const parsed = new Date(day.date);
              const dayName = isNaN(parsed.getTime()) ? day.date : parsed.toLocaleDateString("en", { weekday: "short" });
              return (
                <div key={`${day.date}-${idx}`} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-gray-500 font-medium">{day.count}</span>
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-emerald-500 to-teal-400 transition-all duration-300"
                    style={{ height: `${Math.max(height, 2)}%` }}
                  />
                  <span className="text-xs text-gray-400">{dayName}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
