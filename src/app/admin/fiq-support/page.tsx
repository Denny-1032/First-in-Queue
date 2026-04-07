"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Phone,
  Headphones,
  Save,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ExternalLink,
  Settings,
  Copy,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

interface VoiceAgent {
  id: string;
  name: string;
  is_active: boolean;
}

interface SupportCall {
  id: string;
  call_id: string;
  status: string;
  caller_number: string;
  created_at: string;
  recording_url?: string;
}

interface SupportConfig {
  id: string;
  support_phone_number: string | null;
  voice_agent_id: string | null;
  is_active: boolean;
  voice_agents?: VoiceAgent;
}

export default function FiQSupportAdminPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [config, setConfig] = useState<SupportConfig | null>(null);
  const [availableAgents, setAvailableAgents] = useState<VoiceAgent[]>([]);
  const [recentCalls, setRecentCalls] = useState<SupportCall[]>([]);
  
  // Form state
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/fiq-support");
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config);
        setAvailableAgents(data.availableAgents || []);
        setRecentCalls(data.recentCalls || []);
        
        if (data.config) {
          setPhoneNumber(data.config.support_phone_number || "");
          setSelectedAgent(data.config.voice_agent_id || "");
          setIsActive(data.config.is_active || false);
        }
      }
    } catch (err) {
      console.error("Failed to load FiQ support config:", err);
      toast("Failed to load configuration", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/fiq-support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: config?.id,
          supportPhoneNumber: phoneNumber || null,
          voiceAgentId: selectedAgent || null,
          isActive,
        }),
      });

      if (res.ok) {
        toast("FiQ support line configured successfully", "success");
        loadConfig();
      } else {
        const error = await res.json();
        toast(error.error || "Failed to save configuration", "error");
      }
    } catch (err) {
      toast("Failed to save configuration", "error");
    } finally {
      setSaving(false);
    }
  };

  const copyWebhookUrl = () => {
    const url = `${window.location.origin}/api/voice/fiq-support`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast("Webhook URL copied to clipboard", "success");
  };

  const isConfigured = phoneNumber && selectedAgent;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">FiQ Support Line</h1>
          <p className="text-gray-500 mt-1">Configure dedicated phone support for First in Queue</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving || !isConfigured}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Changes
        </Button>
      </div>

      {/* Status Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Headphones className="h-5 w-5 text-emerald-600" />
            <CardTitle>Support Line Status</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full",
                isConfigured ? "bg-emerald-100" : "bg-gray-100"
              )}>
                <Phone className={cn("h-5 w-5", isConfigured ? "text-emerald-600" : "text-gray-400")} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Phone Number</p>
                <Badge variant={phoneNumber ? "default" : "secondary"} className={phoneNumber ? "bg-emerald-100 text-emerald-700" : ""}>
                  {phoneNumber ? "Configured" : "Not Set"}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full",
                selectedAgent ? "bg-emerald-100" : "bg-amber-100"
              )}>
                <Settings className={cn("h-5 w-5", selectedAgent ? "text-emerald-600" : "text-amber-600")} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Voice Agent</p>
                <Badge variant={selectedAgent ? "default" : "secondary"} className={selectedAgent ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>
                  {selectedAgent ? "Selected" : "Not Selected"}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full",
                isActive && isConfigured ? "bg-emerald-100" : "bg-gray-100"
              )}>
                <CheckCircle2 className={cn("h-5 w-5", isActive && isConfigured ? "text-emerald-600" : "text-gray-400")} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Support Line</p>
                <Badge variant={isActive && isConfigured ? "default" : "secondary"} className={isActive && isConfigured ? "bg-emerald-100 text-emerald-700" : ""}>
                  {isActive && isConfigured ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-blue-600" />
            <CardTitle>Support Line Configuration</CardTitle>
          </div>
          <CardDescription>
            Set up your local phone number and assign a voice agent
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Phone Number */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">
              Support Phone Number
            </label>
            <Input
              id="phone"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+260xxxxxxxxx"
              className="max-w-xs"
            />
            <p className="text-xs text-gray-500 mt-1">
              Your local SIP trunk phone number in E.164 format (e.g., +26095xxxxxxx)
            </p>
          </div>

          {/* Voice Agent Selection */}
          <div>
            <label htmlFor="agent" className="block text-sm font-medium text-gray-700 mb-1.5">
              Voice Agent
            </label>
            <select
              id="agent"
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="block w-full max-w-xs rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">Select a voice agent...</option>
              {availableAgents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              The voice agent that will answer FiQ support calls
            </p>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            <label htmlFor="active" className="text-sm font-medium text-gray-700">
              Enable support line
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Webhook Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5 text-purple-600" />
            <CardTitle>SIP Trunk Webhook</CardTitle>
          </div>
          <CardDescription>
            Configure this webhook URL in your SIP trunk settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-gray-100 px-3 py-2 rounded text-sm font-mono text-gray-700">
              {typeof window !== "undefined" ? `${window.location.origin}/api/voice/fiq-support` : "Loading..."}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={copyWebhookUrl}
              className="gap-1.5"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">SIP Trunk Setup Required</p>
                <p className="text-xs text-amber-700 mt-1">
                  To receive calls, you must configure your local telecom provider to route calls to this webhook URL. 
                  Contact your telecom provider for SIP trunk configuration details.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Calls */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-gray-600" />
            <CardTitle>Recent Support Calls</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {recentCalls.length === 0 ? (
            <p className="text-sm text-gray-500">No support calls yet.</p>
          ) : (
            <div className="space-y-2">
              {recentCalls.map((call) => (
                <div key={call.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{call.caller_number || "Unknown"}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(call.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant={call.status === "completed" ? "default" : "secondary"}>
                    {call.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
