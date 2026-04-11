"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Plus,
  Trash2,
  Save,
  Loader2,
  UserCheck,
  Mail,
  MessageSquare,
  Shield,
  Wifi,
  WifiOff,
  Edit2,
  X,
  Send,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import type { Agent } from "@/types";

interface InviteRow {
  name: string;
  email: string;
  role: "admin" | "agent";
  max_concurrent_chats: number;
}

const emptyInvite = (): InviteRow => ({
  name: "",
  email: "",
  role: "agent",
  max_concurrent_chats: 5,
});

export default function TeamPage() {
  const { toast } = useToast();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [invite, setInvite] = useState<InviteRow>(emptyInvite());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<Partial<Agent>>({});

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch("/api/agents");
      if (res.ok) {
        const data = await res.json();
        setAgents(Array.isArray(data) ? data : []);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);

  const handleCreate = async () => {
    if (!invite.name.trim() || !invite.email.trim()) {
      toast("Name and email are required", "error");
      return;
    }
    setInviting(true);
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invite),
      });
      if (!res.ok) throw new Error("Failed to create agent");
      const newAgent = await res.json();

      // Automatically send invite email
      try {
        const invRes = await fetch("/api/team/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId: newAgent.id }),
        });
        const invData = await invRes.json();
        if (invData.warning) {
          // Email failed but link was generated — show it
          toast(`${invite.name} added. Invite email failed — share this link: ${invData.inviteUrl}`, "warning");
        } else {
          toast(`${invite.name} added and invite email sent!`, "success");
        }
      } catch {
        toast(`${invite.name} added, but invite email could not be sent. Use the send button to retry.`, "warning");
      }

      setInvite(emptyInvite());
      setShowInviteForm(false);
      fetchAgents();
    } catch {
      toast("Failed to add team member", "error");
    }
    setInviting(false);
  };

  const handleSendInvite = async (agent: Agent) => {
    try {
      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: agent.id }),
      });
      if (!res.ok) throw new Error("Failed to send invite");
      const data = await res.json();
      if (data.warning && data.inviteUrl) {
        toast(`Email failed. Share link manually: ${data.inviteUrl}`, "warning");
      } else {
        toast(`Invite email sent to ${agent.email}`, "success");
      }
      fetchAgents();
    } catch {
      toast("Failed to send invite email", "error");
    }
  };

  const startEdit = (agent: Agent) => {
    setEditingId(agent.id);
    setEditFields({ name: agent.name, email: agent.email, role: agent.role, max_concurrent_chats: agent.max_concurrent_chats });
  };

  const cancelEdit = () => { setEditingId(null); setEditFields({}); };

  const handleSave = async (agentId: string) => {
    setSaving(agentId);
    try {
      const res = await fetch(`/api/agents/${agentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editFields),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast("Team member updated", "success");
      setEditingId(null);
      fetchAgents();
    } catch {
      toast("Failed to save changes", "error");
    }
    setSaving(null);
  };

  const handleDelete = async (agent: Agent) => {
    if (!window.confirm(`Remove ${agent.name} from your team? They will no longer have access.`)) return;
    setDeleting(agent.id);
    try {
      const res = await fetch(`/api/agents/${agent.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast(`${agent.name} removed from team`, "success");
      fetchAgents();
    } catch {
      toast("Failed to remove team member", "error");
    }
    setDeleting(null);
  };

  const handleToggleOnline = async (agent: Agent) => {
    try {
      const res = await fetch(`/api/agents/${agent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_online: !agent.is_online }),
      });
      if (res.ok) {
        setAgents((prev) => prev.map((a) => a.id === agent.id ? { ...a, is_online: !agent.is_online } : a));
      }
    } catch { /* silent */ }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Team</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage agents who handle customer conversations</p>
        </div>
        <Button
          onClick={() => setShowInviteForm(true)}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          disabled={showInviteForm}
        >
          <Plus className="h-4 w-4" />
          Add Member
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
              <Users className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{agents.length}</p>
              <p className="text-xs text-gray-500">Total Agents</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <Wifi className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{agents.filter((a) => a.is_online).length}</p>
              <p className="text-xs text-gray-500">Online Now</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <MessageSquare className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{agents.reduce((sum, a) => sum + (a.active_chats || 0), 0)}</p>
              <p className="text-xs text-gray-500">Active Chats</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add member form */}
      {showInviteForm && (
        <Card className="border-emerald-200 bg-emerald-50/40">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Add Team Member</CardTitle>
                <CardDescription>They will receive an email invite to set up their login.</CardDescription>
              </div>
              <button onClick={() => { setShowInviteForm(false); setInvite(emptyInvite()); }} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Full Name</label>
                <Input
                  placeholder="Naomi Banda"
                  value={invite.name}
                  onChange={(e) => setInvite((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email Address</label>
                <Input
                  type="email"
                  placeholder="naomi@company.com"
                  value={invite.email}
                  onChange={(e) => setInvite((p) => ({ ...p, email: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={invite.role}
                  onChange={(e) => setInvite((p) => ({ ...p, role: e.target.value as "admin" | "agent" }))}
                  className="w-full h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="agent">Agent — handles chats</option>
                  <option value="admin">Admin — full access</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Max Concurrent Chats</label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={invite.max_concurrent_chats}
                  onChange={(e) => setInvite((p) => ({ ...p, max_concurrent_chats: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => { setShowInviteForm(false); setInvite(emptyInvite()); }}>Cancel</Button>
              <Button
                onClick={handleCreate}
                disabled={inviting}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Add & Send Invite
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Agents list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-emerald-600" />
            Team Members
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : agents.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <Users className="h-10 w-10 text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">No team members yet.</p>
              <p className="text-xs text-gray-400 mt-1">Click "Add Member" to invite your first agent.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {agents.map((agent) => {
                const isEditing = editingId === agent.id;
                return (
                  <div key={agent.id} className="px-6 py-4">
                    {isEditing ? (
                      /* Edit row */
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                            <Input
                              value={editFields.name || ""}
                              onChange={(e) => setEditFields((p) => ({ ...p, name: e.target.value }))}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                            <Input
                              value={editFields.email || ""}
                              onChange={(e) => setEditFields((p) => ({ ...p, email: e.target.value }))}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
                            <select
                              value={editFields.role || "agent"}
                              onChange={(e) => setEditFields((p) => ({ ...p, role: e.target.value as "admin" | "agent" }))}
                              className="w-full h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            >
                              <option value="agent">Agent</option>
                              <option value="admin">Admin</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Max Chats</label>
                            <Input
                              type="number"
                              min={1}
                              max={50}
                              value={editFields.max_concurrent_chats || 5}
                              onChange={(e) => setEditFields((p) => ({ ...p, max_concurrent_chats: Number(e.target.value) }))}
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={cancelEdit}>Cancel</Button>
                          <Button
                            size="sm"
                            onClick={() => handleSave(agent.id)}
                            disabled={saving === agent.id}
                            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            {saving === agent.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      /* View row */
                      <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <div className={cn(
                          "h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0",
                          agent.is_online ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
                        )}>
                          {agent.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-900 truncate">{agent.name}</p>
                            <Badge variant="secondary" className={cn(
                              "text-[10px] px-1.5 py-0",
                              agent.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"
                            )}>
                              {agent.role === "admin" ? <Shield className="h-2.5 w-2.5 mr-0.5 inline" /> : null}
                              {agent.role}
                            </Badge>
                            {agent.invite_accepted_at ? (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-emerald-50 text-emerald-700">
                                <CheckCircle2 className="h-2.5 w-2.5 mr-0.5 inline" /> Joined
                              </Badge>
                            ) : agent.invite_sent_at ? (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-50 text-amber-700">
                                <Clock className="h-2.5 w-2.5 mr-0.5 inline" /> Invite Pending
                              </Badge>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <Mail className="h-3 w-3" />
                              {agent.email || <span className="italic text-gray-400">No email</span>}
                            </span>
                            <span className="text-xs text-gray-400">·</span>
                            <span className="text-xs text-gray-500">
                              {agent.active_chats || 0}/{agent.max_concurrent_chats} chats
                            </span>
                          </div>
                        </div>

                        {/* Online status toggle */}
                        <button
                          onClick={() => handleToggleOnline(agent)}
                          className={cn(
                            "flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors",
                            agent.is_online
                              ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                              : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100"
                          )}
                          title={agent.is_online ? "Click to set offline" : "Click to set online"}
                        >
                          {agent.is_online
                            ? <><Wifi className="h-3 w-3" /> Online</>
                            : <><WifiOff className="h-3 w-3" /> Offline</>
                          }
                        </button>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          {agent.email && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 gap-1 text-xs text-gray-500 hover:text-blue-600"
                              onClick={() => handleSendInvite(agent)}
                              title="Resend invite email"
                            >
                              <Send className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1 text-xs text-gray-500 hover:text-gray-900"
                            onClick={() => startEdit(agent)}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1 text-xs text-red-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDelete(agent)}
                            disabled={deleting === agent.id}
                          >
                            {deleting === agent.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* How it works */}
      <Card className="bg-gray-50 border-dashed">
        <CardContent className="pt-5 pb-4">
          <p className="text-xs font-semibold text-gray-600 mb-2">How team handoff works</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-gray-500">
            <div className="flex items-start gap-2">
              <span className="font-bold text-emerald-600 shrink-0">1.</span>
              Agent must be set <strong>Online</strong> to receive handoffs from the AI
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-emerald-600 shrink-0">2.</span>
              AI assigns the conversation to the agent with fewest active chats
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-emerald-600 shrink-0">3.</span>
              Agent sees the chat in Conversations and the customer gets a WhatsApp message
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
