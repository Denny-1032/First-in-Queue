"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { WizardShell } from "@/components/onboarding/wizard-shell";
import {
  BrandingEditor,
  textColorFor,
  HEX_RE,
  type BrandingValue,
} from "@/components/onboarding/branding-editor";
import { loadOnboarding, getProperty, updateProperty, saveOnboarding } from "@/lib/onboarding/client";

// Step 4 (§7). Branding editor with a live preview. The controls + preview live
// in the shared BrandingEditor so the dashboard (block 13) uses the same UI.
export default function BrandStep() {
  const router = useRouter();
  const { toast } = useToast();
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [b, setB] = useState<BrandingValue>({
    primary_color: "#03A84E",
    title: "Chat with us",
    welcome_message: "Hi! How can we help?",
    suggested_messages: ["I have a question", "Tell me more"],
  });

  useEffect(() => {
    (async () => {
      try {
        const state = await loadOnboarding();
        if (!state.property_id) {
          toast("Let's name your organization first.", "warning");
          router.replace("/onboarding/org");
          return;
        }
        setPropertyId(state.property_id);
        const property = await getProperty(state.property_id);
        const br = property.branding || {};
        setB({
          primary_color: HEX_RE.test(String(br.primary_color)) ? String(br.primary_color) : "#03A84E",
          title: typeof br.title === "string" ? br.title : "Chat with us",
          welcome_message:
            typeof br.welcome_message === "string" ? br.welcome_message : "Hi! How can we help?",
          suggested_messages: Array.isArray(br.suggested_messages)
            ? (br.suggested_messages as string[])
            : ["I have a question", "Tell me more"],
        });
      } catch (e) {
        toast(e instanceof Error ? e.message : "Failed to load branding.", "error");
      } finally {
        setReady(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleContinue = async () => {
    if (!propertyId) return;
    if (!HEX_RE.test(b.primary_color)) {
      toast("Enter a valid hex colour, e.g. #03A84E", "warning");
      return;
    }
    setBusy(true);
    try {
      await updateProperty(propertyId, {
        branding: {
          primary_color: b.primary_color,
          text_color: textColorFor(b.primary_color),
          title: b.title,
          welcome_message: b.welcome_message,
          suggested_messages: b.suggested_messages,
        },
      });
      await saveOnboarding({ onboarding: { step: 5 } });
      router.push("/onboarding/review");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Something went wrong.", "error");
      setBusy(false);
    }
  };

  return (
    <WizardShell
      step={4}
      title="Customize the widget to suit your brand"
      subtitle="See it update live on the right as you type."
      onContinue={handleContinue}
      busy={busy}
      continueDisabled={!ready}
      canSkip
      onSkip={async () => {
        await saveOnboarding({ onboarding: { step: 5 } }).catch(() => {});
        router.push("/onboarding/review");
      }}
    >
      <BrandingEditor value={b} onChange={setB} />
    </WizardShell>
  );
}
