"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Wifi,
  WifiOff,
  Building2,
  Save,
  Search,
  Phone,
  Key,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

interface ClientRow {
  id: string;
  name: string;
  config: { business_name?: string; industry?: string };
  is_active: boolean;
  setup_complete: boolean;
  whatsapp_phone_number_id: string;
  whatsapp_access_token: string;
  whatsapp_business_account_id: string;
  openai_api_key: string;
}

export default function AdminConnectionsPage() {
  const { toast } = useToast();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ phoneId: "", token: "", businessId: "", openaiKey: "" });
  const [saving, setSaving] = useState(false);

  const loadClients = async () => {
    try {
      const res = await fetch("/api/admin/clients");
      if (res.ok) setClients(await res.json());
    } catch (e) {
      console.error("Failed to load:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadClients(); }, []);

  const startEdit = (client: ClientRow) => {
    setEditingId(client.id);
    setEditForm({
      phoneId: client.whatsapp_phone_number_id || "",
      token: client.whatsapp_access_token || "",
      businessId: client.whatsapp_business_account_id || "",
      openaiKey: client.openai_api_key || "",
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/clients/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          whatsapp_phone_number_id: editForm.phoneId,
          whatsapp_access_token: editForm.token,
          whatsapp_business_account_id: editForm.businessId,
          openai_api_key: editForm.openaiKey,
        }),
      });
      if (res.ok) {
        toast("Connection saved", "success");
        setEditingId(null);
        loadClients();
      } else {
        toast("Failed to save", "error");
      }
    } catch {
      toast("Network error", "error");
    } finally {
      setSaving(false);
    }
  };

  const filtered = clients.filter((c) => {
    const name = (c.config?.business_name || c.name || "").toLowerCase();
    return !search || name.includes(search.toLowerCase());
  });

  const connected = clients.filter((c) => c.setup_complete).length;
  const disconnected = clients.filter((c) => !c.setup_complete).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white">WhatsApp Connections</h1>
        <p className="text-sm text-slate-400 mt-1">Manage WhatsApp Business API credentials for each client</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 max-w-lg">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4 flex items-center gap-3">
            <Wifi className="h-5 w-5 text-emerald-400" />
            <div>
              <p className="text-xl font-bold text-white">{connected}</p>
              <p className="text-xs text-slate-400">Connected</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4 flex items-center gap-3">
            <WifiOff className="h-5 w-5 text-amber-400" />
            <div>
              <p className="text-xl font-bold text-white">{disconnected}</p>
              <p className="text-xs text-slate-400">Pending</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search clients..."
          className="pl-9 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
        />
      </div>

      {/* Connection List */}
      <div className="space-y-4">
        {filtered.map((client) => (
          <Card key={client.id} className="bg-slate-900 border-slate-800">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-slate-800 flex items-center justify-center">
                    <Building2 className="h-4 w-4 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{client.config?.business_name || client.name}</p>
                    <p className="text-xs text-slate-500">{client.config?.industry || "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {client.setup_complete ? (
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-0 text-xs gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Connected
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-500/10 text-amber-400 border-0 text-xs gap-1">
                      <AlertCircle className="h-3 w-3" /> Not Connected
                    </Badge>
                  )}
                  {editingId !== client.id && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEdit(client)}
                      className="text-xs border-slate-700 text-slate-300"
                    >
                      {client.setup_complete ? "Edit" : "Configure"}
                    </Button>
                  )}
                </div>
              </div>

              {/* Inline Edit Form */}
              {editingId === client.id && (
                <div className="border-t border-slate-800 pt-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Phone Number ID</label>
                      <Input
                        value={editForm.phoneId}
                        onChange={(e) => setEditForm({ ...editForm, phoneId: e.target.value })}
                        placeholder="106xxxxxxxxx"
                        className="bg-slate-800 border-slate-700 text-white font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Business Account ID</label>
                      <Input
                        value={editForm.businessId}
                        onChange={(e) => setEditForm({ ...editForm, businessId: e.target.value })}
                        placeholder="Optional"
                        className="bg-slate-800 border-slate-700 text-white font-mono text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Access Token</label>
                    <Input
                      value={editForm.token}
                      onChange={(e) => setEditForm({ ...editForm, token: e.target.value })}
                      placeholder="EAABsbCS..."
                      type="password"
                      className="bg-slate-800 border-slate-700 text-white font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">OpenAI Key (blank = platform default)</label>
                    <Input
                      value={editForm.openaiKey}
                      onChange={(e) => setEditForm({ ...editForm, openaiKey: e.target.value })}
                      placeholder="sk-proj-..."
                      type="password"
                      className="bg-slate-800 border-slate-700 text-white font-mono text-xs"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={saveEdit} disabled={saving} size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
                      {saving ? <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      {saving ? "Saving..." : "Save"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setEditingId(null)} className="border-slate-700 text-slate-300">
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Show current status when not editing */}
              {editingId !== client.id && client.setup_complete && (
                <div className="flex items-center gap-4 text-xs text-slate-500 border-t border-slate-800/50 pt-3 mt-2">
                  <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> Phone: ••••{client.whatsapp_phone_number_id?.slice(-4) || "—"}</span>
                  <span className="flex items-center gap-1"><Key className="h-3 w-3" /> Token: ••••{client.whatsapp_access_token?.slice(-4) || "—"}</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
