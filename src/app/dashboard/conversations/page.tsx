"use client";

import { useEffect, useState, useRef } from "react";
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
  MoreVertical,
  Phone,
  Clock,
  CheckCheck,
  Smile,
  Meh,
  Frown,
  ArrowLeftRight,
  CheckCircle2,
  XCircle,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { timeAgo, truncate } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import type { Conversation, Message, ConversationStatus } from "@/types";

// Mock data for demo
const mockConversations: Conversation[] = [
  {
    id: "1", tenant_id: "t1", customer_phone: "+1234567890", customer_name: "Sarah Johnson",
    status: "active", ai_enabled: true, sentiment: "positive", tags: ["vip"], metadata: {},
    last_message_at: new Date(Date.now() - 120000).toISOString(), created_at: new Date(Date.now() - 3600000).toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: "2", tenant_id: "t1", customer_phone: "+1987654321", customer_name: "Marcus Chen",
    status: "handoff", assigned_agent_id: "a1", ai_enabled: false, sentiment: "negative", tags: ["complaint"], metadata: {},
    last_message_at: new Date(Date.now() - 300000).toISOString(), created_at: new Date(Date.now() - 7200000).toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: "3", tenant_id: "t1", customer_phone: "+1555000111", customer_name: "Emily Davis",
    status: "active", ai_enabled: true, sentiment: "neutral", tags: [], metadata: {},
    last_message_at: new Date(Date.now() - 600000).toISOString(), created_at: new Date(Date.now() - 1800000).toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: "4", tenant_id: "t1", customer_phone: "+1555000222", customer_name: "James Wilson",
    status: "waiting", ai_enabled: true, sentiment: "negative", tags: ["urgent"], metadata: {},
    last_message_at: new Date(Date.now() - 900000).toISOString(), created_at: new Date(Date.now() - 5400000).toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: "5", tenant_id: "t1", customer_phone: "+1555000333", customer_name: "Aisha Patel",
    status: "resolved", ai_enabled: true, sentiment: "positive", tags: [], metadata: {},
    last_message_at: new Date(Date.now() - 1800000).toISOString(), created_at: new Date(Date.now() - 86400000).toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: "6", tenant_id: "t1", customer_phone: "+1555000444", customer_name: "David Kim",
    status: "active", ai_enabled: true, sentiment: "positive", tags: ["returning"], metadata: {},
    last_message_at: new Date(Date.now() - 2400000).toISOString(), created_at: new Date(Date.now() - 3600000).toISOString(), updated_at: new Date().toISOString(),
  },
];

