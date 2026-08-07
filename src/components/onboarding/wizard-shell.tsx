"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";

// The seven wizard screens after signup (§7). Screen 0 (email + password) is
// the standalone /signup page and has no wizard chrome.
export const WIZARD_STEPS = [
  { step: 1, path: "/onboarding/site", label: "Website" },
  { step: 2, path: "/onboarding/org", label: "Organization" },
  { step: 3, path: "/onboarding/industry", label: "Industry" },
  { step: 4, path: "/onboarding/brand", label: "Branding" },
  { step: 5, path: "/onboarding/review", label: "Review" },
  { step: 6, path: "/onboarding/install", label: "Install" },
  { step: 7, path: "/onboarding/verify", label: "Verify" },
] as const;

export const WIZARD_TOTAL = WIZARD_STEPS.length;

interface WizardShellProps {
  step: number;
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  /** Called when Continue is pressed. Return false to keep the user on the step. */
  onContinue: () => void | Promise<void | boolean>;
  continueLabel?: string;
  continueDisabled?: boolean;
  busy?: boolean;
  /** Skip advances to the next step without persisting this step's answer. */
  canSkip?: boolean;
  onSkip?: () => void | Promise<void>;
}

export function WizardShell({
  step,
  title,
  subtitle,
  children,
  onContinue,
  continueLabel = "Continue",
  continueDisabled = false,
  busy = false,
  canSkip = false,
  onSkip,
}: WizardShellProps) {
  const router = useRouter();
  const idx = WIZARD_STEPS.findIndex((s) => s.step === step);
  const prev = idx > 0 ? WIZARD_STEPS[idx - 1] : null;
  const next = idx >= 0 && idx < WIZARD_STEPS.length - 1 ? WIZARD_STEPS[idx + 1] : null;

  const handleSkip = async () => {
    if (onSkip) await onSkip();
    else if (next) router.push(next.path);
  };

  return (
    <div className="flex min-h-full flex-col">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center gap-1.5">
          {WIZARD_STEPS.map((s) => (
            <div
              key={s.step}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                s.step <= step ? "bg-emerald-500" : "bg-gray-200"
              }`}
              aria-hidden
            />
          ))}
        </div>
        <p className="mt-2 text-xs font-medium text-gray-500">
          Step {step} of {WIZARD_TOTAL} · {WIZARD_STEPS[idx]?.label}
        </p>
      </div>

      {/* Question */}
      <div className="flex-1">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-2 text-gray-600">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>

      {/* Nav */}
      <div className="mt-8 flex items-center justify-between gap-3 border-t border-gray-100 pt-5">
        <div>
          {prev && (
            <Button variant="ghost" onClick={() => router.push(prev.path)} disabled={busy}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canSkip && (
            <Button variant="ghost" onClick={handleSkip} disabled={busy}>
              Skip
            </Button>
          )}
          <Button onClick={() => onContinue()} disabled={continueDisabled || busy} className="min-w-[130px]">
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                {continueLabel} <ArrowRight className="ml-1 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
