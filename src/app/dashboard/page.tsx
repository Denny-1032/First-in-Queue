"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { OnboardingWizard } from "@/components/dashboard/onboarding-wizard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Bot,
  TrendingUp,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Smile,
  Meh,
  Frown,
  Zap,
  RefreshCw,
  Phone,
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
    <Card className="h-full">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">{value}</p>
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

const emptyAnalytics: AnalyticsData = {
  total_conversations: 0,
  active_conversations: 0,
  resolved_conversations: 0,
  avg_response_time_seconds: 0,
  avg_resolution_time_seconds: 0,
  ai_resolution_rate: 0,
  customer_satisfaction: 0,
  messages_today: 0,
  messages_this_week: 0,
  top_topics: [],
  sentiment_breakdown: { positive: 0, neutral: 0, negative: 0 },
  hourly_volume: [],
  daily_volume: [],
};

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Check if first-time user — verify server-side, not just localStorage
  useEffect(() => {
    const completed = localStorage.getItem("fiq-onboarding-complete");
    if (completed) return; // Already done locally
    // Check if tenant exists on server
    fetch("/api/setup")
      .then((res) => res.json())
      .then((data) => {
        if (data.setup) {
          // Tenant exists — mark onboarding complete so we don't ask again
          localStorage.setItem("fiq-onboarding-complete", "true");
        } else {
          setShowOnboarding(true);
        }
      })
      .catch(() => {
        // On error, don't block the dashboard
      });
  }, []);

  const handleOnboardingComplete = () => {
    localStorage.setItem("fiq-onboarding-complete", "true");
    setShowOnboarding(false);
  };

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
      // API unavailable — show empty state
    }
    setAnalytics((prev) => prev || emptyAnalytics);
    setLastUpdated(new Date());
    if (isRefresh) setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchAnalytics().finally(() => setLoading(false));
    // Auto-refresh every 30 seconds for real-time stats
    const interval = setInterval(() => fetchAnalytics(), 30000);
    return () => clearInterval(interval);
  }, [fetchAnalytics]);

  if (showOnboarding) {
    return <OnboardingWizard onComplete={handleOnboardingComplete} />;
  }

  if (loading || !analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Welcome back</h1>
          <p className="text-gray-500 mt-1 text-sm">Here&apos;s how your AI assistant is doing</p>
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

      {/* Stats Grid — 4 key metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Messages Today"
          value={analytics.messages_today}
          change="8%"
          changeType="up"
          icon={MessageSquare}
          iconColor="bg-gradient-to-br from-blue-500 to-blue-600"
        />
        <StatCard
          title="Handled by AI"
          value={`${analytics.ai_resolution_rate}%`}
          change="3.2%"
          changeType="up"
          icon={Bot}
          iconColor="bg-gradient-to-br from-emerald-500 to-teal-600"
        />
        <StatCard
          title="Active Chats"
          value={analytics.active_conversations}
          icon={Zap}
          iconColor="bg-gradient-to-br from-amber-500 to-orange-600"
        />
        <div 
          onClick={() => window.location.href = '/dashboard/voice'}
          className="cursor-pointer h-full"
        >
          <StatCard
            title="Voice Calls"
            value="View"
            icon={Phone}
            iconColor="bg-gradient-to-br from-purple-500 to-indigo-600"
          />
        </div>
      </div>

      {/* Second Row — 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Sentiment */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">How customers are feeling</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smile className="h-5 w-5 text-emerald-500" />
                  <span className="text-sm text-gray-600">Happy</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${analytics.sentiment_breakdown.positive}%` }} />
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-10 text-right">{analytics.sentiment_breakdown.positive}%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Meh className="h-5 w-5 text-amber-500" />
                  <span className="text-sm text-gray-600">Neutral</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full bg-amber-500" style={{ width: `${analytics.sentiment_breakdown.neutral}%` }} />
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-10 text-right">{analytics.sentiment_breakdown.neutral}%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Frown className="h-5 w-5 text-red-500" />
                  <span className="text-sm text-gray-600">Unhappy</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full bg-red-500" style={{ width: `${analytics.sentiment_breakdown.negative}%` }} />
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-10 text-right">{analytics.sentiment_breakdown.negative}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* What customers ask about */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">What customers ask about</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.top_topics.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <MessageSquare className="h-8 w-8 text-gray-300 mb-2" />
                <p className="text-sm text-gray-400">No topics yet</p>
                <p className="text-xs text-gray-300 mt-1">Topics will appear as conversations come in</p>
              </div>
            ) : (
              <div className="space-y-3">
                {analytics.top_topics.map((topic, i) => (
                  <div key={topic.topic} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600">{i + 1}</span>
                      <span className="text-sm text-gray-700">{topic.topic}</span>
                    </div>
                    <Badge variant="secondary">{topic.count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Weekly Message Volume */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Messages this week</CardTitle>
        </CardHeader>
        <CardContent>
          {analytics.daily_volume.every((d) => d.count === 0) ? (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <TrendingUp className="h-8 w-8 text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">No messages this week</p>
              <p className="text-xs text-gray-300 mt-1">The chart will populate as messages flow in</p>
            </div>
          ) : (
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
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/dashboard/conversations" className="rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-emerald-200 transition-all group">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 group-hover:bg-blue-200 transition-colors">
              <MessageSquare className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">View Conversations</p>
              <p className="text-xs text-gray-500">See what your customers are saying</p>
            </div>
          </div>
        </Link>
        <Link href="/dashboard/ai-config" className="rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-emerald-200 transition-all group">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 group-hover:bg-emerald-200 transition-colors">
              <Bot className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Customize Chat Agent</p>
              <p className="text-xs text-gray-500">Update knowledge base and FAQs</p>
            </div>
          </div>
        </Link>
        <Link href="/dashboard/voice" className="rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-emerald-200 transition-all group">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 group-hover:bg-purple-200 transition-colors">
              <Phone className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Voice Agent</p>
              <p className="text-xs text-gray-500">AI phone calls and scheduled calls</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
