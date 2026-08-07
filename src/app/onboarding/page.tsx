"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { loadOnboarding } from "@/lib/onboarding/client";
import { WIZARD_STEPS } from "@/components/onboarding/wizard-shell";

// Resume entry point (§7: "Persist wizard progress so a closed tab resumes
// where it left off"). Loads saved state and forwards to the correct step.
export default function OnboardingIndex() {
  const router = useRouter();

  useEffect(() => {
    loadOnboarding()
      .then((state) => {
        if (state.done) {
          router.replace("/dashboard");
          return;
        }
        const target = WIZARD_STEPS.find((s) => s.step === state.step) ?? WIZARD_STEPS[0];
        router.replace(target.path);
      })
      .catch(() => router.replace("/onboarding/site"));
  }, [router]);

  return (
    <div className="flex items-center justify-center py-20 text-gray-400">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  );
}
