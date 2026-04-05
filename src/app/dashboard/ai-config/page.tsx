"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  Send,
  RotateCcw,
  User,
  FileText,
  Upload,
  Wand2,
  UserCheck,
  Globe,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { parseMarkdownToKnowledgeEntries } from "@/lib/knowledge-parser";
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
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [businessDescription, setBusinessDescription] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Knowledge selection state
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());

  // Web crawl state
  const [showCrawl, setShowCrawl] = useState(false);
  const [crawlUrl, setCrawlUrl] = useState("");
  const [crawling, setCrawling] = useState(false);
  const [crawlProgress, setCrawlProgress] = useState("");

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
    setSelectedEntries((prev) => { const next = new Set(prev); next.delete(id); return next; });
  };

  const toggleSelectEntry = (id: string) => {
    setSelectedEntries((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedEntries.size === knowledgeBase.length) {
      setSelectedEntries(new Set());
    } else {
      setSelectedEntries(new Set(knowledgeBase.map((k) => k.id)));
    }
  };

  const deleteSelectedEntries = () => {
    if (selectedEntries.size === 0) return;
    setKnowledgeBase((prev) => prev.filter((k) => !selectedEntries.has(k.id)));
    toast(`Deleted ${selectedEntries.size} knowledge entries`);
    setSelectedEntries(new Set());
  };

  const addFaq = () => {
    setFaqs([...faqs, { id: Date.now().toString(), question: "", answer: "" }]);
  };

  const removeFaq = (id: string) => {
    setFaqs(faqs.filter((f) => f.id !== id));
  };

  // Helper function to extract keywords from text
  const extractKeywordsFromText = (text: string): string[] => {
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'shall', 'this', 'that', 'these', 'those']);
    
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 10); // Limit to 10 keywords
  };

  return (
    <div className="space-y-8 w-full pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">AI Configuration</h1>
          <p className="text-gray-500 mt-1 text-sm">Configure your AI assistant</p>
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
              toast("Unable to save — no business account found. Please log out and sign up again.", "error");
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
            <div className="flex gap-2 flex-wrap">
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
            <div className="flex gap-2 flex-wrap">
              {selectedEntries.size > 0 && (
                <Button variant="outline" size="sm" onClick={deleteSelectedEntries} className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50">
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete {selectedEntries.size}
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => { setShowCrawl(!showCrawl); setShowBulkImport(false); }} className="gap-1.5">
                <Globe className="h-3.5 w-3.5" />
                Crawl Website
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setShowBulkImport(!showBulkImport); setShowCrawl(false); }} className="gap-1.5">
                <Upload className="h-3.5 w-3.5" />
                Quick Setup
              </Button>
              <Button variant="outline" size="sm" onClick={addKnowledgeEntry} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Add Entry
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Web Crawl Panel */}
          {showCrawl && (
            <div className="rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/50 p-5 space-y-4">
              <div className="flex items-center gap-2 text-blue-700">
                <Globe className="h-4 w-4" />
                <p className="text-sm font-semibold">Crawl Website for Knowledge</p>
              </div>
              <p className="text-xs text-blue-600">
                Enter a website URL and we&apos;ll crawl all its pages to automatically extract and structure knowledge for your AI assistant.
              </p>
              <div className="flex items-center gap-2">
                <Input
                  value={crawlUrl}
                  onChange={(e) => setCrawlUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="flex-1 bg-white border-blue-200 focus:ring-blue-500"
                  disabled={crawling}
                />
                <Button
                  size="sm"
                  className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shrink-0"
                  disabled={!crawlUrl.trim() || crawling}
                  onClick={async () => {
                    let urlToCrawl = crawlUrl.trim();
                    if (!urlToCrawl) return;
                    if (!/^https?:\/\//i.test(urlToCrawl)) {
                      urlToCrawl = "https://" + urlToCrawl;
                      setCrawlUrl(urlToCrawl);
                    }

                    setCrawling(true);
                    setCrawlProgress("Starting crawl...");

                    try {
                      const res = await fetch("/api/knowledge/crawl", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ url: urlToCrawl }),
                      });

                      const data = await res.json();

                      if (!res.ok) {
                        toast(data.error || "Failed to crawl website", "error");
                        setCrawlProgress("");
                        return;
                      }

                      if (data.entries && data.entries.length > 0) {
                        setKnowledgeBase((prev) => [...prev, ...data.entries]);
                        toast(
                          `Crawled ${data.pagesCrawled} pages and added ${data.entries.length} knowledge entries from ${data.source}`
                        );
                        setCrawlUrl("");
                        setShowCrawl(false);
                      } else {
                        toast("No knowledge entries could be extracted from this website", "warning");
                      }
                      setCrawlProgress("");
                    } catch (err) {
                      toast("Failed to crawl website. Please check the URL and try again.", "error");
                      setCrawlProgress("");
                    } finally {
                      setCrawling(false);
                    }
                  }}
                >
                  {crawling ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Globe className="h-3.5 w-3.5" />
                  )}
                  {crawling ? "Crawling..." : "Start Crawl"}
                </Button>
              </div>
              {crawling && crawlProgress && (
                <div className="flex items-center gap-2 text-xs text-blue-600">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>{crawlProgress}</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={() => { setShowCrawl(false); setCrawlProgress(""); }}>
                  Cancel
                </Button>
                <span className="text-[11px] text-blue-400">Crawls up to 30 pages from the same domain</span>
              </div>
            </div>
          )}

          {/* Quick Setup: Business Description */}
          {showBulkImport && (
            <div className="rounded-xl border-2 border-dashed border-purple-200 bg-purple-50/50 p-5 space-y-4">
              <div className="flex items-center gap-2 text-purple-700">
                <Wand2 className="h-4 w-4" />
                <p className="text-sm font-semibold">Quick Knowledge Setup</p>
              </div>
              <p className="text-xs text-purple-600">
                Paste a description or upload a file (.txt, .csv, .md) with your business info. We&apos;ll organize it into knowledge entries.
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileText className="h-3.5 w-3.5" />
                  Upload File
                </Button>
                <span className="text-xs text-purple-400">Supports .txt, .csv, .md files</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.csv,.md,.markdown,.text"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      const text = ev.target?.result as string;
                      if (text) {
                        // Check if it's a markdown file
                        if (file.name.endsWith('.md') || file.name.endsWith('.markdown')) {
                          // Parse markdown directly into knowledge entries
                          const parsedEntries = parseMarkdownToKnowledgeEntries(text);
                          if (parsedEntries.length > 0) {
                            setKnowledgeBase(prev => [...prev, ...parsedEntries]);
                            toast(`Added ${parsedEntries.length} knowledge entries from ${file.name}`);
                            return;
                          }
                        }
                        // For other files, add to business description
                        setBusinessDescription((prev) => prev ? prev + "\n\n" + text : text);
                      }
                    };
                    reader.readAsText(file);
                    e.target.value = "";
                  }}
                />
              </div>
              <textarea
                value={businessDescription}
                onChange={(e) => setBusinessDescription(e.target.value)}
                placeholder={`Example:\nWe are TechGadgets, an online electronics store.\n\nProducts: Laptops, phones, tablets, accessories.\nShipping: Free on orders over $50. Standard 3-5 days. Express 1-2 days for $9.99.\nReturns: 30-day return policy. Items must be unused.\nPayment: Visa, Mastercard, PayPal, Apple Pay.\nSupport hours: Mon-Fri 9AM-6PM.\nWarranty: 1-year manufacturer warranty on all electronics.\nContact: support@techgadgets.com or call 1-800-TECH`}
                className="w-full rounded-lg border border-purple-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[160px] resize-y"
              />
              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  className="gap-1.5 bg-purple-600 hover:bg-purple-700"
                  disabled={!businessDescription.trim()}
                  onClick={() => {
                    const text = businessDescription.trim();
                    if (!text) return;

                    // Try to parse as markdown first
                    if (text.includes('#') || text.includes('##')) {
                      const parsedEntries = parseMarkdownToKnowledgeEntries(text);
                      if (parsedEntries.length > 0) {
                        setKnowledgeBase((prev) => [...prev, ...parsedEntries]);
                        toast(`Added ${parsedEntries.length} knowledge entries from markdown content`);
                        setBusinessDescription("");
                        setShowBulkImport(false);
                        return;
                      }
                    }

                    // Parse structured text
                    const sections = text.split(/\n\s*\n/).filter(section => section.trim());
                    const entries: KnowledgeEntry[] = [];

                    for (const section of sections) {
                      const lines = section.split('\n').map(l => l.trim()).filter(l => l);
                      if (lines.length === 0) continue;

                      // Check if this is a topic:content format
                      const topicMatch = lines[0].match(/^([^:]+):\s*(.*)$/);
                      if (topicMatch && topicMatch[1].length < 80) {
                        const topic = topicMatch[1].trim();
                        let content = topicMatch[2] || "";
                        
                        // Add remaining lines to content
                        if (lines.length > 1) {
                          content += (content ? "\n" : "") + lines.slice(1).join("\n");
                        }

                        if (content.trim()) {
                          entries.push({
                            id: Date.now().toString() + entries.length,
                            topic: topic,
                            content: content.trim(),
                            keywords: extractKeywordsFromText(topic + " " + content),
                          });
                        }
                      } else {
                        // Treat as general information
                        const content = lines.join("\n");
                        if (content.length > 20) {
                          // Try to extract a topic from the first sentence
                          const firstSentence = content.split(/[.!?]/)[0];
                          const topic = firstSentence.length < 60 ? firstSentence : "Business Information";
                          
                          entries.push({
                            id: Date.now().toString() + entries.length,
                            topic: topic,
                            content: content,
                            keywords: extractKeywordsFromText(content),
                          });
                        }
                      }
                    }

                    if (entries.length === 0) {
                      toast("Could not parse entries. Try using 'Topic: content' format or markdown headers.", "warning");
                      return;
                    }

                    // Generate FAQs from parsed knowledge entries
                    const faqTemplates: Array<{
                      patterns: RegExp;
                      questions: string[];
                    }> = [
                      {
                        patterns: /shipping|deliver|dispatch|send/i,
                        questions: ["How long does delivery take?", "How much does shipping cost?", "Do you offer free shipping?"],
                      },
                      {
                        patterns: /return|exchange|refund|money back/i,
                        questions: ["What is your return policy?", "How do I return an item?", "Can I get a refund?"],
                      },
                      {
                        patterns: /warranty|guarantee|defect/i,
                        questions: ["What warranty do your products have?", "How do I claim warranty?"],
                      },
                      {
                        patterns: /payment|pay|card|cash|mobile money/i,
                        questions: ["What payment methods do you accept?", "Do you accept mobile money?"],
                      },
                      {
                        patterns: /hours|open|schedule|time|when/i,
                        questions: ["What are your operating hours?", "When are you open?"],
                      },
                      {
                        patterns: /products?|sell|offer|service/i,
                        questions: ["What products do you sell?", "What services do you offer?"],
                      },
                      {
                        patterns: /contact|email|phone|whatsapp|address|location/i,
                        questions: ["How can I contact you?", "Where are you located?"],
                      },
                      {
                        patterns: /price|cost|expensive|cheap|affordable/i,
                        questions: ["What are your prices?", "Do you offer discounts?"],
                      },
                    ];

                    const generatedFaqs: FAQ[] = [];
                    const usedQuestions = new Set(faqs.map((f) => f.question.toLowerCase()));

                    for (const entry of entries) {
                      const combined = `${entry.topic} ${entry.content}`;
                      for (const tpl of faqTemplates) {
                        if (!tpl.patterns.test(combined)) continue;
                        for (const q of tpl.questions) {
                          if (usedQuestions.has(q.toLowerCase())) continue;
                          usedQuestions.add(q.toLowerCase());

                          // Build a concise answer from the entry content
                          let answer = entry.content;
                          if (answer.length > 200) {
                            answer = answer.slice(0, 197).replace(/\s+\S*$/, "") + "...";
                          }

                          generatedFaqs.push({
                            id: `faq_${Date.now()}_${generatedFaqs.length}`,
                            question: q,
                            answer,
                            category: entry.topic.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
                          });
                          break; // Only one question per template per entry
                        }
                      }
                    }

                    setKnowledgeBase((prev) => [...prev, ...entries]);
                    if (generatedFaqs.length > 0) {
                      setFaqs((prev) => [...prev, ...generatedFaqs]);
                    }

                    const parts = [`Added ${entries.length} knowledge entries`];
                    if (generatedFaqs.length > 0) {
                      parts.push(`${generatedFaqs.length} FAQs auto-generated`);
                    }
                    toast(parts.join(" and "));
                    setBusinessDescription("");
                    setShowBulkImport(false);
                  }}
                >
                  <Wand2 className="h-3.5 w-3.5" />
                  Generate Entries & FAQs
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowBulkImport(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {knowledgeBase.length > 0 && (
            <div className="flex items-center gap-3 pb-2 border-b border-gray-100">
              <input
                type="checkbox"
                checked={selectedEntries.size === knowledgeBase.length && knowledgeBase.length > 0}
                onChange={toggleSelectAll}
                className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <span className="text-xs text-gray-500">
                {selectedEntries.size > 0 ? `${selectedEntries.size} of ${knowledgeBase.length} selected` : `Select all (${knowledgeBase.length})`}
              </span>
            </div>
          )}

          {knowledgeBase.map((entry, i) => (
            <div key={entry.id} className={cn("border rounded-lg p-4 space-y-3 transition-colors", selectedEntries.has(entry.id) ? "border-emerald-300 bg-emerald-50/30" : "border-gray-200")}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedEntries.has(entry.id)}
                    onChange={() => toggleSelectEntry(entry.id)}
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <Badge variant="secondary">Entry {i + 1}</Badge>
                </div>
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
        </CardHeader>
        <CardContent>
          <textarea
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            placeholder="e.g., Always mention our current promotion. Never discuss competitor products..."
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[120px] resize-y"
          />
        </CardContent>
      </Card>

      {/* Test Your Bot */}
      <BotTestChat
        personality={personality}
        knowledgeBase={knowledgeBase}
        faqs={faqs}
        customInstructions={customInstructions}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Bot Test Chat Widget                                                */
/* ------------------------------------------------------------------ */
interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  text: string;
}

function BotTestChat({
  personality,
  knowledgeBase,
  faqs,
  customInstructions,
}: {
  personality: BotPersonality;
  knowledgeBase: KnowledgeEntry[];
  faqs: FAQ[];
  customInstructions: string;
}) {
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: "welcome",
      role: "assistant",
      text: `Hi! I'm ${personality.name}, your AI assistant. Send me a message to test how I'll respond to your customers.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevNameRef = useRef(personality.name);

  // Update welcome message when bot name changes
  useEffect(() => {
    if (prevNameRef.current !== personality.name) {
      prevNameRef.current = personality.name;
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === "welcome"
            ? { ...msg, text: `Hi! I'm ${personality.name}, your AI assistant. Send me a message to test how I'll respond to your customers.` }
            : msg
        )
      );
    }
  }, [personality.name]);

  // Auto-scroll to bottom
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  // Simulate AI response locally (no API call — uses current config state)
  const simulateResponse = useCallback(
    (userText: string): string => {
      const lower = userText.toLowerCase().trim();
      // Extract meaningful words (drop common stop words)
      const stopWords = new Set(["i", "me", "my", "we", "our", "you", "your", "the", "a", "an", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did", "will", "would", "could", "should", "can", "may", "might", "shall", "to", "of", "in", "for", "on", "with", "at", "by", "from", "as", "into", "about", "it", "its", "this", "that", "these", "those", "and", "but", "or", "so", "if", "then", "than", "too", "very", "just", "not", "no", "what", "how", "when", "where", "which", "who", "whom", "why", "hi", "hello", "hey", "thanks", "thank", "please", "help", "need", "want", "know", "tell", "me", "any", "some", "there", "here", "much", "many"]);
      const userWords = lower.split(/\s+/).filter((w) => w.length > 1 && !stopWords.has(w));

      // Check for escalation / human request first
      const escalationPhrases = ["speak to a human", "talk to a person", "real person", "human agent", "speak to someone", "talk to agent", "transfer me", "escalate", "manager", "supervisor", "real agent", "human help"];
      if (escalationPhrases.some((p) => lower.includes(p))) {
        return `I understand you'd like to speak with a human agent. Let me connect you right away. 🤝\n\nA team member will be with you shortly. Your conversation history will be shared so you won't need to repeat yourself.`;
      }

      // Check FAQs — fuzzy word overlap matching
      let bestFaqScore = 0;
      let bestFaqAnswer = "";
      for (const faq of faqs) {
        if (!faq.question || !faq.answer) continue;
        const faqWords = faq.question.toLowerCase().split(/\s+/).filter((w) => w.length > 1 && !stopWords.has(w));
        const overlap = userWords.filter((w) => faqWords.some((fw) => fw.includes(w) || w.includes(fw))).length;
        const score = faqWords.length > 0 ? overlap / Math.max(faqWords.length, 1) : 0;
        if (score > bestFaqScore && score >= 0.4) {
          bestFaqScore = score;
          bestFaqAnswer = faq.answer;
        }
      }
      if (bestFaqAnswer) return bestFaqAnswer;

      // Score each knowledge base entry by word overlap with topic, keywords, AND content
      const scored: { entry: KnowledgeEntry; score: number }[] = [];
      for (const kb of knowledgeBase) {
        let score = 0;
        const topicWords = (kb.topic || "").toLowerCase().split(/\s+/);
        const keywordList = (kb.keywords || []).map((k) => k.toLowerCase());
        const contentWords = (kb.content || "").toLowerCase().split(/\s+/);

        for (const w of userWords) {
          // Topic match (high weight)
          if (topicWords.some((tw) => tw.includes(w) || w.includes(tw))) score += 3;
          // Keyword match (high weight)
          if (keywordList.some((kw) => kw.includes(w) || w.includes(kw))) score += 3;
          // Content word match (lower weight)
          if (contentWords.some((cw) => cw === w || (cw.length > 3 && cw.includes(w)))) score += 1;
        }
        if (score > 0) scored.push({ entry: kb, score });
      }

      // Sort by score descending
      scored.sort((a, b) => b.score - a.score);

      const tonePrefix =
        personality.tone === "friendly" ? "Great question! " :
        personality.tone === "casual" ? "Sure thing! " :
        personality.tone === "formal" ? "Thank you for your inquiry. " : "";

      const emojiSuffix = personality.emoji_usage === "heavy" ? " 😊" : personality.emoji_usage === "moderate" ? " 🙂" : "";

      // If we have high-confidence match(es), return them
      if (scored.length > 0 && scored[0].score >= 2) {
        // Combine top matches (up to 2) if they're both relevant
        const top = scored.slice(0, scored[1]?.score >= 2 ? 2 : 1);
        const combined = top.map((s) => s.entry.content).join("\n\n");
        return `${tonePrefix}${combined}${emojiSuffix}`;
      }

      // Low-confidence partial match — still try to answer
      if (scored.length > 0 && scored[0].score >= 1) {
        return `${tonePrefix}Based on what I know, ${scored[0].entry.content}${emojiSuffix}\n\nWould you like to know more about this?`;
      }

      // Greeting detection
      if (/^(hi|hello|hey|howdy|good\s*(morning|afternoon|evening))/.test(lower)) {
        const greetings: Record<string, string> = {
          professional: `Hello! I'm ${personality.name}. How may I assist you today?`,
          friendly: `Hey there! 👋 I'm ${personality.name}. How can I help you today?`,
          casual: `Hey! I'm ${personality.name} 😊 What can I do for you?`,
          formal: `Good day. I am ${personality.name}. How may I be of service?`,
        };
        return greetings[personality.tone] || greetings.friendly;
      }

      // If knowledge base has entries, list available topics as guidance
      if (knowledgeBase.length > 0) {
        const topics = knowledgeBase.slice(0, 5).map((kb) => kb.topic).filter(Boolean).join(", ");
        const noMatch: Record<string, string> = {
          professional: `I'd be happy to help! I can assist with: ${topics}. Which topic would you like to know more about?`,
          friendly: `I'd love to help! 😊 I know about: ${topics}. What would you like to know?`,
          casual: `Hmm, let me see... I can help with: ${topics}. What are you looking for?`,
          formal: `I would be pleased to assist. My areas of knowledge include: ${topics}. How may I help?`,
        };
        return noMatch[personality.tone] || noMatch.friendly;
      }

      // Truly empty knowledge base — generic fallback
      const generic: Record<string, string> = {
        professional: "Thank you for reaching out. I don't have specific information on that yet, but our team can help. Would you like me to connect you with someone?",
        friendly: "Hmm, I don't have info on that yet — my knowledge base is still being set up! Want me to connect you with a team member? 😊",
        casual: "Oops, I don't know about that yet! My brain is still loading 😅 Want to talk to a human instead?",
        formal: "I regret that I do not yet have information pertaining to that matter. Shall I arrange for a team member to assist you?",
      };

      return generic[personality.tone] || generic.friendly;
    },
    [personality, knowledgeBase, faqs]
  );

  const handleSend = () => {
    const text = input.trim();
    if (!text || thinking) return;
    const userMsg: ChatMsg = { id: Date.now().toString(), role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setThinking(true);

    // Simulate typing delay
    setTimeout(() => {
      const reply = simulateResponse(text);
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: "assistant", text: reply },
      ]);
      setThinking(false);
    }, 600 + Math.random() * 800);
  };

  const resetChat = () => {
    prevNameRef.current = personality.name;
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        text: `Hi! I'm ${personality.name}, your AI assistant. Send me a message to test how I'll respond to your customers.`,
      },
    ]);
    setInput("");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-emerald-600" />
            <CardTitle>Test Your Bot</CardTitle>
          </div>
          <Button variant="outline" size="sm" onClick={resetChat} className="gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
        </div>
        <CardDescription>Preview how your bot responds using the current configuration above</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-xl border border-gray-200 bg-gradient-to-b from-gray-50 to-white overflow-hidden">
          {/* Chat header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-emerald-600 text-white">
            <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
              {personality.name.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-medium">{personality.name}</p>
              <p className="text-[10px] text-emerald-100">Online — Test Mode</p>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="h-80 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-2 max-w-[85%]",
                  msg.role === "user" ? "ml-auto flex-row-reverse" : ""
                )}
              >
                <div
                  className={cn(
                    "h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                    msg.role === "user" ? "bg-blue-100" : "bg-emerald-100"
                  )}
                >
                  {msg.role === "user" ? (
                    <User className="h-3 w-3 text-blue-600" />
                  ) : (
                    <Bot className="h-3 w-3 text-emerald-600" />
                  )}
                </div>
                <div
                  className={cn(
                    "rounded-2xl px-3 py-2 text-sm",
                    msg.role === "user"
                      ? "bg-emerald-600 text-white rounded-br-md"
                      : "bg-white border border-gray-200 text-gray-800 rounded-bl-md shadow-sm"
                  )}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {thinking && (
              <div className="flex gap-2 max-w-[85%]">
                <div className="h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="h-3 w-3 text-emerald-600" />
                </div>
                <div className="rounded-2xl rounded-bl-md px-4 py-2.5 bg-white border border-gray-200 shadow-sm">
                  <div className="flex gap-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 p-3 border-t border-gray-100 bg-white">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Type a test message..."
              className="flex-1"
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!input.trim() || thinking}
              className="bg-emerald-600 hover:bg-emerald-700 h-9 w-9"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <p className="text-xs text-gray-400 mt-3 flex items-center gap-1.5">
          <AlertCircle className="h-3 w-3" />
          This is a local preview using your current settings. Live responses use OpenAI for more natural conversations.
        </p>
      </CardContent>
    </Card>
  );
}
