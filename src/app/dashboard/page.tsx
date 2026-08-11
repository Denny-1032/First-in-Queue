"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { OnboardingWizard } from "@/components/dashboard/onboarding-wizard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  MessageSquare,
  Bot,
  CheckCircle2,
  Circle,
  Clock,
  Globe,
  Phone,
  RefreshCw,
  TrendingUp,
  Wallet,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
} from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";

// The dashboard home answers two questions and nothing else: what is happening
// right now, and what still needs me. Breakdowns and history live on
// /dashboard/analytics - putting them here made the page look busy while
// saying nothing about the last five minutes.

const LIVE_POLL_MS = 10_000;

interface LiveData {
  active_chats: number;
  waiting_chats: number;
  messages_today: number;
  messages_yesterday: number;
  voice_calls_today: number;
  answered_today: number;
  missed_today: number;
  recent: Array<{
    id: string;
    name: string | null;
    ref: string | null;
    channel: string;
    status: string;
    sentiment: string | null;
    last_message_at: string;
  }>;
  generated_at: string;
}

interface SetupItem {
  id: string;
  label: string;
  done: boolean;
  href: string | null;
}

interface SetupData {
  items: SetupItem[];
  done: number;
  total: number;
  percent: number;
}

interface CreditData {
  balanceLabel: string;
  balanceNgwee: number;
  daysRemaining: number | null;
  sampleSize: number;
}

