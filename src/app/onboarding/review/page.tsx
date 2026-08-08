"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, AlertCircle, Trash2, Plus, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { WizardShell } from "@/components/onboarding/wizard-shell";
import { loadOnboarding, saveOnboarding, commitKnowledge } from "@/lib/onboarding/client";
import type { FAQ, KnowledgeEntry, OnboardingCrawlState } from "@/types";

// Step 5 (§7) - the trust moment. Shows the crawl-generated FAQs + KB, fully
// editable (edit / delete / add). Only what the user keeps is committed to
// config.faqs / config.knowledge_base, which is what the AI engine reads.
// If the crawl is still running we poll; if it failed we fall back cleanly to
// manual entry - never a dead end.

let uid = 0;
const nextId = (p: string) => `${p}_new_${Date.now()}_${uid++}`;

export default function ReviewStep() {
  const router = useRouter();
  const { toast } = useToast();
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [kb, setKb] = useState<KnowledgeEntry[]>([]);
  const [crawl, setCrawl] = useState<OnboardingCrawlState | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const populated = useRef(false);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;

    const populate = (c: OnboardingCrawlState | undefined) => {
      if (populated.current || !c) return;
      if (c.status === "done" || c.status === "failed") {
        populated.current = true;
        if (c.faqs?.length) setFaqs(c.faqs);
        if (c.entries?.length) setKb(c.entries);
      }
    };

    const tick = async () => {
      try {
        const state = await loadOnboarding();
        if (!active) return;
        setCrawl(state.crawl ?? null);
        populate(state.crawl);
        setReady(true);
        if (state.crawl?.status === "running" && !populated.current) {
          timer = setTimeout(tick, 3000);
        }
      } catch {
        if (active) setReady(true);
      }
    };
    tick();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, []);

  const setFaq = (id: string, patch: Partial<FAQ>) =>
    setFaqs((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  const setKbEntry = (id: string, patch: Partial<KnowledgeEntry>) =>
    setKb((prev) => prev.map((k) => (k.id === id ? { ...k, ...patch } : k)));

  const finish = async () => {
    const cleanFaqs = faqs.filter((f) => f.question.trim() && f.answer.trim());
    const cleanKb = kb.filter((k) => k.topic.trim() && k.content.trim());
    setBusy(true);
    try {
      const res = await commitKnowledge({ faqs: cleanFaqs, knowledge_base: cleanKb });
      if (res.dropped_for_cap > 0) {
        toast(`Saved. ${res.dropped_for_cap} knowledge item(s) trimmed to fit the free plan.`, "info");
      }
      await saveOnboarding({ onboarding: { step: 6 } });
      router.push("/onboarding/install");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Something went wrong.", "error");
      setBusy(false);
    }
  };

  const running = crawl?.status === "running" && !populated.current;
  const failed = crawl?.status === "failed";
  const learnedCount = (crawl?.faqs?.length ?? 0) + (crawl?.entries?.length ?? 0);

  return (
    <WizardShell
      step={5}
      title="Here's what your assistant learned"
      subtitle="Review, edit, or remove anything. Only what you keep will be used."
      onContinue={finish}
      continueLabel="Looks good"
      busy={busy}
      continueDisabled={!ready}
    >
      {/* Status banner */}
      {running ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-gray-50 p-3 text-sm text-gray-600">
          <Loader2 className="h-4 w-4 animate-spin" /> Still reading your website - items will appear
          here as they&apos;re ready. You can start adding your own below.
        </div>
      ) : failed ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {crawl?.error || "We couldn't read your site."} No problem - add your own questions and
            facts below.
          </span>
        </div>
      ) : populated.current && learnedCount > 0 ? (
        <div className="mb-4 flex items-center gap-1.5 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" /> Learned {learnedCount} item(s) from {crawl?.source}.
        </div>
      ) : null}

      {/* FAQs */}
      <section className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
            <Sparkles className="h-4 w-4 text-emerald-500" /> Questions it can answer
          </h2>
          <span className="text-xs text-gray-400">{faqs.length}</span>
        </div>
        <div className="space-y-2">
          {faqs.map((f) => (
            <div key={f.id} className="rounded-xl border border-gray-200 p-3">
              <div className="flex items-start gap-2">
                <div className="flex-1 space-y-1.5">
                  <Input
                    value={f.question}
                    placeholder="Question, e.g. Do you deliver?"
                    onChange={(e) => setFaq(f.id, { question: e.target.value })}
                    className="h-8 text-sm font-medium"
                  />
                  <textarea
                    value={f.answer}
                    placeholder="Answer"
                    onChange={(e) => setFaq(f.id, { answer: e.target.value })}
                    rows={2}
                    className="w-full resize-y rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <button
                  type="button"
                  aria-label="Delete question"
                  onClick={() => setFaqs((prev) => prev.filter((x) => x.id !== f.id))}
                  className="mt-1 text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setFaqs((prev) => [...prev, { id: nextId("faq"), question: "", answer: "" }])
            }
            className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:underline"
          >
            <Plus className="h-4 w-4" /> Add a question
          </button>
        </div>
      </section>

      {/* Knowledge base */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">What it knows about your business</h2>
          <span className="text-xs text-gray-400">{kb.length}</span>
        </div>
        <div className="space-y-2">
          {kb.map((k) => (
            <div key={k.id} className="rounded-xl border border-gray-200 p-3">
              <div className="flex items-start gap-2">
                <div className="flex-1 space-y-1.5">
                  <Input
                    value={k.topic}
                    placeholder="Topic, e.g. Opening hours"
                    onChange={(e) => setKbEntry(k.id, { topic: e.target.value })}
                    className="h-8 text-sm font-medium"
                  />
                  <textarea
                    value={k.content}
                    placeholder="Details"
                    onChange={(e) => setKbEntry(k.id, { content: e.target.value })}
                    rows={2}
                    className="w-full resize-y rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <button
                  type="button"
                  aria-label="Delete knowledge item"
                  onClick={() => setKb((prev) => prev.filter((x) => x.id !== k.id))}
                  className="mt-1 text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setKb((prev) => [...prev, { id: nextId("kb"), topic: "", content: "", keywords: [] }])
            }
            className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:underline"
          >
            <Plus className="h-4 w-4" /> Add a fact
          </button>
        </div>
      </section>
    </WizardShell>
  );
}
