"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  Send,
  Bot,
  User,
  UserCheck,
  Phone,
  Clock,
  CheckCheck,
  Smile,
  Meh,
  Frown,
  ArrowLeftRight,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  MoreVertical,
  MessageSquare,
  Image,
  FileText,
  Mic,
  Video,
  MapPin,
  Zap,
  AlertTriangle,
  Wifi,
  WifiOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { timeAgo, truncate } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import type { Conversation, Message, ConversationStatus, Agent } from "@/types";


const statusConfig: Record<ConversationStatus, { label: string; color: string; icon: React.ElementType }> = {
  active: { label: "Active", color: "bg-emerald-100 text-emerald-700", icon: Bot },
  waiting: { label: "Waiting", color: "bg-amber-100 text-amber-700", icon: Clock },
  handoff: { label: "Agent", color: "bg-blue-100 text-blue-700", icon: UserCheck },
  resolved: { label: "Resolved", color: "bg-gray-100 text-gray-600", icon: CheckCircle2 },
  archived: { label: "Archived", color: "bg-gray-100 text-gray-400", icon: XCircle },
};

const sentimentIcon = {
  positive: Smile,
  neutral: Meh,
  negative: Frown,
};

const sentimentColor = {
  positive: "text-emerald-500",
  neutral: "text-amber-500",
  negative: "text-red-500",
};

type FilterStatus = "all" | ConversationStatus;

