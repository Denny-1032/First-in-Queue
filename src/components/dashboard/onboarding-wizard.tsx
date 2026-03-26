"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Rocket,
  Building2,
  Bot,
  MessageSquare,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Globe,
  Zap,
  Shield,
  Brain,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

const industries = [
  { id: "ecommerce", label: "E-Commerce", emoji: "🛒" },
  { id: "healthcare", label: "Healthcare", emoji: "🏥" },
  { id: "restaurant", label: "Restaurant", emoji: "🍽️" },
  { id: "realestate", label: "Real Estate", emoji: "🏠" },
  { id: "education", label: "Education", emoji: "🎓" },
  { id: "travel", label: "Travel", emoji: "✈️" },
  { id: "finance", label: "Finance", emoji: "💰" },
  { id: "saas", label: "SaaS", emoji: "💻" },
];

const tones = [
  { value: "professional", label: "Professional", desc: "Polished and business-like" },
  { value: "friendly", label: "Friendly", desc: "Warm and approachable" },
  { value: "casual", label: "Casual", desc: "Relaxed and informal" },
  { value: "formal", label: "Formal", desc: "Proper and formal" },
] as const;

interface OnboardingWizardProps {
  onComplete: () => void;
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [deploying, setDeploying] = useState(false);

  // Step 0: Business Info
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState("ecommerce");

  // Step 1: Bot personality
  const [botName, setBotName] = useState("Alex");
  const [tone, setTone] = useState<"professional" | "friendly" | "casual" | "formal">("friendly");

  // Step 2: Business knowledge (replaces WhatsApp/OpenAI credentials step)
  const [businessDescription, setBusinessDescription] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");

  const steps = [
    { icon: Building2, label: "Business" },
    { icon: Bot, label: "AI Personality" },
    { icon: Brain, label: "Knowledge" },
    { icon: Rocket, label: "Go Live" },
  ];

  const canProceed = () => {
    switch (step) {
      case 0: return businessName.trim().length >= 2;
      case 1: return botName.trim().length >= 1;
      case 2: return true; // Knowledge is optional — can add later
      case 3: return true;
      default: return false;
    }
  };

