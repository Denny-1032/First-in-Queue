"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Settings,
  Key,
  Shield,
  Globe,
  Save,
  CheckCircle2,
  Server,
  Brain,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  // Platform-level settings (in production these would be stored in a settings table)
  const [platformOpenaiKey, setPlatformOpenaiKey] = useState(process.env.NEXT_PUBLIC_HAS_OPENAI === "true" ? "sk-••••••••" : "");
  const [webhookBaseUrl, setWebhookBaseUrl] = useState(typeof window !== "undefined" ? window.location.origin : "");
  const [maxMessagesPerTenant, setMaxMessagesPerTenant] = useState("10000");
  const [defaultModel, setDefaultModel] = useState("gpt-4o");

  const handleSave = async () => {
    setSaving(true);
    try {
      // Platform settings are managed via environment variables
      // This UI provides visibility but changes require redeployment
      await new Promise((r) => setTimeout(r, 400));
      toast("Platform settings are managed via environment variables. Update .env and redeploy to apply changes.", "info");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white">Platform Settings</h1>
        <p className="text-sm text-slate-400 mt-1">Global configuration for the First in Queue platform</p>
      </div>

      {/* Platform API Keys */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-amber-400" />
            <CardTitle className="text-white">Platform API Keys</CardTitle>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Default keys used when clients don&apos;t have their own. Set via environment variables for security.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1.5 block">Default OpenAI API Key</label>
            <Input
              value={platformOpenaiKey}
              onChange={(e) => setPlatformOpenaiKey(e.target.value)}
              placeholder="Set via OPENAI_API_KEY env variable"
              type="password"
              className="bg-slate-800 border-slate-700 text-white font-mono text-xs"
            />
            <p className="text-[10px] text-slate-500 mt-1">Used for all tenants that don&apos;t have a dedicated key</p>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1.5 block">Default AI Model</label>
            <div className="flex gap-2">
              {["gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo"].map((model) => (
                <button
                  key={model}
                  onClick={() => setDefaultModel(model)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    defaultModel === model
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600"
                  }`}
                >
                  {model}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Webhook Configuration */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-400" />
            <CardTitle className="text-white">Webhook Configuration</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1.5 block">Webhook Base URL</label>
            <Input
              value={webhookBaseUrl}
              onChange={(e) => setWebhookBaseUrl(e.target.value)}
              placeholder="https://your-domain.com"
              className="bg-slate-800 border-slate-700 text-white font-mono text-xs"
            />
          </div>
          <div className="rounded-lg bg-slate-800/50 p-3">
            <p className="text-xs text-slate-400 mb-2">Full webhook URL for WhatsApp:</p>
            <code className="text-xs text-emerald-400 font-mono">{webhookBaseUrl}/api/webhook</code>
          </div>
        </CardContent>
      </Card>

      {/* Limits */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-purple-400" />
            <CardTitle className="text-white">Limits & Quotas</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1.5 block">Max messages per tenant per month</label>
            <Input
              value={maxMessagesPerTenant}
              onChange={(e) => setMaxMessagesPerTenant(e.target.value)}
              type="number"
              className="bg-slate-800 border-slate-700 text-white max-w-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* System Info */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5 text-cyan-400" />
            <CardTitle className="text-white">System Information</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { label: "Platform", value: "First in Queue v1.0" },
              { label: "Framework", value: "Next.js 16 + React 19" },
              { label: "Database", value: "Supabase (PostgreSQL)" },
              { label: "AI Engine", value: `OpenAI ${defaultModel}` },
              { label: "Messaging", value: "WhatsApp Business Cloud API" },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between py-2 border-b border-slate-800/50 last:border-0">
                <span className="text-xs text-slate-500">{row.label}</span>
                <Badge className="bg-slate-800 text-slate-300 border-0 text-xs">{row.value}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <Button onClick={handleSave} disabled={saving} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
        {saving ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="h-4 w-4" />}
        {saving ? "Saving..." : "Save Settings"}
      </Button>
    </div>
  );
}
