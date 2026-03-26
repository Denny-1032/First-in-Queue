"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Bot,
  Brain,
  MessageCircle,
  Sparkles,
  BookOpen,
  Plus,
  Trash2,
  Save,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import type { BotPersonality, FAQ, KnowledgeEntry } from "@/types";

const defaultPersonality: BotPersonality = {
  name: "Alex",
  tone: "friendly",
  emoji_usage: "moderate",
  response_style: "balanced",
};

const defaultKnowledge: KnowledgeEntry[] = [
  { id: "1", topic: "Shipping Policy", content: "Free shipping on orders over $50. Standard 3-5 days, Express 1-2 days for $9.99.", keywords: ["shipping", "delivery"] },
  { id: "2", topic: "Return Policy", content: "30-day returns. Items must be unused and in original packaging.", keywords: ["return", "refund"] },
  { id: "3", topic: "Payment Methods", content: "We accept Visa, Mastercard, PayPal, and Apple Pay.", keywords: ["payment", "pay"] },
];

const defaultFaqs: FAQ[] = [
  { id: "1", question: "How do I track my order?", answer: "Use the tracking link sent to your email after shipment.", category: "orders" },
  { id: "2", question: "What is your return policy?", answer: "We offer a 30-day return policy for unused items in original packaging.", category: "returns" },
];