const mockMessages: Record<string, Message[]> = {
  "1": [
    { id: "m1", conversation_id: "1", tenant_id: "t1", direction: "inbound", sender_type: "customer", message_type: "text", content: { text: "Hi! I placed an order yesterday and was wondering about the delivery status." }, status: "read", created_at: new Date(Date.now() - 3600000).toISOString() },
    { id: "m2", conversation_id: "1", tenant_id: "t1", direction: "outbound", sender_type: "bot", message_type: "text", content: { text: "Hello Sarah! 👋 Thanks for reaching out. I'd be happy to help you track your order. Could you please share your order number?" }, status: "read", created_at: new Date(Date.now() - 3540000).toISOString() },
    { id: "m3", conversation_id: "1", tenant_id: "t1", direction: "inbound", sender_type: "customer", message_type: "text", content: { text: "Sure! It's #ORD-2024-8847" }, status: "read", created_at: new Date(Date.now() - 3000000).toISOString() },
    { id: "m4", conversation_id: "1", tenant_id: "t1", direction: "outbound", sender_type: "bot", message_type: "text", content: { text: "I found your order #ORD-2024-8847! 📦\n\nHere's the status:\n✅ Order confirmed\n✅ Payment processed\n✅ Packed & shipped\n🚚 In transit — Expected delivery: Tomorrow by 5 PM\n\nYour tracking number is: TRK-99281746\n\nIs there anything else I can help with?" }, status: "read", created_at: new Date(Date.now() - 2940000).toISOString() },
    { id: "m5", conversation_id: "1", tenant_id: "t1", direction: "inbound", sender_type: "customer", message_type: "text", content: { text: "That's great, thank you so much! Can I also change the delivery address?" }, status: "read", created_at: new Date(Date.now() - 120000).toISOString() },
  ],
  "2": [
    { id: "m6", conversation_id: "2", tenant_id: "t1", direction: "inbound", sender_type: "customer", message_type: "text", content: { text: "I received a damaged product and I want a refund immediately!" }, status: "read", created_at: new Date(Date.now() - 7200000).toISOString() },
    { id: "m7", conversation_id: "2", tenant_id: "t1", direction: "outbound", sender_type: "bot", message_type: "text", content: { text: "I'm really sorry to hear about the damaged product, Marcus. That's definitely not the experience we want you to have. Let me connect you with a team member who can process your refund right away." }, status: "read", created_at: new Date(Date.now() - 7140000).toISOString() },
    { id: "m8", conversation_id: "2", tenant_id: "t1", direction: "outbound", sender_type: "agent", message_type: "text", content: { text: "Hi Marcus, this is Alex from our support team. I can see your order and I'm sorry about the damage. I've initiated a full refund which will be processed within 3-5 business days. We're also sending a replacement at no extra cost. Would you like to share a photo of the damage for our records?" }, status: "delivered", created_at: new Date(Date.now() - 300000).toISOString() },
  ],
};

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
  const [conversations, setConversations] = useState<Conversation[]>(mockConversations);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [usingMock, setUsingMock] = useState(false);

  // Fetch conversations from API
  useEffect(() => {
    async function fetchConversations() {
      setLoadingConvos(true);
      try {
        const res = await fetch("/api/conversations");
        if (res.ok) {
          const data = await res.json();
          if (data.conversations && data.conversations.length > 0) {
            setConversations(data.conversations);
            setSelectedId(data.conversations[0].id);
            setUsingMock(false);
            setLoadingConvos(false);
            return;
          }
        }
      } catch { /* fallback to mock */ }
      setConversations(mockConversations);
      setSelectedId("1");
      setUsingMock(true);
      setLoadingConvos(false);
    }
    fetchConversations();
  }, []);

  // Fetch messages when conversation is selected
  useEffect(() => {
    if (!selectedId) { setMessages([]); return; }
    const id = selectedId;
    if (usingMock) {
      setMessages(mockMessages[id] || []);
      return;
    }
    async function fetchMessages() {
      setLoadingMsgs(true);
      try {
        const res = await fetch(`/api/conversations/${id}/messages`);
        if (res.ok) {
          const data = await res.json();
          setMessages(Array.isArray(data) ? data : []);
          setLoadingMsgs(false);
          return;
        }
      } catch { /* fallback */ }
      setMessages(mockMessages[id] || []);
      setLoadingMsgs(false);
    }
    fetchMessages();
  }, [selectedId, usingMock]);

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
      tenant_id: "t1",
      direction: "outbound",
      sender_type: "agent",
      message_type: "text",
      content: { text },
      status: "sent",
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    if (!usingMock) {
      try {
        const res = await fetch(`/api/conversations/${selectedId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        if (res.ok) {
          const saved = await res.json();
          setMessages((prev) => prev.map((m) => m.id === optimisticMsg.id ? saved : m));
        } else {
          toast("Failed to send message via WhatsApp", "error");
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
    }

    setConversations((prev) =>
      prev.map((c) => c.id === selectedId && c.status === "active" ? { ...c, status: "handoff" as ConversationStatus, ai_enabled: false } : c)
    );
    setSending(false);
  };

  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getLastMessage = (convoId: string) => {
    if (usingMock) {
      const msgs = mockMessages[convoId];
      if (!msgs || msgs.length === 0) return "No messages yet";
      return truncate(msgs[msgs.length - 1].content.text || "[media]", 50);
    }
    if (convoId === selectedId && messages.length > 0) {
      return truncate(messages[messages.length - 1].content.text || "[media]", 50);
    }
    return "Tap to view";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Conversations</h1>
        <p className="text-gray-500 mt-1">Manage customer conversations and handoffs</p>
      </div>

      <div className="flex gap-6 h-[calc(100vh-12rem)]">
        {/* Conversation List */}
        <Card className="w-96 flex flex-col shrink-0">
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
        <Card className="flex-1 flex flex-col">
          {selectedConvo ? (
            <>
              {/* Chat Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
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
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedConvo.status !== "handoff" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={async () => {
                        setConversations((prev) =>
                          prev.map((c) => c.id === selectedId ? { ...c, status: "handoff" as ConversationStatus, ai_enabled: false } : c)
                        );
                        if (!usingMock && selectedId) {
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
                  {selectedConvo.status !== "resolved" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                      onClick={async () => {
                        setConversations((prev) =>
                          prev.map((c) => c.id === selectedId ? { ...c, status: "resolved" as ConversationStatus } : c)
                        );
                        if (!usingMock && selectedId) {
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
                            {msg.content.text}
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
              </ScrollArea>

              {/* Message Input */}
              <div className="px-6 py-4 border-t border-gray-100">
                <div className="flex items-center gap-3">
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
                  <Button onClick={handleSend} disabled={!newMessage.trim()} size="icon">
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