export default function DashboardPage() {
  const [live, setLive] = useState<LiveData | null>(null);
  const [setup, setSetup] = useState<SetupData | null>(null);
  const [credit, setCredit] = useState<CreditData | null>(null);
  const [hourly, setHourly] = useState<Array<{ hour: number; count: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // First-time user check - verified server-side, not just from localStorage.
  useEffect(() => {
    if (localStorage.getItem("fiq-onboarding-complete")) return;
    fetch("/api/setup")
      .then((res) => res.json())
      .then((data) => {
        if (data.setup) localStorage.setItem("fiq-onboarding-complete", "true");
        else setShowOnboarding(true);
      })
      .catch(() => {
        /* never block the dashboard on this */
      });
  }, []);

  const fetchLive = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/live");
      if (res.ok) {
        setLive(await res.json());
        setLastUpdated(new Date());
      }
    } catch {
      /* transient - the next tick retries */
    }
  }, []);

  // Setup state and credit move on the scale of days, and the hourly curve is
  // the only thing the home page still needs from the heavier analytics read.
  const fetchSlow = useCallback(async () => {
    const [setupRes, creditRes, analyticsRes] = await Promise.allSettled([
      fetch("/api/dashboard/setup-status"),
      fetch("/api/credit"),
      fetch("/api/analytics"),
    ]);
    if (setupRes.status === "fulfilled" && setupRes.value.ok) setSetup(await setupRes.value.json());
    if (creditRes.status === "fulfilled" && creditRes.value.ok) setCredit(await creditRes.value.json());
    if (analyticsRes.status === "fulfilled" && analyticsRes.value.ok) {
      const data = await analyticsRes.value.json();
      setHourly(data.hourly_volume || []);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.all([fetchLive(), fetchSlow()]);
      if (!cancelled) setLoading(false);
    })();
    const id = setInterval(fetchLive, LIVE_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [fetchLive, fetchSlow]);

  if (showOnboarding) {
    return (
      <OnboardingWizard
        onComplete={() => {
          localStorage.setItem("fiq-onboarding-complete", "true");
          setShowOnboarding(false);
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  const messageDelta = deltaPercent(live?.messages_today ?? 0, live?.messages_yesterday ?? 0);
  const asked = (live?.answered_today ?? 0) + (live?.missed_today ?? 0);
  const answeredPercent = asked === 0 ? 0 : Math.round(((live?.answered_today ?? 0) / asked) * 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Welcome back</h1>
          <p className="text-gray-500 mt-1 text-sm">Here&apos;s what&apos;s happening right now</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Live &middot; updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => {
              setRefreshing(true);
              Promise.all([fetchLive(), fetchSlow()]).finally(() => setRefreshing(false));
            }}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>

      {/* Live strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <LiveTile
          href="/dashboard/conversations"
          title="Chats happening now"
          value={live?.active_chats ?? 0}
          icon={Zap}
          iconColor="bg-gradient-to-br from-amber-500 to-orange-600"
          pulse={(live?.active_chats ?? 0) > 0}
        />
        <LiveTile
          href="/dashboard/conversations?status=waiting"
          title="Waiting on your team"
          value={live?.waiting_chats ?? 0}
          icon={Clock}
          iconColor={
            (live?.waiting_chats ?? 0) > 0
              ? "bg-gradient-to-br from-red-500 to-rose-600"
              : "bg-gradient-to-br from-gray-400 to-gray-500"
          }
          note={(live?.waiting_chats ?? 0) > 0 ? "Needs a human" : "Nobody is queued"}
        />
        <LiveTile
          href="/dashboard/analytics"
          title="Messages today"
          value={live?.messages_today ?? 0}
          icon={MessageSquare}
          iconColor="bg-gradient-to-br from-blue-500 to-blue-600"
          delta={messageDelta}
        />
        <LiveTile
          href="/dashboard/voice"
          title="Voice calls today"
          value={live?.voice_calls_today ?? 0}
          icon={Phone}
          iconColor="bg-gradient-to-br from-purple-500 to-indigo-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity feed */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Latest conversations</CardTitle>
            <Link
              href="/dashboard/conversations"
              className="text-xs font-medium text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1"
            >
              See all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {!live?.recent.length ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <MessageSquare className="h-8 w-8 text-gray-300 mb-2" />
                <p className="text-sm text-gray-400">No conversations yet</p>
                <p className="text-xs text-gray-300 mt-1">
                  They&apos;ll appear here the moment a customer writes in
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {live.recent.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/dashboard/conversations?id=${c.id}`}
                      className="flex items-center gap-3 py-3 -mx-2 px-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                          c.channel === "web" ? "bg-blue-100 text-blue-600" : "bg-green-100 text-green-600"
                        )}
                      >
                        {c.channel === "web" ? (
                          <Globe className="h-4 w-4" />
                        ) : (
                          <MessageSquare className="h-4 w-4" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {c.name || displayRef(c.ref)}
                        </p>
                        <p className="text-xs text-gray-500 capitalize">
                          {c.channel === "web" ? "Website chat" : "WhatsApp"} &middot; {c.status}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">
                        {timeAgo(c.last_message_at)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Answered vs missed */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Answered today</CardTitle>
          </CardHeader>
          <CardContent>
            {asked === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <CheckCircle2 className="h-8 w-8 text-gray-300 mb-2" />
                <p className="text-sm text-gray-400">Nobody has written in today</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-3xl font-bold text-gray-900">{answeredPercent}%</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {live?.answered_today} of {asked} conversations got a reply
                  </p>
                </div>
                <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${answeredPercent}%` }}
                  />
                </div>
                {(live?.missed_today ?? 0) > 0 && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    {live?.missed_today} conversation{live?.missed_today === 1 ? "" : "s"} still
                    waiting for a first reply.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Today's curve + setup checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Messages through the day</CardTitle>
          </CardHeader>
          <CardContent>
            {hourly.every((h) => h.count === 0) ? (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                <TrendingUp className="h-8 w-8 text-gray-300 mb-2" />
                <p className="text-sm text-gray-400">Nothing today yet</p>
              </div>
            ) : (
              <div className="flex items-end gap-0.5 h-32">
                {hourly.map((h) => {
                  const max = Math.max(...hourly.map((x) => x.count), 1);
                  return (
                    <div
                      key={h.hour}
                      className="flex-1 group relative flex flex-col justify-end h-full"
                      title={`${formatHour(h.hour)} - ${h.count} messages`}
                    >
                      <div
                        className="w-full rounded-t bg-gradient-to-t from-emerald-500 to-teal-400 transition-all group-hover:opacity-80"
                        style={{ height: `${Math.max((h.count / max) * 100, 2)}%` }}
                      />
                    </div>
                  );
                })}
              </div>
            )}
            <div className="flex justify-between text-[10px] text-gray-400 mt-2">
              <span>12 AM</span>
              <span>12 PM</span>
              <span>11 PM</span>
            </div>
          </CardContent>
        </Card>

        {setup && setup.percent < 100 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Finish setting up</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-2xl font-bold text-gray-900">{setup.percent}%</span>
                  <span className="text-xs text-gray-500">
                    {setup.done} of {setup.total} done
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all"
                    style={{ width: `${setup.percent}%` }}
                  />
                </div>
              </div>
              <ul className="space-y-2">
                {setup.items.map((item) => {
                  const row = (
                    <span className="flex items-center gap-2 text-sm">
                      {item.done ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                      ) : (
                        <Circle className="h-4 w-4 shrink-0 text-gray-300" />
                      )}
                      <span className={cn(item.done ? "text-gray-400 line-through" : "text-gray-700")}>
                        {item.label}
                      </span>
                    </span>
                  );
                  return (
                    <li key={item.id}>
                      {item.done || !item.href ? (
                        row
                      ) : (
                        <Link href={item.href} className="hover:opacity-70 transition-opacity">
                          {row}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Credit - the thing that silently stops WhatsApp and voice */}
      {credit && (
        <Card>
          <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl",
                  credit.balanceNgwee <= 0 ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"
                )}
              >
                <Wallet className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Usage credit: {credit.balanceLabel}
                </p>
                <p className="text-xs text-gray-500">
                  {credit.balanceNgwee <= 0
                    ? "WhatsApp and voice are paused past your plan allowance."
                    : credit.daysRemaining !== null && credit.sampleSize >= 3
                    ? `At your usage, this lasts about ${credit.daysRemaining} days.`
                    : "Pays for WhatsApp and voice past your plan allowance."}
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/settings"
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors shrink-0"
            >
              Top up
              <ArrowRight className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickAction
          href="/dashboard/conversations"
          title="View Conversations"
          desc="See what your customers are saying"
          icon={MessageSquare}
          color="bg-blue-100 text-blue-600 group-hover:bg-blue-200"
        />
        <QuickAction
          href="/dashboard/ai-config"
          title="Customize Chat Agent"
          desc="Update knowledge base and FAQs"
          icon={Bot}
          color="bg-emerald-100 text-emerald-600 group-hover:bg-emerald-200"
        />
        <QuickAction
          href="/dashboard/voice"
          title="Voice Agent"
          desc="Answered calls and scheduled callbacks"
          icon={Phone}
          color="bg-purple-100 text-purple-600 group-hover:bg-purple-200"
        />
      </div>
    </div>
  );
}

function LiveTile({
  href,
  title,
  value,
  icon: Icon,
  iconColor,
  delta,
  note,
  pulse,
}: {
  href: string;
  title: string;
  value: number;
  icon: React.ElementType;
  iconColor: string;
  delta?: number | null;
  note?: string;
  pulse?: boolean;
}) {
  return (
    <Link href={href} className="block h-full">
      <Card className="h-full hover:shadow-md hover:border-emerald-200 transition-all">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-gray-500">{title}</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{value}</p>
              {delta !== undefined && delta !== null && (
                <div className="flex items-center gap-1 text-xs mt-1">
                  {delta >= 0 ? (
                    <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 text-red-500" />
                  )}
                  <span className={delta >= 0 ? "text-emerald-600" : "text-red-600"}>
                    {Math.abs(delta)}%
                  </span>
                  <span className="text-gray-400">vs yesterday</span>
                </div>
              )}
              {note && <p className="text-xs text-gray-400 mt-1">{note}</p>}
            </div>
            <span
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                iconColor,
                pulse && "animate-pulse"
              )}
            >
              <Icon className="h-5 w-5 text-white" />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function QuickAction({
  href,
  title,
  desc,
  icon: Icon,
  color,
}: {
  href: string;
  title: string;
  desc: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-emerald-200 transition-all group"
    >
      <div className="flex items-center gap-3">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg transition-colors", color)}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          <p className="text-xs text-gray-500">{desc}</p>
        </div>
      </div>
    </Link>
  );
}

/**
 * Change against yesterday. null when yesterday was silent - "+100%" off a base
 * of zero is noise, not a trend.
 */
function deltaPercent(today: number, yesterday: number): number | null {
  if (yesterday === 0) return null;
  return Math.round(((today - yesterday) / yesterday) * 100);
}

/** A phone number or visitor ref, shortened for a list row. */
function displayRef(ref: string | null): string {
  if (!ref) return "Website visitor";
  if (/^\+?\d[\d\s-]{5,}$/.test(ref)) return ref;
  return `Visitor ${ref.slice(0, 6)}`;
}

function formatHour(hour: number): string {
  const h = hour % 12 || 12;
  return `${h} ${hour < 12 ? "AM" : "PM"}`;
}
