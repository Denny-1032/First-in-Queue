"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  ClipboardList,
  Building2,
  ArrowRight,
  Wifi,
  WifiOff,
  Clock,
  CheckCircle2,
  Search,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

interface ClientRow {
  id: string;
  name: string;
  config: { business_name?: string; industry?: string; personality?: { name?: string }; customer_whatsapp?: string };
  is_active: boolean;
  setup_complete: boolean;
  whatsapp_phone_number_id: string;
  whatsapp_access_token: string;
  created_at: string;
}

export default function AdminOnboardingPage() {
  const { toast } = useToast();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/clients");
        if (res.ok) {
          const all = await res.json();
          setClients(all);
        }
      } catch (e) {
        console.error("Failed to load:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const pending = clients.filter((c) => !c.setup_complete);
  const completed = clients.filter((c) => c.setup_complete);

  const filteredPending = pending.filter((c) => {
    const name = (c.config?.business_name || c.name || "").toLowerCase();
    return !search || name.includes(search.toLowerCase());
  });

  // Quick activate: mark as active after setting up credentials
  const quickActivate = async (clientId: string) => {
    try {
      const res = await fetch(`/api/admin/clients/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: true }),
      });
      if (res.ok) {
        toast("Client activated", "success");
        // Reload
        const all = await (await fetch("/api/admin/clients")).json();
        setClients(all);
      }
    } catch {
      toast("Failed to activate", "error");
    }
  };

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
        <h1 className="text-xl sm:text-2xl font-bold text-white">Onboarding Queue</h1>
        <p className="text-sm text-slate-400 mt-1">New clients awaiting WhatsApp setup and activation</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{pending.length}</p>
              <p className="text-xs text-slate-400">Pending Setup</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{completed.length}</p>
              <p className="text-xs text-slate-400">Completed</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Zap className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{clients.length}</p>
              <p className="text-xs text-slate-400">Total Clients</p>
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
          placeholder="Search pending clients..."
          className="pl-9 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
        />
      </div>

      {/* Pending Queue */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-amber-400" />
            <CardTitle className="text-white">Awaiting Setup</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {filteredPending.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="h-12 w-12 text-emerald-500/30 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">All caught up! No pending setups.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPending.map((client) => {
                const daysSinceSignup = Math.floor((Date.now() - new Date(client.created_at).getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <div
                    key={client.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-slate-700 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-slate-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{client.config?.business_name || client.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-slate-500">{client.config?.industry || "—"}</span>
                          {client.config?.customer_whatsapp && (
                            <>
                              <span className="text-slate-700">&middot;</span>
                              <span className="text-xs text-slate-400">📱 {client.config.customer_whatsapp}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={cn(
                        "text-[10px] border-0",
                        daysSinceSignup > 2 ? "bg-red-500/10 text-red-400" : daysSinceSignup > 0 ? "bg-amber-500/10 text-amber-400" : "bg-blue-500/10 text-blue-400"
                      )}>
                        {daysSinceSignup === 0 ? "Today" : `${daysSinceSignup}d ago`}
                      </Badge>
                      <Link
                        href={`/admin/clients/${client.id}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-xs text-white font-medium transition-colors"
                      >
                        Setup <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recently Completed */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            <CardTitle className="text-white">Recently Completed</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {completed.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-6">No completed setups yet</p>
          ) : (
            <div className="space-y-2">
              {completed.slice(0, 10).map((client) => (
                <div key={client.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-800/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <Wifi className="h-4 w-4 text-emerald-400" />
                    <span className="text-sm text-slate-300">{client.config?.business_name || client.name}</span>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-0 text-[10px]">Live</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