  const handleDeploy = async () => {
    setDeploying(true);
    try {
      // Call the setup API with selected industry
      const setupRes = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ industry }),
      });

      if (setupRes.ok) {
        const setupData = await setupRes.json();
        const tenantId = setupData.tenant_id;

        // Parse business description into knowledge entries
        const knowledgeBase: { topic: string; content: string; keywords: string[] }[] = [];
        if (businessDescription.trim()) {
          const lines = businessDescription.split("\n").filter((l) => l.trim());
          let currentTopic = "";
          let currentContent = "";
          let currentKeywords: string[] = [];

          for (const line of lines) {
            const trimmed = line.trim();
            const topicMatch = trimmed.match(/^([A-Za-z\s&/]+):\s*(.*)$/);
            if (topicMatch && topicMatch[1].length < 40) {
              if (currentTopic && currentContent) {
                knowledgeBase.push({ topic: currentTopic, content: currentContent.trim(), keywords: currentKeywords });
              }
              currentTopic = topicMatch[1].trim();
              currentContent = topicMatch[2] || "";
              currentKeywords = currentTopic.toLowerCase().split(/[\s&/]+/).filter((w) => w.length > 2);
            } else if (currentTopic) {
              currentContent += (currentContent ? " " : "") + trimmed;
            } else {
              knowledgeBase.push({ topic: "About Us", content: trimmed, keywords: ["about", "who", "company"] });
            }
          }
          if (currentTopic && currentContent) {
            knowledgeBase.push({ topic: currentTopic, content: currentContent.trim(), keywords: currentKeywords });
          }
        }

        // Patch the tenant with user's customizations
        if (tenantId) {
          await fetch(`/api/tenants/${tenantId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: businessName,
              config: {
                business_name: businessName,
                industry,
                personality: {
                  name: botName,
                  tone,
                  emoji_usage: tone === "casual" ? "moderate" : tone === "formal" ? "none" : "minimal",
                  response_style: "balanced",
                },
                ...(knowledgeBase.length > 0 && {
                  knowledge_base: knowledgeBase.map((kb, i) => ({ id: String(i + 1), ...kb })),
                }),
                ...(whatsappNumber && { customer_whatsapp: whatsappNumber }),
              },
            }),
          });
        }
      }

      toast("Your bot is live! 🎉", "success");
      onComplete();
    } catch (err) {
      console.error("Onboarding setup failed:", err);
      toast("Setup failed. Please try again or contact support.", "error");
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={s.label} className="flex items-center">
              <div
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                  i === step
                    ? "bg-emerald-100 text-emerald-700"
                    : i < step
                    ? "bg-emerald-500 text-white"
                    : "bg-gray-100 text-gray-400"
                )}
              >
                {i < step ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <s.icon className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {i < steps.length - 1 && (
                <div className={cn("w-8 h-0.5 mx-1", i < step ? "bg-emerald-500" : "bg-gray-200")} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <Card className="shadow-xl border-0">
          {/* Step 0: Business Info */}
          {step === 0 && (
            <>
              <CardHeader className="text-center pb-2">
                <div className="flex justify-center mb-3">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                    <Building2 className="h-7 w-7 text-white" />
                  </div>
                </div>
                <CardTitle className="text-2xl">Welcome to First in Queue</CardTitle>
                <CardDescription>Let&apos;s set up your AI customer care bot in under 5 minutes — no technical skills needed</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-4">
                <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4">
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-emerald-800">We handle everything for you</p>
                      <p className="text-xs text-emerald-600 mt-1">
                        WhatsApp integration, AI infrastructure, and hosting — all managed by First in Queue. Just tell us about your business and we&apos;ll do the rest.
                      </p>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">What&apos;s your business name?</label>
                  <Input
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g., Acme Corp, Joe's Coffee, BrightPath Academy"
                    className="text-base py-3"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-3 block">What industry are you in?</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {industries.map((ind) => (
                      <button
                        key={ind.id}
                        onClick={() => setIndustry(ind.id)}
                        className={cn(
                          "rounded-xl border-2 p-3 text-center transition-all",
                          industry === ind.id
                            ? "border-emerald-500 bg-emerald-50"
                            : "border-gray-200 hover:border-gray-300"
                        )}
                      >
                        <span className="text-2xl">{ind.emoji}</span>
                        <p className="text-xs font-medium text-gray-700 mt-1">{ind.label}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </>
          )}

          {/* Step 1: Bot Personality */}
          {step === 1 && (
            <>
              <CardHeader className="text-center pb-2">
                <div className="flex justify-center mb-3">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                    <Bot className="h-7 w-7 text-white" />
                  </div>
                </div>
                <CardTitle className="text-2xl">Design your AI personality</CardTitle>
                <CardDescription>Give your bot a name and choose how it speaks to customers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Bot name</label>
                  <Input
                    value={botName}
                    onChange={(e) => setBotName(e.target.value)}
                    placeholder="e.g., Alex, Maya, Support Bot"
                    className="text-base py-3 max-w-xs"
                  />
                  <p className="text-xs text-gray-400 mt-1">This is the name customers will see in conversations</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-3 block">Conversation tone</label>
                  <div className="grid grid-cols-2 gap-3">
                    {tones.map((t) => (
                      <button
                        key={t.value}
                        onClick={() => setTone(t.value)}
                        className={cn(
                          "rounded-xl border-2 p-4 text-left transition-all",
                          tone === t.value
                            ? "border-emerald-500 bg-emerald-50"
                            : "border-gray-200 hover:border-gray-300"
                        )}
                      >
                        <p className="text-sm font-medium text-gray-900">{t.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{t.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live preview */}
                <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
                  <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1.5">
                    <MessageSquare className="h-3 w-3" /> Preview
                  </p>
                  <div className="bg-white rounded-lg border border-gray-100 p-3">
                    <p className="text-sm text-gray-800">
                      {tone === "professional" && `Hello! I'm ${botName} from ${businessName || "your business"}. How may I assist you today?`}
                      {tone === "friendly" && `Hey there! 👋 I'm ${botName} from ${businessName || "your business"}. How can I help you today?`}
                      {tone === "casual" && `Hi! I'm ${botName} 😊 What can I do for you?`}
                      {tone === "formal" && `Good day. I am ${botName}, representing ${businessName || "your business"}. How may I be of service?`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </>
          )}

          {/* Step 2: Teach Your Bot (replaces WhatsApp/OpenAI credentials) */}
          {step === 2 && (
            <>
              <CardHeader className="text-center pb-2">
                <div className="flex justify-center mb-3">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                    <Brain className="h-7 w-7 text-white" />
                  </div>
                </div>
                <CardTitle className="text-2xl">Teach your bot about your business</CardTitle>
                <CardDescription>The more you share, the smarter your bot will be. You can always add more later.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 pt-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Describe your business</label>
                  <textarea
                    value={businessDescription}
                    onChange={(e) => setBusinessDescription(e.target.value)}
                    placeholder={`Tell us about your business. Use "Topic: details" format for best results.\n\nExample:\nWe are a premium coffee shop in downtown Cape Town.\n\nMenu: Espresso, Cappuccino, Latte, Cold Brew, pastries and sandwiches.\nPrices: Coffees R25-R55, pastries R30-R45.\nHours: Mon-Fri 6AM-6PM, Sat-Sun 7AM-4PM.\nLocation: 123 Long Street, Cape Town.\nDelivery: Free delivery within 5km for orders over R100.\nSpecials: Happy hour 2-4PM weekdays, all coffees 20% off.`}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[160px] resize-y"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Your WhatsApp business number (optional)</label>
                  <Input
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="e.g., +27 82 123 4567"
                    className="max-w-xs"
                  />
                  <p className="text-xs text-gray-400 mt-1">We&apos;ll connect your bot to this number — our team handles the setup</p>
                </div>

                <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-emerald-700">
                    <strong>Don&apos;t worry about technical setup.</strong> Our team will configure your WhatsApp Business API, AI engine, and everything else. You&apos;ll receive an email once your bot is ready.
                  </p>
                </div>
              </CardContent>
            </>
          )}

          {/* Step 3: Go Live */}
          {step === 3 && (
            <>
              <CardHeader className="text-center pb-2">
                <div className="flex justify-center mb-3">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                    <Rocket className="h-7 w-7 text-white" />
                  </div>
                </div>
                <CardTitle className="text-2xl">Ready to launch!</CardTitle>
                <CardDescription>Here&apos;s a summary of your setup</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-3">
                  {[
                    { label: "Business", value: businessName, icon: Building2 },
                    { label: "Industry", value: industries.find((i) => i.id === industry)?.label || industry, icon: Globe },
                    { label: "Bot Name", value: botName, icon: Bot },
                    { label: "Tone", value: tone.charAt(0).toUpperCase() + tone.slice(1), icon: MessageSquare },
                    { label: "Knowledge", value: businessDescription.trim() ? "Provided" : "Industry defaults", icon: Brain },
                    { label: "WhatsApp", value: whatsappNumber ? whatsappNumber : "Pending setup", icon: Zap },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <item.icon className="h-4 w-4 text-gray-400" />
                        {item.label}
                      </div>
                      <Badge variant={item.value === "Pending setup" || item.value === "Industry defaults" ? "secondary" : "default"}>
                        {item.value}
                      </Badge>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-center">
                  <p className="text-sm font-medium text-emerald-800">What happens next?</p>
                  <p className="text-xs text-emerald-600 mt-1">
                    Our team will set up your WhatsApp Business API connection and configure your AI bot with your business knowledge.
                    You&apos;ll get an email notification once everything is live. In the meantime, explore the dashboard and fine-tune your bot settings.
                  </p>
                </div>
              </CardContent>
            </>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between px-6 pb-6 pt-2">
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              disabled={step === 0}
              className="gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>

            {step < 3 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleDeploy}
                disabled={deploying}
                className="gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
              >
                {deploying ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Setting up...
                  </>
                ) : (
                  <>
                    <Rocket className="h-4 w-4" />
                    Launch My Bot
                  </>
                )}
              </Button>
            )}
          </div>
        </Card>

        {/* Skip link */}
        {step < 3 && (
          <p className="text-center text-xs text-gray-400 mt-4">
            <button onClick={onComplete} className="hover:text-gray-600 transition-colors underline">
              Skip setup and explore the dashboard
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
