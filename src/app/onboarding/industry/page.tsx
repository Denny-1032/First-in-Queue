"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { WizardShell } from "@/components/onboarding/wizard-shell";
import { loadOnboarding, saveOnboarding } from "@/lib/onboarding/client";
import { getTemplate } from "@/lib/config/templates";
import type { BusinessConfig, Industry } from "@/types";

// Step 3 (§7). Seeds behaviour from an industry template, pre-selecting the
// crawl's guess. Skippable - the tenant already has the ecommerce default.
const INDUSTRIES: Array<{ id: Industry; label: string; emoji: string }> = [
  { id: "ecommerce", label: "Online store", emoji: "🛍️" },
  { id: "healthcare", label: "Healthcare", emoji: "🩺" },
  { id: "restaurant", label: "Restaurant", emoji: "🍽️" },
  { id: "realestate", label: "Real estate", emoji: "🏠" },
  { id: "education", label: "Education", emoji: "🎓" },
  { id: "travel", label: "Travel", emoji: "✈️" },
  { id: "finance", label: "Finance", emoji: "💳" },
  { id: "saas", label: "Software / SaaS", emoji: "💻" },
  { id: "other", label: "Something else", emoji: "✨" },
];

/** Template minus business_name, so seeding an industry never renames the org. */
function industryConfigPatch(industry: Industry): Partial<BusinessConfig> {
  if (industry === "other") return { industry };
  const template = getTemplate(industry);
  if (!template) return { industry };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { business_name, onboarding, ...rest } = template;
  return rest;
}

export default function IndustryStep() {
  const router = useRouter();
  const { toast } = useToast();
  const [selected, setSelected] = useState<Industry | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadOnboarding()
      .then((s) => setSelected(s.crawl?.industry_guess ?? null))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const advance = async (patch: Parameters<typeof saveOnboarding>[0]) => {
    setBusy(true);
    try {
      await saveOnboarding({ ...patch, onboarding: { step: 4, ...patch.onboarding } });
      router.push("/onboarding/brand");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Something went wrong.", "error");
      setBusy(false);
    }
  };

  const handleContinue = () => {
    if (!selected) {
      toast("Pick the closest match, or Skip.", "warning");
      return;
    }
    advance({ config: industryConfigPatch(selected) });
  };

  return (
    <WizardShell
      step={3}
      title="What kind of business is this?"
      subtitle="We'll tune your assistant's behaviour to match. You can change this anytime."
      onContinue={handleContinue}
      busy={busy}
      continueDisabled={!ready || !selected}
      canSkip
      onSkip={() => advance({})}
    >
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {INDUSTRIES.map((ind) => {
          const active = selected === ind.id;
          return (
            <button
              key={ind.id}
              type="button"
              onClick={() => setSelected(ind.id)}
              className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition ${
                active
                  ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <span className="text-xl">{ind.emoji}</span>
              <span className="text-sm font-medium text-gray-800">{ind.label}</span>
            </button>
          );
        })}
      </div>
    </WizardShell>
  );
}
