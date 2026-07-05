"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Phone,
  PhoneCall,
  Settings,
  Save,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Globe,
  Zap,
  Shield,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

interface TelephonyConfig {
  twilio_account_sid?: string;
  twilio_auth_token?: string;
  twilio_voice_number?: string;
  retell_api_key?: string;
  retell_llm_id?: string;
  webhook_url?: string;
  sip_trunk_configured?: boolean;
}

export default function TelephonyAdminPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [config, setConfig] = useState<TelephonyConfig>({});
  
  // Form state
  const [twilioSid, setTwilioSid] = useState("");
  const [twilioToken, setTwilioToken] = useState("");
  const [twilioNumber, setTwilioNumber] = useState("");
  const [retellApiKey, setRetellApiKey] = useState("");
  const [retellLlmId, setRetellLlmId] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [sipTrunkConfigured, setSipTrunkConfigured] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/telephony");
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config || {});
        
        // Populate form fields
        setTwilioSid(data.config?.twilio_account_sid || "");
        setTwilioToken(data.config?.twilio_auth_token || "");
        setTwilioNumber(data.config?.twilio_voice_number || "");
        setRetellApiKey(data.config?.retell_api_key || "");
        setRetellLlmId(data.config?.retell_llm_id || "");
        setWebhookUrl(data.config?.webhook_url || "");
        setSipTrunkConfigured(data.config?.sip_trunk_configured || false);
      }
    } catch (err) {
      console.error("Failed to load telephony config:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/telephony", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          twilio_account_sid: twilioSid,
          twilio_auth_token: twilioToken,
          twilio_voice_number: twilioNumber,
          retell_api_key: retellApiKey,
          retell_llm_id: retellLlmId,
          webhook_url: webhookUrl,
          sip_trunk_configured: sipTrunkConfigured,
        }),
      });

      if (res.ok) {
        toast("Telephony configuration saved successfully");
        loadConfig();
      } else {
        const error = await res.json();
        toast(error.message || "Failed to save configuration", "error");
      }
    } catch (err) {
      toast("Failed to save configuration", "error");
    } finally {
      setSaving(false);
    }
  };

  const testConfiguration = async () => {
    setTesting(true);
    try {
      const res = await fetch("/api/admin/telephony/test", {
        method: "POST",
      });

      if (res.ok) {
        const data = await res.json();
        toast(`Configuration test: ${data.status}`, data.status === "success" ? "success" : "error");
      } else {
        toast("Configuration test failed", "error");
      }
    } catch (err) {
      toast("Failed to test configuration", "error");
    } finally {
      setTesting(false);
    }
  };

  const isConfigured = twilioSid && twilioToken && twilioNumber && retellApiKey && retellLlmId;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Telephony Configuration</h1>
          <p className="text-slate-400 mt-1">Configure voice calling infrastructure for all tenants</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={testConfiguration}
            disabled={testing || !isConfigured}
            className="gap-2 border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white"
          >
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            Test Config
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
        </div>
      ) : (
        <div className="grid gap-6">
          {/* Status Overview */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-400" />
                <CardTitle className="text-white">System Status</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full",
                    isConfigured ? "bg-emerald-500/15" : "bg-slate-800"
                  )}>
                    <Phone className={cn("h-5 w-5", isConfigured ? "text-emerald-400" : "text-slate-500")} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Voice Calling</p>
                    <Badge variant={isConfigured ? "default" : "secondary"} className={isConfigured ? "bg-emerald-500/15 text-emerald-400" : "bg-slate-800 text-slate-300"}>
                      {isConfigured ? "Configured" : "Not Configured"}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full",
                    sipTrunkConfigured ? "bg-emerald-500/15" : "bg-amber-500/15"
                  )}>
                    <PhoneCall className={cn("h-5 w-5", sipTrunkConfigured ? "text-emerald-400" : "text-amber-400")} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Inbound Calls</p>
                    <Badge variant={sipTrunkConfigured ? "default" : "secondary"} className={sipTrunkConfigured ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"}>
                      {sipTrunkConfigured ? "Active" : "Setup Required"}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/15">
                    <Globe className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Webhook URL</p>
                    <Badge variant={webhookUrl ? "default" : "secondary"} className={webhookUrl ? "bg-blue-500/15 text-blue-400" : "bg-slate-800 text-slate-300"}>
                      {webhookUrl ? "Set" : "Not Set"}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Twilio Configuration */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-purple-400" />
                <CardTitle className="text-white">Twilio Configuration</CardTitle>
              </div>
              <CardDescription className="text-slate-400">
                Configure Twilio for outbound calls and phone number management
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Account SID
                  </label>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    value={twilioSid}
                    onChange={(e) => setTwilioSid(e.target.value)}
                    placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="font-mono text-sm bg-slate-800 border-slate-700 text-white placeholder:text-slate-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Auth Token
                  </label>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    value={twilioToken}
                    onChange={(e) => setTwilioToken(e.target.value)}
                    placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="font-mono text-sm bg-slate-800 border-slate-700 text-white placeholder:text-slate-600"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Voice Number
                </label>
                <Input
                  value={twilioNumber}
                  onChange={(e) => setTwilioNumber(e.target.value)}
                  placeholder="+1234567890"
                  className="max-w-xs bg-slate-800 border-slate-700 text-white placeholder:text-slate-600"
                />
                <p className="text-xs text-slate-400 mt-1">
                  The Twilio phone number used for outbound calls
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Retell AI Configuration */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-emerald-400" />
                <CardTitle className="text-white">Retell AI Configuration</CardTitle>
              </div>
              <CardDescription className="text-slate-400">
                Configure Retell AI for voice agent processing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    API Key
                  </label>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    value={retellApiKey}
                    onChange={(e) => setRetellApiKey(e.target.value)}
                    placeholder="key_xxxxxxxxxxxxxxxx"
                    className="font-mono text-sm bg-slate-800 border-slate-700 text-white placeholder:text-slate-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    LLM ID
                  </label>
                  <Input
                    value={retellLlmId}
                    onChange={(e) => setRetellLlmId(e.target.value)}
                    placeholder="llm_xxxxxxxxxxxxxxxx"
                    className="font-mono text-sm bg-slate-800 border-slate-700 text-white placeholder:text-slate-600"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Inbound Call Setup */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <div className="flex items-center gap-2">
                <PhoneCall className="h-5 w-5 text-blue-400" />
                <CardTitle className="text-white">Inbound Call Configuration</CardTitle>
              </div>
              <CardDescription className="text-slate-400">
                Configure inbound call handling via SIP trunking
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Webhook URL
                </label>
                <Input
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://your-domain.com/api/voice/webhook"
                  className="font-mono text-sm bg-slate-800 border-slate-700 text-white placeholder:text-slate-600"
                />
                <p className="text-xs text-slate-400 mt-1">
                  The webhook URL that Retell AI will call for inbound calls
                </p>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="sipTrunk"
                  checked={sipTrunkConfigured}
                  onChange={(e) => setSipTrunkConfigured(e.target.checked)}
                  className="rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500"
                />
                <label htmlFor="sipTrunk" className="text-sm font-medium text-slate-300">
                  SIP Trunk Configured
                </label>
              </div>

              {!sipTrunkConfigured && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-amber-300">SIP Trunk Setup Required</p>
                      <p className="text-xs text-amber-400/90 mt-1">
                        To enable inbound calls, you need to configure Elastic SIP Trunking between Twilio and Retell AI.
                        <a 
                          href="https://docs.retellai.com/guide/inbound-call" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 ml-1 text-amber-300 hover:text-amber-200 underline"
                        >
                          View setup guide <ExternalLink className="h-3 w-3" />
                        </a>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {sipTrunkConfigured && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-emerald-300">Inbound Calls Active</p>
                      <p className="text-xs text-emerald-400/90 mt-1">
                        AI voice agents will automatically answer incoming calls to WhatsApp-enabled phone numbers.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
