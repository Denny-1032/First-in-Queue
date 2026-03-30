"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Users,
  Search,
  Building2,
  Wifi,
  WifiOff,
  MessageSquare,
  ArrowRight,
  ToggleLeft,
  ToggleRight,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

interface ClientRow {
  id: string;
  name: string;
  slug: string;
  config: { business_name?: string; industry?: string; personality?: { name?: string } };
  is_active: boolean;
  setup_complete: boolean;
  messages_this_month: number;
  whatsapp_phone_number_id: string;
  whatsapp_access_token: string;
  created_at: string;
}

type FilterType = "all" | "active" | "inactive" | "pending";

export default function AdminClientsPage() {
  const { toast } = useToast();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");

  const loadClients = async () => {
    try {
      const res = await fetch("/api/admin/clients");
      if (res.ok) setClients(await res.json());
    } catch (e) {
      console.error("Failed to load clients:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadClients(); }, []);

  const toggleActive = async (clientId: string, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/admin/clients/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentActive }),
      });
      if (res.ok) {
        toast(`Client ${currentActive ? "deactivated" : "activated"}`, currentActive ? "warning" : "success");
        loadClients();
      }
    } catch {
      toast("Failed to update client status", "error");
    }
  };

  const filtered = clients.filter((c) => {
    const name = (c.config?.business_name || c.name || "").toLowerCase();
    const matchesSearch = !search || name.includes(search.toLowerCase());
    const matchesFilter =
      filter === "all" ||
      (filter === "active" && c.is_active && c.setup_complete) ||
      (filter === "inactive" && !c.is_active) ||
      (filter === "pending" && !c.setup_complete);
    return matchesSearch && matchesFilter;
  });

  const counts = {
    all: clients.length,
    active: clients.filter((c) => c.is_active && c.setup_complete).length,
    inactive: clients.filter((c) => !c.is_active).length,
    pending: clients.filter((c) => !c.setup_complete).length,
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
        <h1 className="text-xl sm:text-2xl font-bold text-white">Client Management</h1>
        <p className="text-sm text-slate-400 mt-1">Manage all business accounts, their bots, and connections</p>
      </div>

      {/* Filter tabs + Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex gap-2">
          {(["all", "active", "pending", "inactive"] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                filter === f
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              )}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              <span className="ml-1.5 text-slate-500">({counts[f]})</span>
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients..."
            className="pl-9 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
          />
        </div>
      </div>

      {/* Client List */}
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-0">
          {/* Table header */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 border-b border-slate-800 text-xs font-medium text-slate-500 uppercase tracking-wider">
            <div className="col-span-4">Business</div>
            <div className="col-span-2">Bot</div>
            <div className="col-span-2">Connection</div>
            <div className="col-span-2">Messages/mo</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-12 text-slate-500 text-sm">
              {search ? "No clients match your search" : "No clients found"}
            </div>
          )}

          {filtered.map((client) => (
            <div
              key={client.id}
              className="grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-4 border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors items-center"
            >
              {/* Business */}
              <div className="col-span-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                  <Building2 className="h-5 w-5 text-slate-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{client.config?.business_name || client.name}</p>
                  <p className="text-xs text-slate-500">{client.config?.industry || "—"} &middot; {new Date(client.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Bot */}
              <div className="col-span-2">
                <p className="text-sm text-slate-300">{client.config?.personality?.name || "Unnamed"}</p>
                <Badge className={cn("text-[10px] border-0 mt-0.5", client.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400")}>
                  {client.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>

              {/* Connection */}
              <div className="col-span-2">
                {client.setup_complete ? (
                  <div className="flex items-center gap-1.5 text-emerald-400 text-xs">
                    <Wifi className="h-3.5 w-3.5" />
                    <span>Connected</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-amber-400 text-xs">
                    <WifiOff className="h-3.5 w-3.5" />
                    <span>Pending</span>
                  </div>
                )}
              </div>

              {/* Messages */}
              <div className="col-span-2">
                <div className="flex items-center gap-1.5 text-slate-300 text-sm">
                  <MessageSquare className="h-3.5 w-3.5 text-slate-500" />
                  {client.messages_this_month.toLocaleString()}
                </div>
              </div>

              {/* Actions */}
              <div className="col-span-2 flex items-center justify-end gap-2">
                <button
                  onClick={() => toggleActive(client.id, client.is_active)}
                  className={cn(
                    "p-1.5 rounded-lg transition-colors",
                    client.is_active ? "hover:bg-red-500/10 text-emerald-400 hover:text-red-400" : "hover:bg-emerald-500/10 text-slate-500 hover:text-emerald-400"
                  )}
                  title={client.is_active ? "Deactivate" : "Activate"}
                >
                  {client.is_active ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                </button>
                <Link
                  href={`/admin/clients/${client.id}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition-colors"
                >
                  Manage <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
