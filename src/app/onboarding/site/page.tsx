"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { Globe, Sparkles } from "lucide-react";
import { WizardShell } from "@/components/onboarding/wizard-shell";
import { saveOnboarding, startCrawl } from "@/lib/onboarding/client";

// Step 1 (§7). Kicks off the crawl in the background immediately so steps 2-4
// give it 60-90s of cover; the review screen (step 5) reads the results.
export default function SiteStep() {
  const router = useRouter();
  const { toast } = useToast();
  const [url, setUrl] = useState("https://");
  const [busy, setBusy] = useState(false);

  const isPlausible = (raw: string) => {
    try {
      const u = new URL(raw.trim());
      return ["http:", "https:"].includes(u.protocol) && /\.[a-z]{2,}$/i.test(u.hostname);
    } catch {
      return false;
    }
  };

  const clean = url.trim();
  const valid = isPlausible(clean);

  const handleContinue = async () => {
    if (!valid) {
      toast("Enter a valid website address, e.g. https://yourbusiness.com", "warning");
      return;
    }
    setBusy(true);
    try {
      // Fire-and-forget crawl, then record progress and move on.
      await startCrawl(clean);
      await saveOnboarding({ onboarding: { step: 2, site_url: clean } });
      router.push("/onboarding/org");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Something went wrong.", "error");
      setBusy(false);
    }
  };

  const handleSkip = async () => {
    setBusy(true);
    try {
      await saveOnboarding({ onboarding: { step: 2 } });
      router.push("/onboarding/org");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Something went wrong.", "error");
      setBusy(false);
    }
  };

  return (
    <WizardShell
      step={1}
      title="What's your website address?"
      subtitle="We'll read it in the background and teach your assistant about your business — while you finish setup."
      onContinue={handleContinue}
      busy={busy}
      continueDisabled={!valid}
      canSkip
      onSkip={handleSkip}
    >
      <div className="relative">
        <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          autoFocus
          className="pl-9"
          placeholder="https://yourbusiness.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && valid && !busy) handleContinue();
          }}
        />
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-gray-500">
        <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
        No website? Skip this — you can paste your FAQs later.
      </p>
    </WizardShell>
  );
}
