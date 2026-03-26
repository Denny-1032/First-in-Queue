"use client";

import { useState, useEffect, use } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Bot,
  Wifi,
  WifiOff,
  Key,
  Save,
  ToggleLeft,
  ToggleRight,
  MessageSquare,
  Shield,
  Brain,
  CheckCircle2,
  AlertCircle,
  Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import type { Tenant } from "@/types";

export default function AdminClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { toast } = useToast();
  const router = useRouter();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editable credentials
  const [waPhoneId, setWaPhoneId] = useState("");
  const [waToken, setWaToken] = useState("");
  const [waBusinessId, setWaBusinessId] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/admin/clients/${id}`);
        if (res.ok) {
          const data = await res.json();
          setTenant(data);
          setWaPhoneId(data.whatsapp_phone_number_id || "");
          setWaToken(data.whatsapp_access_token || "");
          setWaBusinessId(data.whatsapp_business_account_id || "");
          setOpenaiKey(data.openai_api_key || "");
        }
      } catch (e) {
        console.error("Failed to load client:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const saveCredentials = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/clients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          whatsapp_phone_number_id: waPhoneId,
          whatsapp_access_token: waToken,
          whatsapp_business_account_id: waBusinessId,
          openai_api_key: openaiKey,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTenant(updated);
        toast("Credentials saved successfully", "success");
      } else {
        toast("Failed to save credentials", "error");
      }
    } catch {
      toast("Network error", "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async () => {
    if (!tenant) return;
    try {
      const res = await fetch(`/api/admin/clients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !tenant.is_active }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTenant(updated);
        toast(`Client ${updated.is_active ? "activated" : "deactivated"}`, updated.is_active ? "success" : "warning");
      }
    } catch {
      toast("Failed to update status", "error");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-400">Client not found</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/admin/clients")}>
          Back to Clients
        </Button>
      </div>
    );
  }

  const setupComplete = !!(tenant.whatsapp_phone_number_id && tenant.whatsapp_access_token);
  const config = tenant.config || {};

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back + Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.push("/admin/clients")} className="p-2 rounded-lg hover:bg-slate-800 transition-colors">
          <ArrowLeft className="h-5 w-5 text-slate-400" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">{config.business_name || tenant.name}</h1>
          <p className="text-sm text-slate-400">{config.industry || "No industry"} &middot; Created {new Date(tenant.created_at).toLocaleDateString()}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={cn("text-xs border-0", tenant.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400")}>
            {tenant.is_active ? "Active" : "Inactive"}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleActive}
            className={cn("gap-1.5 border-slate-700 text-slate-300 hover:text-white", tenant.is_active ? "hover:bg-red-500/10 hover:border-red-500/30" : "hover:bg-emerald-500/10 hover:border-emerald-500/30")}
          >
            {tenant.is_active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
            {tenant.is_active ? "Deactivate" : "Activate"}
          </Button>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4 flex items-center gap-3">
            {setupComplete ? <Wifi className="h-5 w-5 text-emerald-400" /> : <WifiOff className="h-5 w-5 text-amber-400" />}
            <div>
              <p className="text-xs text-slate-500">WhatsApp</p>
              <p className={cn("text-sm font-medium", setupComplete ? "text-emerald-400" : "text-amber-400")}>
                {setupComplete ? "Connected" : "Pending"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4 flex items-center gap-3">
            <Bot className="h-5 w-5 text-purple-400" />
            <div>
              <p className="text-xs text-slate-500">Bot Name</p>
              <p className="text-sm font-medium text-white">{config.personality?.name || "Unnamed"}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4 flex items-center gap-3">
            <Brain className="h-5 w-5 text-blue-400" />
            <div>
              <p className="text-xs text-slate-500">Knowledge</p>
              <p className="text-sm font-medium text-white">{config.knowledge_base?.length || 0} entries</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4 flex items-center gap-3">
            <MessageSquare className="h-5 w-5 text-cyan-400" />
            <div>
              <p className="text-xs text-slate-500">FAQs</p>
              <p className="text-sm font-medium text-white">{config.faqs?.length || 0} items</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* WhatsApp Credentials — Admin Configures */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-green-400" />
            <CardTitle className="text-white">WhatsApp Connection</CardTitle>
          </div>
          <p className="text-xs text-slate-400 mt-1">Configure WhatsApp Business API credentials for this client. This is managed by FiQ — the client never sees these.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">Phone Number ID</label>
              <Input
                value={waPhoneId}
                onChange={(e) => setWaPhoneId(e.target.value)}
                placeholder="106xxxxxxxxx"
                className="bg-slate-800 border-slate-700 text-white font-mono text-xs placeholder:text-slate-600"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">Business Account ID</label>
              <Input
                value={waBusinessId}
                onChange={(e) => setWaBusinessId(e.target.value)}
                placeholder="Optional"
                className="bg-slate-800 border-slate-700 text-white font-mono text-xs placeholder:text-slate-600"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1.5 block">Access Token</label>
            <Input
              value={waToken}
              onChange={(e) => setWaToken(e.target.value)}
              placeholder="EAABsbCS..."
              type="password"
              className="bg-slate-800 border-slate-700 text-white font-mono text-xs placeholder:text-slate-600"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1.5 block">OpenAI API Key (optional — leave blank to use platform default)</label>
            <Input
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              placeholder="sk-proj-... (uses FiQ default if blank)"
              type="password"
              className="bg-slate-800 border-slate-700 text-white font-mono text-xs placeholder:text-slate-600"
            />
          </div>
          <Button
            onClick={saveCredentials}
            disabled={saving}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
          >
            {saving ? (
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "Saving..." : "Save Credentials"}
          </Button>
        </CardContent>
      </Card>

      {/* Business Config Summary — Read-only view for admin */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-400" />
            <CardTitle className="text-white">Business Configuration</CardTitle>
          </div>
          <p className="text-xs text-slate-400 mt-1">Client-managed settings — visible here for reference</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { label: "Business Name", value: config.business_name || "—" },
              { label: "Industry", value: config.industry || "—" },
              { label: "Bot Name", value: config.personality?.name || "—" },
              { label: "Tone", value: config.personality?.tone || "—" },
              { label: "Welcome Message", value: config.welcome_message || "—" },
              { label: "Languages", value: config.languages?.join(", ") || "English" },
              { label: "Knowledge Base", value: `${config.knowledge_base?.length || 0} entries` },
              { label: "FAQs", value: `${config.faqs?.length || 0} items` },
              { label: "Escalation Rules", value: `${config.escalation_rules?.length || 0} rules` },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between py-2 border-b border-slate-800/50 last:border-0">
                <span className="text-xs text-slate-500">{row.label}</span>
                <span className="text-sm text-slate-300">{row.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
