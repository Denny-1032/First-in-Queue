"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Settings,
  Globe,
  Phone,
  Key,
  Bell,
  Shield,
  Clock,
  Save,
  Copy,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

export default function SettingsPage() {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("My Store");
  const [industry, setIndustry] = useState("ecommerce");
  const [welcomeMessage, setWelcomeMessage] = useState("Hey {customer_name}! Welcome to {business_name} 🛍️\nHow can I help you today?");
  const [fallbackMessage, setFallbackMessage] = useState("Sorry, something went wrong. Please try again or email support@mystore.com");
  const [outsideHoursMsg, setOutsideHoursMsg] = useState("Thanks for reaching out! We're currently closed. Our hours are Mon-Fri 9AM-6PM. We'll get back to you first thing!");
  const [languages, setLanguages] = useState(["en", "es"]);
  const [webhookUrl] = useState(typeof window !== "undefined" ? `${window.location.origin}/api/webhook` : "https://your-domain.com/api/webhook");
  const [copied, setCopied] = useState(false);
  const [whatsappConnected, setWhatsappConnected] = useState(false);

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
          }
        }
      } catch { /* use defaults */ }
    }
    loadConfig();
  }, []);

  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const updateScheduleDay = (index: number, field: string, value: string | boolean) => {
    setSchedule((prev) => prev.map((d, i) => i === index ? { ...d, [field]: value } : d));
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 mt-1">Configure your Wavely instance</p>
        </div>
        <Button
          className="gap-2"
          disabled={saving}
          onClick={async () => {
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
              await new Promise((r) => setTimeout(r, 500));
              toast("Settings saved (demo mode)");
            }
            setSaving(false);
          }}
        >
          {saving ? (
            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Business Info */}
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
            <div className="flex gap-2 flex-wrap">
              {["ecommerce", "healthcare", "restaurant", "realestate", "education", "travel", "finance", "saas"].map((ind) => (
                <button
                  key={ind}
                  onClick={() => setIndustry(ind)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize",
                    industry === ind
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-gray-100 text-gray-600 hover:bg-emerald-100 hover:text-emerald-700"
                  )}
                >
                  {ind}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Messages */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-600" />
            <CardTitle>Messages</CardTitle>
          </div>
          <CardDescription>Customize automated messages sent to customers</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">Welcome Message</label>
            <textarea
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[80px] resize-y"
            />
            <p className="text-xs text-gray-400 mt-1">Variables: {"{customer_name}"}, {"{business_name}"}</p>
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

      {/* Operating Hours */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-600" />
            <CardTitle>Operating Hours</CardTitle>
          </div>
          <CardDescription>Set when your business is available. Outside these hours, the outside-hours message is sent.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {schedule.map((day) => (
              <div key={day.day} className="flex items-center gap-4">
                <span className="text-sm text-gray-700 w-24">{day.day}</span>
                <button
                  onClick={() => updateScheduleDay(schedule.indexOf(day), "enabled", !day.enabled)}
                  className={cn(
                    "w-12 h-6 rounded-full transition-colors relative",
                    day.enabled ? "bg-emerald-500" : "bg-gray-200"
                  )}
                >
                  <div className={cn(
                    "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                    day.enabled ? "translate-x-6" : "translate-x-0.5"
                  )} />
                </button>
                {day.enabled ? (
                  <div className="flex items-center gap-2">
                    <Input value={day.open} onChange={(e) => updateScheduleDay(schedule.indexOf(day), "open", e.target.value)} className="w-24 text-center" />
                    <span className="text-gray-400">to</span>
                    <Input value={day.close} onChange={(e) => updateScheduleDay(schedule.indexOf(day), "close", e.target.value)} className="w-24 text-center" />
                  </div>
                ) : (
                  <span className="text-sm text-gray-400">Closed</span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Languages */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-emerald-600" />
            <CardTitle>Languages</CardTitle>
          </div>
          <CardDescription>The bot auto-detects and responds in the customer&apos;s language</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {[
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
            ].map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  setLanguages((prev) =>
                    prev.includes(lang.code) ? prev.filter((l) => l !== lang.code) : [...prev, lang.code]
                  );
                }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  languages.includes(lang.code)
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                )}
              >
                {lang.name}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* WhatsApp Connection */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-green-600" />
            <CardTitle>WhatsApp Connection</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {whatsappConnected ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-100">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <div>
                <p className="text-sm font-medium text-emerald-800">Connected</p>
                <p className="text-xs text-emerald-600">WhatsApp Business API configured via environment variables</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-100">
              <Clock className="h-5 w-5 text-amber-600 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">Not Connected</p>
                <p className="text-xs text-amber-600">Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in your .env file</p>
              </div>
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">Webhook URL</label>
            <div className="flex gap-2">
              <Input value={webhookUrl} readOnly className="flex-1 font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={copyWebhook}>
                {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Set this as your webhook URL in the{" "}
              <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline inline-flex items-center gap-0.5">
                Meta Developer Console <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* API Keys */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-amber-600" />
            <CardTitle>API Keys</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">WhatsApp Access Token</label>
            <Input type="password" value="EAABsbCS..." readOnly className="max-w-md font-mono text-xs" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">OpenAI API Key</label>
            <Input type="password" value="sk-proj-..." readOnly className="max-w-md font-mono text-xs" />
          </div>
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-100">
            <Shield className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">API keys are encrypted at rest and never exposed in the dashboard. Update them via environment variables.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
