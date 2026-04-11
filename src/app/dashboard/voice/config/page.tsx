"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Mic,
  MicOff,
  Settings,
  Save,
  Plus,
  Trash2,
  RefreshCw,
  Phone,
  PhoneOff,
  Clock,
  Globe,
  MessageSquare,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Play,
  Search,
  Volume2,
  User,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import Link from "next/link";

interface VoiceAgentRow {
  id: string;
  retell_agent_id: string;
  name: string;
  voice_id: string | null;
  greeting_message: string;
  system_prompt: string | null;
  language: string;
  max_call_duration_seconds: number;
  transfer_phone_number: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface RetellVoice {
  voice_id: string;
  voice_name: string;
  provider: string;
  gender: string;
  accent: string;
  age?: string;
  preview_audio_url?: string;
  voice_type?: string;
}

// Transcript entry from Retell update events
interface TranscriptEntry {
  role: "agent" | "user";
  content: string;
}

export default function VoiceConfigPage() {
  const { toast } = useToast();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [agents, setAgents] = useState<VoiceAgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Edit state
  const [editAgent, setEditAgent] = useState<VoiceAgentRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editGreeting, setEditGreeting] = useState("");
  const [editLanguage, setEditLanguage] = useState("en");
  const [editMaxDuration, setEditMaxDuration] = useState(600);
  const [editTransferNumber, setEditTransferNumber] = useState("");
  const [editVoiceId, setEditVoiceId] = useState("");

