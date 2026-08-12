"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Settings,
  Phone,
  Key,
  Bell,
  Clock,
  Save,
  CreditCard,
  Building2,
  MessageSquare,
  Wallet,
  CalendarCheck,
  ChevronDown,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/dialogs";
import { CheckoutModal } from "@/components/dashboard/checkout-modal";
import { CreditPanel } from "@/components/dashboard/credit-panel";
import { PLANS } from "@/lib/lipila/plans";

const INDUSTRY_OPTIONS = [
  "ecommerce",
  "healthcare",
  "restaurant",
  "realestate",
  "education",
  "travel",
  "finance",
  "saas",
];

const LANGUAGE_OPTIONS = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "pt", name: "Portuguese" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "ar", name: "Arabic" },
  { code: "zh", name: "Chinese" },
  { code: "ja", name: "Japanese" },
  { code: "hi", name: "Hindi" },
];

/** Names while they fit on the trigger, a count once they do not. */
function languageSummary(codes: string[]): string {
  if (codes.length === 0) return "Select languages";
  const names = codes
    .map((c) => LANGUAGE_OPTIONS.find((l) => l.code === c)?.name)
    .filter(Boolean) as string[];
  if (names.length <= 3) return names.join(", ");
  return `${names.length} languages selected`;
}

const TABS = [
  { id: "business", label: "Business", icon: Building2 },
  { id: "messaging", label: "Messages & Hours", icon: MessageSquare },
  { id: "bookings", label: "Bookings", icon: CalendarCheck },
  { id: "billing", label: "Plan & Billing", icon: Wallet },
] as const;
type TabId = typeof TABS[number]["id"];

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsContent />
    </Suspense>
  );
}

