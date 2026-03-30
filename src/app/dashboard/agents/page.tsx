"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Users,
  Plus,
  Circle,
  MessageSquare,
  Shield,
  Crown,
  UserCheck,
  Trash2,
  Power,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

interface AgentDisplay {
  id: string;
  name: string;
  email: string;
  role: "admin" | "supervisor" | "agent";
  is_online: boolean;
  active_chats: number;
  max_concurrent_chats: number;
  resolved_today: number;
  avg_response_time: string;
}

const mockAgents: AgentDisplay[] = [
  { id: "1", name: "Alex Morgan", email: "alex@company.com", role: "admin", is_online: true, active_chats: 3, max_concurrent_chats: 10, resolved_today: 24, avg_response_time: "45s" },
  { id: "2", name: "Jordan Lee", email: "jordan@company.com", role: "supervisor", is_online: true, active_chats: 5, max_concurrent_chats: 8, resolved_today: 31, avg_response_time: "38s" },
  { id: "3", name: "Sam Rivera", email: "sam@company.com", role: "agent", is_online: true, active_chats: 4, max_concurrent_chats: 5, resolved_today: 18, avg_response_time: "52s" },
  { id: "4", name: "Taylor Kim", email: "taylor@company.com", role: "agent", is_online: false, active_chats: 0, max_concurrent_chats: 5, resolved_today: 12, avg_response_time: "41s" },
  { id: "5", name: "Casey Brooks", email: "casey@company.com", role: "agent", is_online: true, active_chats: 2, max_concurrent_chats: 5, resolved_today: 15, avg_response_time: "55s" },
  { id: "6", name: "Morgan Chen", email: "morgan@company.com", role: "agent", is_online: false, active_chats: 0, max_concurrent_chats: 5, resolved_today: 8, avg_response_time: "48s" },
];

const roleConfig = {
  admin: { label: "Admin", icon: Crown, color: "bg-amber-100 text-amber-700" },
  supervisor: { label: "Supervisor", icon: Shield, color: "bg-purple-100 text-purple-700" },
  agent: { label: "Agent", icon: UserCheck, color: "bg-blue-100 text-blue-700" },
};

export default function AgentsPage() {
  const { toast } = useToast();
  const [agents, setAgents] = useState<AgentDisplay[]>(mockAgents);
  const [usingMock, setUsingMock] = useState(false);

  useEffect(() => {
    async function fetchAgents() {
      try {
        const res = await fetch("/api/agents");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const mapped: AgentDisplay[] = data.map((a: AgentDisplay) => ({
              id: a.id,
              name: a.name,
              email: a.email,
              role: a.role,
              is_online: a.is_online,
              active_chats: a.active_chats || 0,
              max_concurrent_chats: a.max_concurrent_chats || 5,
              resolved_today: 0,
              avg_response_time: "--",
            }));
            setAgents(mapped);
            setUsingMock(false);
            return;
          }
        }
      } catch { /* fallback */ }
      setAgents(mockAgents);
      setUsingMock(true);
    }
    fetchAgents();
  }, []);
  const onlineCount = agents.filter((a) => a.is_online).length;
  const totalActiveChats = agents.reduce((sum, a) => sum + a.active_chats, 0);
  const totalResolvedToday = agents.reduce((sum, a) => sum + a.resolved_today, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Agents</h1>
          <p className="text-gray-500 mt-1 text-sm">Manage your support team</p>
        </div>
        <Button
          className="gap-2"
          onClick={async () => {
            if (!usingMock) {
              try {
                const res = await fetch("/api/agents", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ name: "New Agent", email: "agent@company.com", role: "agent" }),
                });
                if (res.ok) {
                  const created = await res.json();
                  setAgents((prev) => [...prev, { ...created, resolved_today: 0, avg_response_time: "--" }]);
                  toast("Agent added. Update their details to get started.", "info");
                  return;
                }
              } catch { /* fallback */ }
            }
            const id = Date.now().toString();
            setAgents((prev) => [
              ...prev,
              { id, name: "New Agent", email: "agent@company.com", role: "agent", is_online: false, active_chats: 0, max_concurrent_chats: 5, resolved_today: 0, avg_response_time: "--" },
            ]);
            toast("Agent added. Update their details to get started.", "info");
          }}
        >
          <Plus className="h-4 w-4" />
          Add Agent
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
              <Users className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{agents.length}</p>
              <p className="text-xs text-gray-500">Total Agents</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100">
              <Circle className="h-5 w-5 text-green-600 fill-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{onlineCount}</p>
              <p className="text-xs text-gray-500">Online Now</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
              <MessageSquare className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalActiveChats}</p>
              <p className="text-xs text-gray-500">Active Chats</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100">
              <UserCheck className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalResolvedToday}</p>
              <p className="text-xs text-gray-500">Resolved Today</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agent Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent) => {
          const role = roleConfig[agent.role];
          const RoleIcon = role.icon;
          const initials = agent.name.split(" ").map((n) => n[0]).join("").toUpperCase();
          const loadPct = agent.max_concurrent_chats > 0 ? (agent.active_chats / agent.max_concurrent_chats) * 100 : 0;

          return (
            <Card key={agent.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar>
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <div className={cn(
                        "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white",
                        agent.is_online ? "bg-emerald-500" : "bg-gray-300"
                      )} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">{agent.name}</h3>
                      <p className="text-xs text-gray-500">{agent.email}</p>
                    </div>
                  </div>
                  <div className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium", role.color)}>
                    <RoleIcon className="h-3 w-3" />
                    {role.label}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Active Chats</span>
                    <span className="font-medium text-gray-900">{agent.active_chats} / {agent.max_concurrent_chats}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        loadPct > 80 ? "bg-red-500" : loadPct > 50 ? "bg-amber-500" : "bg-emerald-500"
                      )}
                      style={{ width: `${loadPct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Resolved today: <strong className="text-gray-700">{agent.resolved_today}</strong></span>
                    <span>Avg reply: <strong className="text-gray-700">{agent.avg_response_time}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5 text-xs"
                      onClick={async () => {
                        const newStatus = !agent.is_online;
                        setAgents((prev) => prev.map((a) => a.id === agent.id ? { ...a, is_online: newStatus } : a));
                        if (!usingMock) {
                          try {
                            await fetch(`/api/agents/${agent.id}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ is_online: newStatus }),
                            });
                          } catch { /* best effort */ }
                        }
                        toast(newStatus ? `${agent.name} is now online` : `${agent.name} is now offline`, "info");
                      }}
                    >
                      <Power className="h-3 w-3" />
                      {agent.is_online ? "Go Offline" : "Go Online"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={async () => {
                        if (!usingMock) {
                          try {
                            await fetch(`/api/agents/${agent.id}`, { method: "DELETE" });
                          } catch { /* best effort */ }
                        }
                        setAgents((prev) => prev.filter((a) => a.id !== agent.id));
                        toast(`${agent.name} removed`, "info");
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