export default function ConversationsPage() {
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const [showCanned, setShowCanned] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [myAgent, setMyAgent] = useState<Agent | null>(null);
  const [togglingOnline, setTogglingOnline] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initialLoadDone = useRef(false);
  const prevHandoffIds = useRef<Set<string>>(new Set());
  const notifPermission = useRef<NotificationPermission>("default");

  // Canned responses for agents
  const cannedResponses = [
    { label: "Greeting", text: "Hi there! Thanks for reaching out. How can I help you today?" },
    { label: "Please wait", text: "Thank you for your patience. Let me look into this for you." },
    { label: "Need more info", text: "Could you provide more details so I can assist you better?" },
    { label: "Escalating", text: "I'm going to connect you with a specialist who can help further." },
    { label: "Resolved", text: "Glad I could help! Is there anything else you need?" },
    { label: "Follow up", text: "Just following up — were you able to resolve the issue?" },
  ];

  // Request browser notification permission on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      Notification.requestPermission().then((p) => {
        notifPermission.current = p;
      });
    }
  }, []);

  // Fetch agents and find current user's agent record
  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch("/api/agents");
      if (res.ok) {
        const data: Agent[] = await res.json();
        setAgents(data);
        // Identify "me" — first agent for now (session-based in future)
        if (data.length > 0 && !myAgent) setMyAgent(data[0]);
      }
    } catch { /* silent */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);

  const toggleOnline = async () => {
    if (!myAgent) return;
    setTogglingOnline(true);
    const newStatus = !myAgent.is_online;
    try {
      const res = await fetch(`/api/agents/${myAgent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_online: newStatus }),
      });
      if (res.ok) {
        const updated: Agent = await res.json();
        setMyAgent(updated);
        setAgents((prev) => prev.map((a) => a.id === updated.id ? updated : a));
        toast(newStatus ? "You are now online — handoffs will be assigned to you" : "You are now offline", newStatus ? "success" : "info");
      }
    } catch { /* silent */ }
    setTogglingOnline(false);
  };

  // Fetch conversations from API
  const fetchConversations = useCallback(async (isPolling = false) => {
    if (!isPolling) setLoadingConvos(true);
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const data = await res.json();
        const convos: Conversation[] = data.conversations || [];
        setConversations(convos);
        if (!initialLoadDone.current && convos.length > 0) {
          setSelectedId(convos[0].id);
          initialLoadDone.current = true;
          // Seed known handoff IDs so first poll doesn't false-notify
          convos.filter((c) => c.status === "handoff" || c.status === "waiting")
            .forEach((c) => prevHandoffIds.current.add(c.id));
        }

        // Detect NEW handoff / waiting conversations for browser notification
        if (isPolling && initialLoadDone.current) {
          convos
            .filter((c) => (c.status === "handoff" || c.status === "waiting") && !prevHandoffIds.current.has(c.id))
            .forEach((c) => {
              prevHandoffIds.current.add(c.id);
              const label = c.status === "handoff" ? "🔵 New handoff" : "🟡 Waiting for agent";
              const name = c.customer_name || c.customer_phone;
              // Browser notification
              if (notifPermission.current === "granted") {
                new Notification(`${label}: ${name}`, {
                  body: "A conversation needs your attention.",
                  icon: "/favicon.ico",
                });
              }
              // In-app toast
              toast(`${label}: ${name}`, c.status === "handoff" ? "info" : "warning");
            });
          // Remove resolved/archived from known set
          convos
            .filter((c) => c.status === "resolved" || c.status === "archived")
            .forEach((c) => prevHandoffIds.current.delete(c.id));
        }
      }
    } catch (e) {
      if (!isPolling) console.error("Failed to load conversations:", e);
    } finally {
      if (!isPolling) setLoadingConvos(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchConversations();
    // Poll for new conversations every 5 seconds
    const interval = setInterval(() => fetchConversations(true), 5000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  // Fetch messages when conversation is selected + poll
  const fetchMessages = useCallback(async (id: string, isPolling = false) => {
    if (!isPolling) setLoadingMsgs(true);
    try {
      const res = await fetch(`/api/conversations/${id}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      if (!isPolling) {
        console.error("Failed to load messages:", e);
        setMessages([]);
      }
    } finally {
      if (!isPolling) setLoadingMsgs(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedId) { setMessages([]); return; }
    fetchMessages(selectedId);
    // Poll for new messages every 3 seconds
    const interval = setInterval(() => fetchMessages(selectedId, true), 3000);
    return () => clearInterval(interval);
  }, [selectedId, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const filteredConversations = conversations.filter((c) => {
    const matchesSearch = !searchQuery || 
      c.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.customer_phone.includes(searchQuery);
    const matchesStatus = filterStatus === "all" || c.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const selectedConvo = conversations.find((c) => c.id === selectedId);

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedId || sending) return;
    const text = newMessage;
    setNewMessage("");
    setSending(true);

    // Optimistic UI update
    const optimisticMsg: Message = {
      id: `m_new_${Date.now()}`,
      conversation_id: selectedId,
      tenant_id: "",
      direction: "outbound",
      sender_type: "agent",
      message_type: "text",
      content: { text },
      status: "sent",
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const res = await fetch(`/api/conversations/${selectedId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (res.ok || res.status === 207) {
        const saved = await res.json();
        setMessages((prev) => prev.map((m) => m.id === optimisticMsg.id ? saved : m));
        if (res.status === 207) {
          toast(saved._deliveryError || "Message saved but WhatsApp delivery failed. Check your WhatsApp integration settings.", "warning");
        }
      } else {
        toast("Failed to send message. Please try again.", "error");
      }
    } catch {
      toast("Failed to send message", "error");
    }

    // Update conversation status to handoff
    try {
      await fetch(`/api/conversations/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "handoff", ai_enabled: false }),
      });
    } catch { /* best effort */ }

    setConversations((prev) =>
      prev.map((c) => c.id === selectedId && c.status === "active" ? { ...c, status: "handoff" as ConversationStatus, ai_enabled: false } : c)
    );
    setSending(false);
    // Refresh conversations list so latest message preview updates
    fetchConversations(true);
  };

  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getLastMessage = (convoId: string) => {
    if (convoId === selectedId && messages.length > 0) {
      return truncate(messages[messages.length - 1].content.text || "[media]", 50);
    }
    return "Tap to view";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Conversations</h1>
          <p className="text-gray-500 mt-1 text-sm">Manage customer conversations and handoffs</p>
        </div>
        {myAgent && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">You ({myAgent.name}):</span>
            <button
              onClick={toggleOnline}
              disabled={togglingOnline}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                myAgent.is_online
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                  : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
              )}
            >
              {myAgent.is_online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
              {myAgent.is_online ? "Online" : "Offline"}
            </button>
            {myAgent.is_online && (
              <span className="text-[10px] text-gray-400">{myAgent.active_chats}/{myAgent.max_concurrent_chats} chats</span>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-4 lg:gap-6 h-[calc(100vh-12rem)] lg:h-[calc(100vh-10rem)]">
        {/* Conversation List */}
        <Card className={cn("w-full md:w-96 flex flex-col shrink-0", selectedId ? "hidden md:flex" : "flex")}>
          {/* Search & Filter */}
          <div className="p-4 border-b border-gray-100 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {(["all", "active", "handoff", "waiting", "resolved"] as FilterStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                    filterStatus === s
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                  )}
                >
                  {s === "all" ? "All" : statusConfig[s].label}
                  {s !== "all" && (
                    <span className="ml-1 text-[10px]">
                      {conversations.filter((c) => c.status === s).length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation List */}
          <ScrollArea className="flex-1">
            {loadingConvos ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-6 w-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">No conversations found</div>
            ) : (
            <div className="divide-y divide-gray-50">
              {filteredConversations.map((convo) => {
                const status = statusConfig[convo.status];
                const SentimentIcon = convo.sentiment ? sentimentIcon[convo.sentiment] : null;
                return (
                  <button
                    key={convo.id}
                    onClick={() => setSelectedId(convo.id)}
                    className={cn(
                      "w-full flex items-start gap-3 p-4 text-left hover:bg-gray-50 transition-colors",
                      selectedId === convo.id && "bg-emerald-50 hover:bg-emerald-50"
                    )}
                  >
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback>{getInitials(convo.customer_name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {convo.customer_name || convo.customer_phone}
                        </span>
                        <span className="text-[10px] text-gray-400 shrink-0 ml-2">
                          {timeAgo(convo.last_message_at)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {getLastMessage(convo.id)}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium", status.color)}>
                          <status.icon className="h-3 w-3" />
                          {status.label}
                        </span>
                        {SentimentIcon && (
                          <SentimentIcon className={cn("h-3.5 w-3.5", sentimentColor[convo.sentiment!])} />
                        )}
                        {convo.tags.map((tag) => (
                          <span key={tag} className="px-1.5 py-0.5 rounded bg-gray-100 text-[10px] text-gray-500">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            )}
          </ScrollArea>
        </Card>

        {/* Chat Area */}
        <Card className={cn("flex-1 flex flex-col", !selectedId ? "hidden md:flex" : "flex")}>
          {selectedConvo ? (
            <>
              {/* Chat Header */}
              <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedId(null)}
                    className="md:hidden p-1 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                    aria-label="Back to conversations"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <Avatar>
                    <AvatarFallback>{getInitials(selectedConvo.customer_name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      {selectedConvo.customer_name || selectedConvo.customer_phone}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Phone className="h-3 w-3 text-gray-400" />
                      <span className="text-xs text-gray-500">{selectedConvo.customer_phone}</span>
                    </div>
                    {(() => {
                      const escalationReason = selectedConvo.status === "handoff"
                        ? String((selectedConvo.metadata as Record<string, unknown>)?.escalation_reason || "")
                        : "";
                      return escalationReason ? (
                        <div className="flex items-center gap-1 mt-1">
                          <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
                          <span className="text-[10px] text-amber-700 truncate max-w-[200px]">
                            {escalationReason}
                          </span>
                        </div>
                      ) : null;
                    })()}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  {selectedConvo.status !== "handoff" && selectedConvo.status !== "resolved" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={async () => {
                        setConversations((prev) =>
                          prev.map((c) => c.id === selectedId ? { ...c, status: "handoff" as ConversationStatus, ai_enabled: false } : c)
                        );
                        if (selectedId) {
                          try {
                            await fetch(`/api/conversations/${selectedId}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ status: "handoff", ai_enabled: false }),
                            });
                          } catch { /* best effort */ }
                        }
                        toast("Conversation taken over. You are now the agent.", "info");
                      }}
                    >
                      <ArrowLeftRight className="h-3.5 w-3.5" />
                      Take Over
                    </Button>
                  )}
                  {selectedConvo.status === "handoff" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                      onClick={async () => {
                        setConversations((prev) =>
                          prev.map((c) => c.id === selectedId ? { ...c, status: "active" as ConversationStatus, ai_enabled: true } : c)
                        );
                        if (selectedId) {
                          try {
                            await fetch(`/api/conversations/${selectedId}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ status: "active", ai_enabled: true }),
                            });
                          } catch { /* best effort */ }
                        }
                        toast("AI is back in control of this conversation.", "success");
                      }}
                    >
                      <Bot className="h-3.5 w-3.5" />
                      Return to AI
                    </Button>
                  )}
                  {selectedConvo.status !== "resolved" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                      onClick={async () => {
                        setConversations((prev) =>
                          prev.map((c) => c.id === selectedId ? { ...c, status: "resolved" as ConversationStatus } : c)
                        );
                        if (selectedId) {
                          try {
                            await fetch(`/api/conversations/${selectedId}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ status: "resolved" }),
                            });
                          } catch { /* best effort */ }
                        }
                        toast("Conversation resolved successfully");
                      }}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Resolve
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 px-6 py-4">
                {loadingMsgs ? (
                  <div className="flex items-center justify-center h-full py-12">
                    <div className="h-6 w-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((msg) => {
                      const isInbound = msg.direction === "inbound";
                      return (
                        <div key={msg.id} className={cn("flex", isInbound ? "justify-start" : "justify-end")}>
                          <div className={cn("max-w-[70%] space-y-1")}>
                            {/* Sender label */}
                            <div className={cn("flex items-center gap-1.5 text-[10px]", isInbound ? "" : "justify-end")}>
                              {msg.sender_type === "bot" && <Bot className="h-3 w-3 text-emerald-500" />}
                              {msg.sender_type === "agent" && <UserCheck className="h-3 w-3 text-blue-500" />}
                              {msg.sender_type === "customer" && <User className="h-3 w-3 text-gray-400" />}
                              <span className="text-gray-400">
                                {msg.sender_type === "bot" ? "AI Bot" : msg.sender_type === "agent" ? "Agent" : selectedConvo.customer_name || "Customer"}
                              </span>
                            </div>
                            {/* Message bubble */}
                            <div
                              className={cn(
                                "rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed",
                                isInbound
                                  ? "bg-gray-100 text-gray-900 rounded-tl-sm"
                                  : msg.sender_type === "bot"
                                  ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-tr-sm"
                                  : "bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-tr-sm"
                              )}
                            >
                              <MessageBubbleContent msg={msg} isInbound={isInbound} />
                            </div>
                            {/* Timestamp & status */}
                            <div className={cn("flex items-center gap-1 text-[10px] text-gray-400", !isInbound && "justify-end")}>
                              <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                              {!isInbound && msg.status === "read" && <CheckCheck className="h-3 w-3 text-blue-500" />}
                              {!isInbound && msg.status === "delivered" && <CheckCheck className="h-3 w-3 text-gray-400" />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Canned Responses */}
              {showCanned && (
                <div className="px-6 py-2 border-t border-gray-100 bg-gray-50">
                  <div className="flex flex-wrap gap-1.5">
                    {cannedResponses.map((cr) => (
                      <button
                        key={cr.label}
                        onClick={() => { setNewMessage(cr.text); setShowCanned(false); }}
                        className="px-2.5 py-1 rounded-full text-xs bg-white border border-gray-200 text-gray-700 hover:bg-emerald-50 hover:border-emerald-200 transition-colors"
                      >
                        {cr.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Message Input */}
              <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0"
                    onClick={() => setShowCanned(!showCanned)}
                    title="Quick responses"
                  >
                    <Zap className="h-4 w-4 text-amber-500" />
                  </Button>
                  <Input
                    placeholder={
                      selectedConvo.status === "handoff"
                        ? "Type a message as agent..."
                        : "Type a message (will be sent as agent)..."
                    }
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                    className="flex-1"
                  />
                  <Button onClick={handleSend} disabled={!newMessage.trim() || sending} size="icon">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                {selectedConvo.ai_enabled && selectedConvo.status === "active" && (
                  <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
                    <Bot className="h-3 w-3" />
                    AI is handling this conversation. Sending a message will take over as agent.
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center space-y-2">
                <MessageSquare className="h-12 w-12 mx-auto text-gray-300" />
                <p className="text-sm">Select a conversation to view</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Message Bubble Content — renders text, media, location, interactive */
/* ------------------------------------------------------------------ */
function MessageBubbleContent({ msg, isInbound }: { msg: Message; isInbound: boolean }) {
  const c = msg.content;
  const textColor = isInbound ? "text-gray-500" : "text-white/70";
  const linkColor = isInbound ? "text-emerald-600 underline" : "text-white underline";

  switch (msg.message_type) {
    case "image":
      return (
        <div className="space-y-1.5">
          {c.media_url ? (
            <img src={c.media_url} alt={c.caption || "Image"} className="rounded-lg max-w-full max-h-60 object-cover" />
          ) : (
            <div className="flex items-center gap-2 py-2">
              <Image className="h-5 w-5 shrink-0 opacity-70" />
              <span className="text-xs opacity-70">Image received</span>
            </div>
          )}
          {c.caption && <p>{c.caption}</p>}
        </div>
      );

    case "audio":
      return (
        <div className="flex items-center gap-2 py-1">
          <Mic className="h-5 w-5 shrink-0 opacity-80" />
          {c.media_url ? (
            <audio controls src={c.media_url} className="h-8 max-w-[200px]" />
          ) : (
            <span className="text-xs opacity-70">Voice message received</span>
          )}
        </div>
      );

    case "video":
      return (
        <div className="space-y-1.5">
          {c.media_url ? (
            <video controls src={c.media_url} className="rounded-lg max-w-full max-h-60" />
          ) : (
            <div className="flex items-center gap-2 py-2">
              <Video className="h-5 w-5 shrink-0 opacity-70" />
              <span className="text-xs opacity-70">Video received</span>
            </div>
          )}
          {c.caption && <p>{c.caption}</p>}
        </div>
      );

    case "document":
      return (
        <div className="flex items-center gap-2 py-1">
          <FileText className="h-5 w-5 shrink-0 opacity-80" />
          <div className="min-w-0">
            {c.media_url ? (
              <a href={c.media_url} target="_blank" rel="noopener noreferrer" className={linkColor}>
                {c.caption || "Document"}
              </a>
            ) : (
              <span className="text-xs opacity-70">{c.caption || "Document received"}</span>
            )}
            {c.mime_type && <p className={cn("text-[10px]", textColor)}>{c.mime_type}</p>}
          </div>
        </div>
      );

    case "location":
      return (
        <div className="flex items-center gap-2 py-1">
          <MapPin className="h-5 w-5 shrink-0 opacity-80" />
          {c.latitude && c.longitude ? (
            <a
              href={`https://maps.google.com/?q=${c.latitude},${c.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className={linkColor}
            >
              View location ({c.latitude.toFixed(4)}, {c.longitude.toFixed(4)})
            </a>
          ) : (
            <span className="text-xs opacity-70">Location shared</span>
          )}
        </div>
      );

    case "interactive":
      return (
        <div className="space-y-2">
          {c.text && <p>{c.text}</p>}
          {c.interactive?.buttons && (
            <div className="flex flex-wrap gap-1 pt-1">
              {c.interactive.buttons.map((btn) => (
                <span
                  key={btn.id}
                  className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-medium",
                    isInbound ? "bg-gray-200 text-gray-700" : "bg-white/20 text-white"
                  )}
                >
                  {btn.title}
                </span>
              ))}
            </div>
          )}
        </div>
      );

    case "sticker":
      return (
        <div className="flex items-center gap-2 py-1">
          <span className="text-2xl">🏷️</span>
          <span className="text-xs opacity-70">Sticker</span>
        </div>
      );

    case "reaction":
      return <span className="text-xl">{c.text || "👍"}</span>;

    default:
      // Text message (most common) — also handle links
      if (c.text) {
        return <>{renderTextWithLinks(c.text)}</>;
      }
      return <span className="text-xs opacity-70">Unsupported message</span>;
  }
}

/* Render text with clickable links */
function renderTextWithLinks(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  if (parts.length === 1) return <>{text}</>;
  return (
    <>
      {parts.map((part, i) =>
        urlRegex.test(part) ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline break-all">
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}