  // Voice picker state
  const [voices, setVoices] = useState<RetellVoice[]>([]);
  const [voicesLoading, setVoicesLoading] = useState(false);
  const [voiceSearch, setVoiceSearch] = useState("");
  const [voiceGender, setVoiceGender] = useState<string>("");
  const [showVoicePicker, setShowVoicePicker] = useState(false);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Test call state
  const [testCallActive, setTestCallActive] = useState(false);
  const [testCallConnecting, setTestCallConnecting] = useState(false);
  const [agentTalking, setAgentTalking] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const retellClientRef = useRef<ReturnType<typeof Object> | null>(null);
  const transcriptContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetch("/api/tenants")
      .then((r) => r.json())
      .then((d) => {
        // API returns a flat array, not { tenants: [...] }
        const list = Array.isArray(d) ? d : d.tenants || [];
        if (list[0]) setTenantId(list[0].id);
        else setLoading(false);
      })
      .catch(() => { setLoading(false); });
  }, []);

  const fetchAgents = useCallback(async () => {
    if (!tenantId) { setInitialLoadComplete(true); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/voice/agents?tenantId=${tenantId}`);
      const data = await res.json();
      const list = data.agents || [];
      setAgents(list);
      if (list.length > 0 && !editAgent) {
        selectAgent(list[0]);
      }
    } catch {
      setAgents([]);
    } finally {
      setLoading(false);
      setInitialLoadComplete(true);
    }
  }, [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchAgents(); }, [fetchAgents]);

  // Auto-scroll transcript container only — never scrolls the page
  useEffect(() => {
    if (transcript.length > 0) {
      const timeoutId = setTimeout(() => {
        if (transcriptContainerRef.current) {
          transcriptContainerRef.current.scrollTop = transcriptContainerRef.current.scrollHeight;
        }
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [transcript.length]); // Only trigger on length change, not content updates

  const selectAgent = (agent: VoiceAgentRow) => {
    setEditAgent(agent);
    setEditName(agent.name);
    setEditGreeting(agent.greeting_message);
    setEditLanguage(agent.language);
    setEditMaxDuration(agent.max_call_duration_seconds);
    setEditTransferNumber(agent.transfer_phone_number || "");
    setEditVoiceId(agent.voice_id || "");
  };

  // ── Voice fetching ─────────────────────────────────────────
  const fetchVoices = async () => {
    if (voices.length > 0) return;
    setVoicesLoading(true);
    try {
      const res = await fetch("/api/voice/voices");
      const data = await res.json();
      setVoices(data.voices || []);
    } catch {
      toast("Failed to load voices", "error");
    } finally {
      setVoicesLoading(false);
    }
  };

  const filteredVoices = voices.filter((v) => {
    const q = voiceSearch.toLowerCase();
    const matchSearch = !q || v.voice_name.toLowerCase().includes(q) || v.accent?.toLowerCase().includes(q) || v.provider?.toLowerCase().includes(q);
    const matchGender = !voiceGender || v.gender?.toLowerCase() === voiceGender.toLowerCase();
    return matchSearch && matchGender;
  });

  const playVoicePreview = (voice: RetellVoice) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (playingVoiceId === voice.voice_id) {
      setPlayingVoiceId(null);
      return;
    }
    if (voice.preview_audio_url) {
      const audio = new Audio(voice.preview_audio_url);
      audio.onended = () => setPlayingVoiceId(null);
      audio.play().catch(() => {});
      audioRef.current = audio;
      setPlayingVoiceId(voice.voice_id);
    }
  };

  // ── CRUD handlers ──────────────────────────────────────────
  const handleCreate = async () => {
    if (!tenantId) return;
    setCreating(true);
    try {
      const res = await fetch("/api/voice/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create");
      toast("Voice agent created", "success");
      await fetchAgents();
      if (data.agent) selectAgent(data.agent);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to create agent", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleSave = async () => {
    if (!editAgent || !tenantId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/voice/agents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: editAgent.id,
          tenantId,
          name: editName,
          greeting: editGreeting,
          language: editLanguage,
          maxCallDurationSeconds: editMaxDuration,
          transferPhoneNumber: editTransferNumber || null,
          voiceId: editVoiceId || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast("Voice agent updated", "success");
      fetchAgents();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to save", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSyncPrompt = async () => {
    if (!editAgent || !tenantId) return;
    setSyncing(true);
    try {
      const res = await fetch("/api/voice/agents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: editAgent.id,
          tenantId,
          syncPrompt: true,
        }),
      });
      if (!res.ok) throw new Error("Failed to sync");
      toast("System prompt synced from business config", "success");
      fetchAgents();
    } catch {
      toast("Failed to sync prompt", "error");
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async (agentId: string) => {
    if (!tenantId) return;
    const confirmed = window.confirm(
      "Are you sure you want to delete this voice agent? This will also remove it from Retell AI and cannot be undone."
    );
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/voice/agents?agentId=${agentId}&tenantId=${tenantId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast("Voice agent deleted", "success");
      setEditAgent(null);
      fetchAgents();
    } catch {
      toast("Failed to delete agent", "error");
    }
  };

  // ── Test call ──────────────────────────────────────────────
  const startTestCall = async () => {
    if (!editAgent) return;
    setTestCallConnecting(true);
    setTranscript([]);

    try {
      // 1. Get access token from our server
      const res = await fetch("/api/voice/web-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: editAgent.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start test call");

      // 2. Load the Retell Web SDK dynamically
      const { RetellWebClient } = await import("retell-client-js-sdk");
      const webClient = new RetellWebClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      retellClientRef.current = webClient as any;

      // 3. Set up event listeners
      webClient.on("call_started", () => {
        setTestCallActive(true);
        setTestCallConnecting(false);
      });

      webClient.on("call_ended", () => {
        setTestCallActive(false);
        setTestCallConnecting(false);
        setAgentTalking(false);
        retellClientRef.current = null;
      });

      webClient.on("agent_start_talking", () => {
        setAgentTalking(true);
      });

      webClient.on("agent_stop_talking", () => {
        setAgentTalking(false);
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      webClient.on("update", (update: any) => {
        if (update.transcript) {
          setTranscript(update.transcript);
        }
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      webClient.on("error", (error: any) => {
        console.error("[Test Call] Error:", error);
        toast("Test call error occurred", "error");
        webClient.stopCall();
        setTestCallActive(false);
        setTestCallConnecting(false);
      });

      // 4. Start the call
      await webClient.startCall({
        accessToken: data.accessToken,
      });
    } catch (err) {
      console.error("[Test Call] Failed:", err);
      toast(err instanceof Error ? err.message : "Failed to start test call", "error");
      setTestCallConnecting(false);
    }
  };

  const stopTestCall = () => {
    if (retellClientRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (retellClientRef.current as any).stopCall();
    }
    setTestCallActive(false);
    setTestCallConnecting(false);
    setAgentTalking(false);
  };

  const selectedVoiceName = voices.find((v) => v.voice_id === editVoiceId)?.voice_name || editVoiceId || "Default";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/dashboard/voice" className="text-sm text-gray-500 hover:text-gray-700">Voice Calls</Link>
            <span className="text-gray-300">/</span>
            <span className="text-sm text-gray-900 font-medium">Configuration</span>
          </div>
                  </div>
      </div>

      {!initialLoadComplete || loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : agents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center mb-6">
              <Mic className="h-9 w-9 text-emerald-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Set Up Your Voice Agent</h2>
            <p className="text-sm text-gray-500 max-w-md mb-6">
              Create an AI voice agent that can handle inbound and outbound phone calls for your business.
              It will use your business configuration, knowledge base, and FAQs automatically.
            </p>
            <Button
              onClick={handleCreate}
              disabled={creating}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create Voice Agent
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6" style={{ gridTemplateColumns: "minmax(0,220px) minmax(0,1fr) minmax(0,340px)" }}>
          {/* Agent list */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">Your Agents</p>
              <Button variant="outline" size="sm" onClick={handleCreate} disabled={creating} className="gap-1 text-xs h-7">
                {creating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                New
              </Button>
            </div>
            {agents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => selectAgent(agent)}
                className={cn(
                  "w-full text-left rounded-xl border p-4 transition-all",
                  editAgent?.id === agent.id
                    ? "border-emerald-300 bg-emerald-50 shadow-sm"
                    : "border-gray-200 bg-white hover:border-gray-300"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full",
                    agent.is_active ? "bg-emerald-100" : "bg-gray-100"
                  )}>
                    <Mic className={cn("h-5 w-5", agent.is_active ? "text-emerald-600" : "text-gray-400")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{agent.name}</p>
                    <p className="text-xs text-gray-500">{agent.language} · Max {Math.round(agent.max_call_duration_seconds / 60)} min</p>
                  </div>
                  <Badge variant="secondary" className={agent.is_active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}>
                    {agent.is_active ? "Active" : "Off"}
                  </Badge>
                </div>
              </button>
            ))}
          </div>

          {/* Configuration panel - Middle */}
          {editAgent && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Settings className="h-5 w-5 text-emerald-600" />
                      <CardTitle>Agent Configuration</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(editAgent.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 gap-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </div>
                  </div>
                  <CardDescription>Customise how your voice agent behaves on phone calls</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      <Mic className="inline h-4 w-4 mr-1.5 text-gray-400" />
                      Agent Name
                    </label>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="My Voice Agent"
                      className="h-11"
                    />
                  </div>

                  {/* Voice Picker */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      <Volume2 className="inline h-4 w-4 mr-1.5 text-gray-400" />
                      Voice
                    </label>
                    <div
                      className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 cursor-pointer hover:border-emerald-300 transition-colors"
                      onClick={() => { setShowVoicePicker(!showVoicePicker); fetchVoices(); }}
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100">
                        <Volume2 className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{selectedVoiceName}</p>
                        <p className="text-xs text-gray-500">{editVoiceId ? "Custom voice selected" : "Click to browse voices"}</p>
                      </div>
                      <Badge variant="secondary" className="text-xs bg-gray-100">
                        {showVoicePicker ? "Close" : "Browse"}
                      </Badge>
                    </div>

                    {/* Voice picker dropdown */}
                    {showVoicePicker && (
                      <div className="mt-2 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
                        {/* Filters */}
                        <div className="border-b border-gray-100 p-3 space-y-2">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              placeholder="Search voices..."
                              value={voiceSearch}
                              onChange={(e) => setVoiceSearch(e.target.value)}
                              className="pl-9 h-9 text-sm"
                            />
                          </div>
                          <div className="flex gap-1.5">
                            {["", "male", "female"].map((g) => (
                              <button
                                key={g}
                                onClick={() => setVoiceGender(g)}
                                className={cn(
                                  "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                                  voiceGender === g
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                )}
                              >
                                {g === "" ? "All" : g.charAt(0).toUpperCase() + g.slice(1)}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Voice list */}
                        <div className="max-h-72 overflow-y-auto">
                          {voicesLoading ? (
                            <div className="flex items-center justify-center py-8">
                              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                            </div>
                          ) : filteredVoices.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-8">No voices found</p>
                          ) : (
                            filteredVoices.slice(0, 50).map((voice) => (
                              <div
                                key={voice.voice_id}
                                className={cn(
                                  "flex items-center gap-3 px-3 py-2.5 border-b border-gray-50 cursor-pointer transition-colors",
                                  editVoiceId === voice.voice_id
                                    ? "bg-emerald-50"
                                    : "hover:bg-gray-50"
                                )}
                                onClick={() => {
                                  setEditVoiceId(voice.voice_id);
                                  setShowVoicePicker(false);
                                }}
                              >
                                <div className={cn(
                                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                                  voice.gender?.toLowerCase() === "female" ? "bg-pink-100" : "bg-blue-100"
                                )}>
                                  <User className={cn(
                                    "h-4 w-4",
                                    voice.gender?.toLowerCase() === "female" ? "text-pink-600" : "text-blue-600"
                                  )} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">{voice.voice_name}</p>
                                  <p className="text-[11px] text-gray-500">
                                    {voice.provider} · {voice.gender} · {voice.accent}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {voice.preview_audio_url && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); playVoicePreview(voice); }}
                                      className={cn(
                                        "flex h-7 w-7 items-center justify-center rounded-full transition-colors",
                                        playingVoiceId === voice.voice_id
                                          ? "bg-emerald-100 text-emerald-600"
                                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                                      )}
                                    >
                                      {playingVoiceId === voice.voice_id ? (
                                        <MicOff className="h-3.5 w-3.5" />
                                      ) : (
                                        <Play className="h-3.5 w-3.5" />
                                      )}
                                    </button>
                                  )}
                                  {editVoiceId === voice.voice_id && (
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Greeting */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      <MessageSquare className="inline h-4 w-4 mr-1.5 text-gray-400" />
                      Greeting Message
                    </label>
                    <textarea
                      value={editGreeting}
                      onChange={(e) => setEditGreeting(e.target.value)}
                      rows={3}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                      placeholder="Hello, thank you for calling..."
                    />
                    <p className="mt-1 text-xs text-gray-400">The first thing the AI says when answering or calling</p>
                  </div>

                  {/* Language & Duration */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        <Globe className="inline h-4 w-4 mr-1.5 text-gray-400" />
                        Language
                      </label>
                      <select
                        value={editLanguage}
                        onChange={(e) => setEditLanguage(e.target.value)}
                        className="w-full h-11 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="en">English</option>
                        <option value="en-GB">English (UK)</option>
                        <option value="fr">French</option>
                        <option value="es">Spanish</option>
                        <option value="pt">Portuguese</option>
                        <option value="sw">Swahili</option>
                        <option value="zu">Zulu</option>
                        <option value="ny">Chichewa</option>
                        <option value="bem">Bemba</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        <Clock className="inline h-4 w-4 mr-1.5 text-gray-400" />
                        Max Call Duration
                      </label>
                      <select
                        value={editMaxDuration}
                        onChange={(e) => setEditMaxDuration(Number(e.target.value))}
                        className="w-full h-11 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value={120}>2 minutes</option>
                        <option value={300}>5 minutes</option>
                        <option value={600}>10 minutes</option>
                        <option value={900}>15 minutes</option>
                        <option value={1200}>20 minutes</option>
                        <option value={1800}>30 minutes</option>
                      </select>
                    </div>
                  </div>

                  {/* Transfer number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      <Phone className="inline h-4 w-4 mr-1.5 text-gray-400" />
                      Human Transfer Number
                    </label>
                    <Input
                      value={editTransferNumber}
                      onChange={(e) => setEditTransferNumber(e.target.value)}
                      placeholder="+260 97X XXX XXX (optional)"
                      className="h-11"
                    />
                    <p className="mt-1 text-xs text-gray-400">If the caller requests a human, the AI will transfer to this number</p>
                  </div>

                  {/* Sync prompt */}
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <div className="flex items-start gap-3">
                      <RefreshCw className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-700">AI System Prompt</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          The voice agent uses your business configuration (knowledge base, FAQs, personality) to generate its system prompt.
                          Sync to update after changes to your AI Config.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSyncPrompt}
                          disabled={syncing}
                          className="mt-3 gap-1.5 text-xs"
                        >
                          {syncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                          Sync from Business Config
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* System prompt preview */}
                  {editAgent.system_prompt && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">System Prompt Preview</label>
                      <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 max-h-48 overflow-y-auto">
                        <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans leading-relaxed">
                          {editAgent.system_prompt.slice(0, 800)}
                          {editAgent.system_prompt.length > 800 && "..."}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Save button */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Retell Agent ID: {editAgent.retell_agent_id.slice(0, 12)}...
                    </div>
                    <Button
                      onClick={handleSave}
                      disabled={saving}
                      className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Save Changes
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Quick info card - Knowledge Base Integration */}
              <Card>
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Knowledge Base Integration</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Your voice agent automatically uses your business configuration, knowledge base, and FAQs from AI Config.
                        Use "Sync from Business Config" above to update the system prompt.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Test panel - Right */}
          {editAgent && (
            <div className="space-y-4">
              {/* Test Call Card */}
              <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50">
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-full transition-all",
                      testCallActive
                        ? agentTalking
                          ? "bg-emerald-500 shadow-lg shadow-emerald-200 scale-110"
                          : "bg-emerald-400 shadow-md shadow-emerald-200"
                        : "bg-white"
                    )}>
                      {testCallActive ? (
                        <Volume2 className={cn("h-6 w-6 text-white", agentTalking && "animate-pulse")} />
                      ) : (
                        <Phone className="h-5 w-5 text-emerald-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">Test Your Agent</p>
                      <p className="text-xs text-gray-500">
                        {testCallActive ? "Call in progress — speak into your mic" : "Talk to your AI agent from the browser"}
                      </p>
                    </div>
                  </div>
                  {testCallActive ? (
                    <Button
                      onClick={stopTestCall}
                      className="w-full gap-2 bg-red-500 hover:bg-red-600 text-white"
                    >
                      <PhoneOff className="h-4 w-4" />
                      End Test Call
                    </Button>
                  ) : (
                    <Button
                      onClick={startTestCall}
                      disabled={testCallConnecting}
                      className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {testCallConnecting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                      {testCallConnecting ? "Connecting..." : "Start Test Call"}
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Live Transcript - Fixed height with scroll, never causes page scroll */}
              <Card className="border-gray-200">
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Live Transcript</CardTitle>
                    {testCallActive && (
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-[10px] font-medium text-red-600">LIVE</span>
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div ref={transcriptContainerRef} className="h-96 overflow-y-auto overscroll-contain space-y-2 border border-gray-100 rounded-lg p-3 bg-gray-50">
                    {transcript.length === 0 && !testCallActive && (
                      <p className="text-xs text-gray-400 italic text-center py-4">Click "Start Test Call" to begin</p>
                    )}
                    {transcript.length === 0 && testCallActive && (
                      <p className="text-xs text-gray-400 italic text-center py-4">Waiting for conversation...</p>
                    )}
                    {transcript.map((entry, i) => (
                      <div
                        key={i}
                        className={cn(
                          "flex gap-2 text-xs",
                          entry.role === "agent" ? "justify-start" : "justify-end"
                        )}
                      >
                        {entry.role === "agent" && (
                          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 mt-0.5">
                            <Sparkles className="h-3 w-3 text-emerald-600" />
                          </div>
                        )}
                        <div
                          className={cn(
                            "max-w-[85%] rounded-lg px-3 py-1.5",
                            entry.role === "agent"
                              ? "bg-white text-gray-800 border border-emerald-200"
                              : "bg-gray-200 text-gray-800"
                          )}
                        >
                          {entry.content}
                        </div>
                        {entry.role === "user" && (
                          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-200 mt-0.5">
                            <User className="h-3 w-3 text-gray-600" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