function SettingsContent() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const [saving, setSaving] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);
  // Placeholders only until the saved config loads. They start empty rather than
  // as a fictional online store: whatever sits here is what an owner who never
  // touched the field ends up saving, and "My Store" selling with a shopping-bag
  // emoji is not true of a companies registry or a tax authority.
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [fallbackMessage, setFallbackMessage] = useState("");
  const [outsideHoursMsg, setOutsideHoursMsg] = useState("Thanks for reaching out! We're currently closed. We'll get back to you as soon as we're open.");
  const [languages, setLanguages] = useState<string[]>([]);
  const [whatsappConnected, setWhatsappConnected] = useState(false);
  const [currentPlanId, setCurrentPlanId] = useState("free");
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>("active");
  const [messagesUsed, setMessagesUsed] = useState(0);
  const [voiceMinutesUsed, setVoiceMinutesUsed] = useState(0);
  const [periodEnd, setPeriodEnd] = useState<string | null>(null);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutPlanId, setCheckoutPlanId] = useState("pro");
  // Which cycle a purchase from this page is billed on. There is no toggle
  // here any more - the cycle is chosen when the plan is bought - so an upgrade
  // simply stays on the cycle the tenant is already paying.
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("monthly");
  const [cancelling, setCancelling] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("business");

  const defaultSchedule = [
    { day: "Monday", open: "09:00", close: "18:00", enabled: true },
    { day: "Tuesday", open: "09:00", close: "18:00", enabled: true },
    { day: "Wednesday", open: "09:00", close: "18:00", enabled: true },
    { day: "Thursday", open: "09:00", close: "18:00", enabled: true },
    { day: "Friday", open: "09:00", close: "18:00", enabled: true },
    { day: "Saturday", open: "10:00", close: "14:00", enabled: true },
    { day: "Sunday", open: "", close: "", enabled: false },
  ];
  const [schedule, setSchedule] = useState(defaultSchedule);

  // Bookings tab
  const [bookingEnabled, setBookingEnabled] = useState(false);
  const [slotMinutes, setSlotMinutes] = useState("30");
  const [capacityPerSlot, setCapacityPerSlot] = useState("1");
  const [minNoticeHours, setMinNoticeHours] = useState("2");
  const [maxDaysAhead, setMaxDaysAhead] = useState("30");
  const [reminderTplEnabled, setReminderTplEnabled] = useState(false);
  const [reminderTplName, setReminderTplName] = useState("fiq_booking_reminder");
  const [reminderTplLanguage, setReminderTplLanguage] = useState("en");

  // Show toast if redirected after card payment
  const searchParams = useSearchParams();
  useEffect(() => {
    const payment = searchParams.get("payment");
    const plan = searchParams.get("plan");
    if (payment === "success") {
      toast(`Payment successful! Your ${plan || ""} plan is now active.`, "success");
      // Clean up URL params
      window.history.replaceState({}, "", "/dashboard/settings");
      return;
    }

    // Where /api/payments/confirm sends a customer back after paying for
    // usage credit by card.
    const topup = searchParams.get("topup");
    if (topup) {
      if (topup === "success") toast("Credit added. WhatsApp and voice are live again.", "success");
      else if (topup === "pending") toast("Payment received - your credit will appear shortly.", "info");
      else toast("That top-up did not go through. No money was taken.", "error");
      window.history.replaceState({}, "", "/dashboard/settings");
    }
  }, [searchParams, toast]);

  // Load tenant config from API
  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch("/api/tenants");
        if (!res.ok) return;
        const tenants = await res.json();
        if (tenants.length > 0) {
          const tenant = tenants[0];
          setTenantId(tenant.id);
          setWhatsappConnected(!!tenant.whatsapp_phone_number_id);
          const cfg = tenant.config;
          if (cfg) {
            if (cfg.business_name) setBusinessName(cfg.business_name);
            if (cfg.industry) setIndustry(cfg.industry);
            if (cfg.welcome_message) setWelcomeMessage(cfg.welcome_message);
            if (cfg.fallback_message) setFallbackMessage(cfg.fallback_message);
            if (cfg.operating_hours?.outside_hours_message) setOutsideHoursMsg(cfg.operating_hours.outside_hours_message);
            if (cfg.operating_hours?.schedule) setSchedule(cfg.operating_hours.schedule);
            if (cfg.languages?.length) setLanguages(cfg.languages);
            if (cfg.booking_settings) {
              setBookingEnabled(!!cfg.booking_settings.enabled);
              if (cfg.booking_settings.slot_minutes) setSlotMinutes(String(cfg.booking_settings.slot_minutes));
              if (cfg.booking_settings.capacity_per_slot) setCapacityPerSlot(String(cfg.booking_settings.capacity_per_slot));
              if (cfg.booking_settings.min_notice_hours != null) setMinNoticeHours(String(cfg.booking_settings.min_notice_hours));
              if (cfg.booking_settings.max_days_ahead) setMaxDaysAhead(String(cfg.booking_settings.max_days_ahead));
            }
            if (cfg.reminder_template) {
              setReminderTplEnabled(!!cfg.reminder_template.enabled);
              if (cfg.reminder_template.name) setReminderTplName(cfg.reminder_template.name);
              if (cfg.reminder_template.language) setReminderTplLanguage(cfg.reminder_template.language);
            }
          }
        }
      } catch { /* use defaults */ }
    }
    loadConfig();
  }, []);

  // Load subscription once tenantId is available
  useEffect(() => {
    if (!tenantId) return;
    async function loadSubscription() {
      try {
        const res = await fetch(`/api/subscriptions`);
        if (res.ok) {
          const data = await res.json();
          if (data.subscription) {
            setCurrentPlanId(data.subscription.plan_id);
            // The conversation meter is what the plan limit gates on (migration
            // 018). messages_used still ticks alongside it, but showing that
            // number against a conversation allowance would misreport usage.
            setMessagesUsed(data.subscription.conversations_used ?? 0);
            setVoiceMinutesUsed(data.subscription.voice_minutes_used || 0);
            setPeriodEnd(data.subscription.current_period_end);
            setSubscriptionStatus(data.subscription.status);
            setDaysRemaining(data.daysRemaining ?? null);
            // subscriptions has no billing_interval column (it lives on
            // payments), so infer it from the period length: anything longer
            // than two months is an annual cycle.
            const start = data.subscription.current_period_start;
            const end = data.subscription.current_period_end;
            if (start && end) {
              const days = (new Date(end).getTime() - new Date(start).getTime()) / 86_400_000;
              setBillingInterval(days > 60 ? "yearly" : "monthly");
            }
          }
        }
      } catch { /* use defaults */ }
    }
    loadSubscription();
  }, [tenantId]);

  const updateScheduleDay = (index: number, field: string, value: string | boolean) => {
    setSchedule((prev) => prev.map((d, i) => i === index ? { ...d, [field]: value } : d));
  };

  const handleSave = async () => {
    setSaving(true);
    if (tenantId) {
      try {
        const res = await fetch(`/api/tenants/${tenantId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: businessName,
            config: {
              business_name: businessName,
              industry,
              welcome_message: welcomeMessage,
              fallback_message: fallbackMessage,
              languages,
              operating_hours: { outside_hours_message: outsideHoursMsg, schedule },
              // Config merge is shallow - always send these as complete objects
              booking_settings: {
                enabled: bookingEnabled,
                slot_minutes: parseInt(slotMinutes) || 30,
                capacity_per_slot: parseInt(capacityPerSlot) || 1,
                min_notice_hours: parseInt(minNoticeHours) || 0,
                max_days_ahead: parseInt(maxDaysAhead) || 30,
              },
              reminder_template: {
                enabled: reminderTplEnabled,
                name: reminderTplName.trim(),
                language: reminderTplLanguage.trim() || "en",
              },
            },
          }),
        });
        if (res.ok) {
          toast("Settings saved successfully");
        } else {
          toast("Failed to save settings", "error");
        }
      } catch {
        toast("Failed to save settings", "error");
      }
    } else {
      toast("Unable to save - no business account found. Please log out and sign up again.", "error");
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header + Save */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 mt-1 text-sm">Configure your business</p>
        </div>
        {(activeTab === "business" || activeTab === "messaging" || activeTab === "bookings") && (
          <Button className="gap-2" disabled={saving} onClick={handleSave}>
            {saving ? (
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        )}
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all flex-1 justify-center",
                activeTab === tab.id
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="text-xs sm:text-sm">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── BUSINESS TAB ── */}
      {activeTab === "business" && (<>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-gray-600" />
              <CardTitle>Business Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Business Name</label>
              <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="max-w-md" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Industry</label>
              <Select value={industry} onValueChange={setIndustry}>
                <SelectTrigger className="max-w-md capitalize">
                  <SelectValue placeholder="Select an industry" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRY_OPTIONS.map((ind) => (
                    <SelectItem key={ind} value={ind} className="capitalize">
                      {ind}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Languages</label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex h-10 w-full max-w-md items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                  >
                    <span className={cn("truncate", languages.length === 0 && "text-gray-400")}>
                      {languageSummary(languages)}
                    </span>
                    <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <DropdownMenuCheckboxItem
                      key={lang.code}
                      checked={languages.includes(lang.code)}
                      // Radix closes on select by default; keep it open so several
                      // languages can be ticked in one go.
                      onSelect={(e) => e.preventDefault()}
                      onCheckedChange={(checked) =>
                        setLanguages((prev) =>
                          checked ? [...prev, lang.code] : prev.filter((l) => l !== lang.code)
                        )
                      }
                    >
                      {lang.name}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* WhatsApp connection. A status line, not a section - the number is
                provisioned by us, so there is nothing here to configure. */}
            <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-400 shrink-0" />
                <span className="text-sm font-medium text-gray-700">WhatsApp</span>
              </div>
              {whatsappConnected ? (
                <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Live
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                  Not connected yet - we&apos;ll email you when it&apos;s live
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </>)}

      {/* ── MESSAGES & HOURS TAB ── */}
      {activeTab === "messaging" && (<>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-blue-600" />
              <CardTitle>Auto-Reply Messages</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Welcome Message</label>
              <textarea
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[80px] resize-y"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Fallback Message</label>
              <textarea
                value={fallbackMessage}
                onChange={(e) => setFallbackMessage(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[60px] resize-y"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Outside Hours Message</label>
              <textarea
                value={outsideHoursMsg}
                onChange={(e) => setOutsideHoursMsg(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[60px] resize-y"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-600" />
              <CardTitle>Operating Hours</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {schedule.map((day) => (
                <div key={day.day} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <span className="text-sm text-gray-700 w-24 shrink-0">{day.day}</span>
                    <button
                      onClick={() => updateScheduleDay(schedule.indexOf(day), "enabled", !day.enabled)}
                      className={cn(
                        "w-12 h-6 rounded-full transition-colors relative shrink-0",
                        day.enabled ? "bg-emerald-500" : "bg-gray-200"
                      )}
                    >
                      <div className={cn(
                        "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                        day.enabled ? "translate-x-6" : "translate-x-0.5"
                      )} />
                    </button>
                    {!day.enabled && (
                      <span className="text-sm text-gray-400">Closed</span>
                    )}
                  </div>
                  {day.enabled && (
                    <div className="flex items-center gap-2">
                      <Input value={day.open} onChange={(e) => updateScheduleDay(schedule.indexOf(day), "open", e.target.value)} className="w-24 text-center" />
                      <span className="text-gray-400">to</span>
                      <Input value={day.close} onChange={(e) => updateScheduleDay(schedule.indexOf(day), "close", e.target.value)} className="w-24 text-center" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </>)}

      {/* ── BOOKINGS TAB ── */}
      {activeTab === "bookings" && (<>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-emerald-600" />
              <CardTitle>AI Booking</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between max-w-md">
              <div>
                <p className="text-sm font-medium text-gray-700">Enable AI booking</p>
                <p className="text-xs text-gray-500">Your WhatsApp assistant can check availability and book appointments in chat</p>
              </div>
              <button
                onClick={() => setBookingEnabled(!bookingEnabled)}
                className={cn(
                  "w-12 h-6 rounded-full transition-colors relative shrink-0",
                  bookingEnabled ? "bg-emerald-500" : "bg-gray-200"
                )}
              >
                <div className={cn(
                  "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                  bookingEnabled ? "translate-x-6" : "translate-x-0.5"
                )} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 max-w-md">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Slot length (minutes)</label>
                <Input type="number" value={slotMinutes} onChange={(e) => setSlotMinutes(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Capacity per slot</label>
                <Input type="number" value={capacityPerSlot} onChange={(e) => setCapacityPerSlot(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Min notice (hours)</label>
                <Input type="number" value={minNoticeHours} onChange={(e) => setMinNoticeHours(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Max days ahead</label>
                <Input type="number" value={maxDaysAhead} onChange={(e) => setMaxDaysAhead(e.target.value)} />
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Availability follows your operating hours in the Messages &amp; Hours tab. Booked appointments appear on the Bookings page.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-blue-600" />
              <CardTitle>Reminder Template (Meta)</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between max-w-md">
              <div>
                <p className="text-sm font-medium text-gray-700">Template fallback for reminders</p>
                <p className="text-xs text-gray-500">Used when a customer hasn&apos;t messaged in over 24 hours</p>
              </div>
              <button
                onClick={() => setReminderTplEnabled(!reminderTplEnabled)}
                className={cn(
                  "w-12 h-6 rounded-full transition-colors relative shrink-0",
                  reminderTplEnabled ? "bg-emerald-500" : "bg-gray-200"
                )}
              >
                <div className={cn(
                  "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                  reminderTplEnabled ? "translate-x-6" : "translate-x-0.5"
                )} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 max-w-md">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Template name</label>
                <Input value={reminderTplName} onChange={(e) => setReminderTplName(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Language code</label>
                <Input value={reminderTplLanguage} onChange={(e) => setReminderTplLanguage(e.target.value)} placeholder="en" />
              </div>
            </div>
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 text-xs text-gray-600 space-y-2">
              <p className="font-medium text-gray-700">One-time manual step - register this template in Meta Business Manager:</p>
              <p><span className="font-medium">Name:</span> fiq_booking_reminder &nbsp;·&nbsp; <span className="font-medium">Category:</span> Utility</p>
              <p><span className="font-medium">Body:</span> Hi {"{{1}}"}! This is a reminder from {"{{2}}"}: you have a booking scheduled for {"{{3}}"}. We look forward to seeing you.</p>
              <p><span className="font-medium">Buttons (Quick Reply):</span> 1. Confirm &nbsp; 2. Cancel - both buttons are required; reminders fail without them.</p>
              <p>WhatsApp Manager → Account Tools → Message Templates → Create Template. Approval usually takes minutes to a few hours.</p>
            </div>
          </CardContent>
        </Card>
      </>)}

      {/* ── PLAN & BILLING TAB ── */}
      {activeTab === "billing" && (<>
        {(() => {
          const currentPlan = PLANS.find((p) => p.id === currentPlanId) || PLANS[0];
          const messagesLimit = currentPlan.messagesPerMonth;
          const usagePercent = messagesLimit > 0 ? Math.min((messagesUsed / messagesLimit) * 100, 100) : 0;
          return (
            <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Key className="h-5 w-5 text-emerald-600" />
                  <CardTitle>Plan & Usage</CardTitle>
                </div>
                {subscriptionStatus === "expired" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-amber-700 border-amber-200 hover:bg-amber-50"
                    onClick={() => {
                      window.location.href = "/pricing?from=settings";
                    }}
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                    Renew Plan
                  </Button>
                )}
                {subscriptionStatus === "active" && currentPlanId !== "institution" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                    onClick={() => {
                      window.location.href = "/pricing?from=settings";
                    }}
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                    {currentPlanId === "free" ? "Upgrade" : "Change Plan"}
                  </Button>
                )}
                {subscriptionStatus === "active" && currentPlanId !== "free" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-red-700 border-red-200 hover:bg-red-50"
                    disabled={cancelling}
                    onClick={async () => {
                      const ok = await confirm({
                        title: "Cancel your subscription?",
                        description:
                          "You move to the free plan at the end of the current period. WhatsApp and voice stop; website chat keeps working.",
                        confirmLabel: "Cancel subscription",
                        cancelLabel: "Keep my plan",
                        tone: "danger",
                      });
                      if (!ok) return;
                      setCancelling(true);
                      try {
                        const res = await fetch("/api/subscriptions", { method: "DELETE" });
                        if (res.ok) {
                          toast("Subscription cancelled successfully", "success");
                          // Reload subscription data
                          const refreshRes = await fetch("/api/subscriptions");
                          if (refreshRes.ok) {
                            const data = await refreshRes.json();
                            if (data.subscription) {
                              setSubscriptionStatus(data.subscription.status);
                              setCurrentPlanId(data.subscription.plan_id);
                            }
                          }
                        } else {
                          const err = await res.json();
                          toast(err.error || "Failed to cancel subscription", "error");
                        }
                      } catch {
                        toast("Failed to cancel subscription", "error");
                      }
                      setCancelling(false);
                    }}
                  >
                    {cancelling ? (
                      <div className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <CreditCard className="h-3.5 w-3.5" />
                    )}
                    Cancel
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-700">Current Plan</p>
                  <p className="text-xs text-gray-500">First in Queue {currentPlan.name}</p>
                </div>
                <Badge 
                  variant={subscriptionStatus === "expired" ? "destructive" : subscriptionStatus === "active" ? "default" : "secondary"}
                  className={cn(
                    subscriptionStatus === "expired" && "bg-red-100 text-red-700 hover:bg-red-100",
                    daysRemaining !== null && daysRemaining <= 3 && subscriptionStatus === "active" && "bg-amber-100 text-amber-700 hover:bg-amber-100"
                  )}
                >
                  {subscriptionStatus === "active" ? (
                    daysRemaining !== null && currentPlanId !== "free" ? `${daysRemaining} days left` : "Active"
                  ) : subscriptionStatus === "expired" ? "Expired" : subscriptionStatus}
                </Badge>
              </div>
              {/* Under v2 a plan may bundle NO WhatsApp or voice at all - Pro
                  meters both from prepaid credit. A "0 / 0" bar would read as
                  an exhausted allowance rather than a different billing model,
                  so those plans get a sentence instead of a meter. */}
              <div className="py-3 border-b border-gray-100 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">WhatsApp Conversations This Month</p>
                    <p className="text-xs text-gray-500">
                      {messagesLimit > 0
                        ? "Counted once per 24-hour conversation, not per message"
                        : currentPlan.channelsUnlocked
                          ? "Billed from your usage credit, per message"
                          : "Not included on Free - upgrade to Pro to use WhatsApp"}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {messagesLimit > 0
                      ? `${messagesUsed.toLocaleString()} / ${messagesLimit.toLocaleString()}`
                      : currentPlan.channelsUnlocked
                        ? "Pay as you go"
                        : "Not included"}
                  </span>
                </div>
                {messagesLimit > 0 && (
                  <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        usagePercent > 80 ? "bg-red-500" : usagePercent > 60 ? "bg-amber-500" : "bg-emerald-500"
                      )}
                      style={{ width: `${usagePercent}%` }}
                    />
                  </div>
                )}
              </div>
              <div className="py-3 border-b border-gray-100 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Voice Minutes This Month</p>
                    <p className="text-xs text-gray-500">
                      {currentPlan.voiceMinutesPerMonth > 0
                        ? "AI phone call minutes used"
                        : currentPlan.channelsUnlocked
                          ? "Billed from your usage credit, per minute"
                          : "Not included on Free - upgrade to Pro to use voice"}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {currentPlan.voiceMinutesPerMonth > 0
                      ? `${voiceMinutesUsed.toLocaleString()} / ${currentPlan.voiceMinutesPerMonth.toLocaleString()}`
                      : currentPlan.channelsUnlocked
                        ? "Pay as you go"
                        : "Not included"}
                  </span>
                </div>
                {currentPlan.voiceMinutesPerMonth > 0 && (() => {
                  const voicePercent = Math.min(100, Math.round((voiceMinutesUsed / currentPlan.voiceMinutesPerMonth) * 100));
                  return (
                    <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          voicePercent > 80 ? "bg-red-500" : voicePercent > 60 ? "bg-amber-500" : "bg-purple-500"
                        )}
                        style={{ width: `${voicePercent}%` }}
                      />
                    </div>
                  );
                })()}
              </div>
              {periodEnd && currentPlanId !== "free" && (
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      {subscriptionStatus === "expired" ? "Expired On" : "Current Period Ends"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {subscriptionStatus === "expired" 
                        ? "Your plan has expired. Renew to continue using all features."
                        : daysRemaining !== null && daysRemaining <= 7 
                          ? `Expires in ${daysRemaining} days - renew soon to avoid interruption`
                          : "Billing cycle renews on this date"
                      }
                    </p>
                  </div>
                  <span className={cn(
                    "text-sm font-semibold",
                    subscriptionStatus === "expired" || (daysRemaining !== null && daysRemaining <= 3) ? "text-red-600" : "text-gray-900"
                  )}>
                    {new Date(periodEnd).toLocaleDateString("en-ZM", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
          );
        })()}
        <CreditPanel />
      </>)}

      {/* Checkout Modal */}
      {tenantId && (
        <CheckoutModal
          isOpen={checkoutOpen}
          onClose={() => setCheckoutOpen(false)}
          planId={checkoutPlanId}
          tenantId={tenantId}
          billingInterval={billingInterval}
        />
      )}
    </div>
  );
}
