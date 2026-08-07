"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { Building2 } from "lucide-react";
import { WizardShell } from "@/components/onboarding/wizard-shell";
import {
  loadOnboarding,
  saveOnboarding,
  createProperty,
  updateProperty,
} from "@/lib/onboarding/client";
import type { OnboardingState } from "@/types";

// Step 2 (§7). Creates the property — the installable website that owns the
// widget key. We reuse an existing property_id on Back/resume rather than
// minting a second one.
export default function OrgStep() {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [state, setState] = useState<OnboardingState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadOnboarding()
      .then((s) => {
        setState(s);
        if (s.site_url && !name) {
          try {
            const host = new URL(s.site_url).hostname.replace(/^www\./, "");
            setName(host.split(".")[0].replace(/\b\w/g, (c) => c.toUpperCase()));
          } catch {
            /* leave blank */
          }
        }
      })
      .catch(() => setState({ step: 2 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const trimmed = name.trim();

  const handleContinue = async () => {
    if (!trimmed) {
      toast("Give your organization a name.", "warning");
      return;
    }
    setBusy(true);
    try {
      let propertyId = state?.property_id;
      if (propertyId) {
        await updateProperty(propertyId, { name: trimmed });
      } else {
        const property = await createProperty({ name: trimmed, site_url: state?.site_url ?? null });
        propertyId = property.id;
      }
      await saveOnboarding({
        onboarding: { step: 3, property_id: propertyId },
        config: { business_name: trimmed },
      });
      router.push("/onboarding/industry");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Something went wrong.", "error");
      setBusy(false);
    }
  };

  return (
    <WizardShell
      step={2}
      title="What's the name of your organization?"
      subtitle={
        <>
          We&apos;ll create a <span className="font-medium text-gray-800">property</span> for it — that&apos;s
          simply one website where your chat widget lives.
        </>
      }
      onContinue={handleContinue}
      busy={busy}
      continueDisabled={!trimmed || state === null}
    >
      <div className="relative">
        <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          autoFocus
          className="pl-9"
          placeholder="e.g. Kabwe Guesthouse"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && trimmed && !busy) handleContinue();
          }}
          maxLength={80}
        />
      </div>
    </WizardShell>
  );
}