export default function AIConfigPage() {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [personality, setPersonality] = useState<BotPersonality>(defaultPersonality);
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeEntry[]>(defaultKnowledge);
  const [faqs, setFaqs] = useState<FAQ[]>(defaultFaqs);
  const [customInstructions, setCustomInstructions] = useState(
    "Always try to upsell related products when appropriate. Mention ongoing promotions if any."
  );

  // Load config from API on mount
  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch("/api/tenants");
        if (!res.ok) return;
        const tenants = await res.json();
        if (tenants.length > 0) {
          const tenant = tenants[0];
          setTenantId(tenant.id);
          const cfg = tenant.config;
          if (cfg) {
            if (cfg.personality) setPersonality(cfg.personality);
            if (cfg.knowledge_base?.length) setKnowledgeBase(cfg.knowledge_base);
            if (cfg.faqs?.length) setFaqs(cfg.faqs);
            if (cfg.custom_instructions) setCustomInstructions(cfg.custom_instructions);
          }
        }
      } catch { /* use defaults */ }
    }
    loadConfig();
  }, []);

  const toneOptions = [
    { value: "professional", label: "Professional", desc: "Polished and business-like" },
    { value: "friendly", label: "Friendly", desc: "Warm and approachable" },
    { value: "casual", label: "Casual", desc: "Relaxed and informal" },
    { value: "formal", label: "Formal", desc: "Proper and formal" },
  ] as const;

  const emojiOptions = [
    { value: "none", label: "None" },
    { value: "minimal", label: "Minimal" },
    { value: "moderate", label: "Moderate" },
    { value: "heavy", label: "Heavy" },
  ] as const;

  const styleOptions = [
    { value: "concise", label: "Concise", desc: "Short and to the point" },
    { value: "balanced", label: "Balanced", desc: "Informative but not verbose" },
    { value: "detailed", label: "Detailed", desc: "Thorough and comprehensive" },
  ] as const;

  const addKnowledgeEntry = () => {
    setKnowledgeBase([...knowledgeBase, { id: Date.now().toString(), topic: "", content: "", keywords: [] }]);
  };

  const removeKnowledgeEntry = (id: string) => {
    setKnowledgeBase(knowledgeBase.filter((k) => k.id !== id));
  };

  const addFaq = () => {
    setFaqs([...faqs, { id: Date.now().toString(), question: "", answer: "" }]);
  };

  const removeFaq = (id: string) => {
    setFaqs(faqs.filter((f) => f.id !== id));
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Configuration</h1>
          <p className="text-gray-500 mt-1">Customize how your AI assistant behaves and responds</p>
        </div>
        <Button
          className="gap-2"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            if (tenantId) {
              try {
                const res = await fetch(`/api/tenants/${tenantId}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    config: {
                      personality,
                      knowledge_base: knowledgeBase,
                      faqs,
                      custom_instructions: customInstructions,
                    },
                  }),
                });
                if (res.ok) {
                  toast("AI configuration saved successfully");
                } else {
                  toast("Failed to save configuration", "error");
                }
              } catch {
                toast("Failed to save configuration", "error");
              }
            } else {
              await new Promise((r) => setTimeout(r, 500));
              toast("AI configuration saved (demo mode)");
            }
            setSaving(false);
          }}
        >
          {saving ? (
            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Bot Personality */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-emerald-600" />
            <CardTitle>Bot Personality</CardTitle>
          </div>
          <CardDescription>Define your bot&apos;s character and communication style</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Bot Name</label>
            <Input
              value={personality.name}
              onChange={(e) => setPersonality({ ...personality, name: e.target.value })}
              placeholder="e.g., Alex, Maya, Support Bot"
              className="max-w-xs"
            />
            <p className="text-xs text-gray-400 mt-1">This name will be used when the bot introduces itself</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-3 block">Tone of Voice</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {toneOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPersonality({ ...personality, tone: opt.value })}
                  className={cn(
                    "rounded-xl border-2 p-4 text-left transition-all",
                    personality.tone === opt.value
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <p className="text-sm font-medium text-gray-900">{opt.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-3 block">Emoji Usage</label>
            <div className="flex gap-2">
              {emojiOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPersonality({ ...personality, emoji_usage: opt.value })}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    personality.emoji_usage === opt.value
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-3 block">Response Style</label>
            <div className="grid grid-cols-3 gap-3">
              {styleOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPersonality({ ...personality, response_style: opt.value })}
                  className={cn(
                    "rounded-xl border-2 p-4 text-left transition-all",
                    personality.response_style === opt.value
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <p className="text-sm font-medium text-gray-900">{opt.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Knowledge Base */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-600" />
              <CardTitle>Knowledge Base</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={addKnowledgeEntry} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Add Entry
            </Button>
          </div>
          <CardDescription>Add business information the AI should know about</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {knowledgeBase.map((entry, i) => (
            <div key={entry.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="secondary">Entry {i + 1}</Badge>
                <button onClick={() => removeKnowledgeEntry(entry.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <Input
                placeholder="Topic (e.g., Shipping Policy)"
                value={entry.topic}
                onChange={(e) => {
                  const updated = [...knowledgeBase];
                  updated[i] = { ...entry, topic: e.target.value };
                  setKnowledgeBase(updated);
                }}
              />
              <textarea
                placeholder="Content — what should the AI know about this topic?"
                value={entry.content}
                onChange={(e) => {
                  const updated = [...knowledgeBase];
                  updated[i] = { ...entry, content: e.target.value };
                  setKnowledgeBase(updated);
                }}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[80px] resize-y"
              />
              <Input
                placeholder="Keywords (comma-separated)"
                value={entry.keywords.join(", ")}
                onChange={(e) => {
                  const updated = [...knowledgeBase];
                  updated[i] = { ...entry, keywords: e.target.value.split(",").map((k) => k.trim()) };
                  setKnowledgeBase(updated);
                }}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* FAQs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-blue-600" />
              <CardTitle>FAQs</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={addFaq} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Add FAQ
            </Button>
          </div>
          <CardDescription>Common questions and their answers for the AI to reference</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {faqs.map((faq, i) => (
            <div key={faq.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="secondary">FAQ {i + 1}</Badge>
                <button onClick={() => removeFaq(faq.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <Input
                placeholder="Question"
                value={faq.question}
                onChange={(e) => {
                  const updated = [...faqs];
                  updated[i] = { ...faq, question: e.target.value };
                  setFaqs(updated);
                }}
              />
              <textarea
                placeholder="Answer"
                value={faq.answer}
                onChange={(e) => {
                  const updated = [...faqs];
                  updated[i] = { ...faq, answer: e.target.value };
                  setFaqs(updated);
                }}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[60px] resize-y"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Custom Instructions */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <CardTitle>Custom Instructions</CardTitle>
          </div>
          <CardDescription>Additional instructions for the AI to follow in every conversation</CardDescription>
        </CardHeader>
        <CardContent>
          <textarea
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            placeholder="e.g., Always mention our current promotion. Never discuss competitor products..."
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[120px] resize-y"
          />
          <div className="flex items-start gap-2 mt-3 p-3 rounded-lg bg-amber-50 border border-amber-100">
            <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              These instructions are added to every AI conversation. Be specific and clear. Conflicting instructions may confuse the AI.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
