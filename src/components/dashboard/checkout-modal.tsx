"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { PLANS } from "@/lib/lipila/plans";
import { CheckoutFlow, type CheckoutStep } from "./checkout-flow";

// Modal chrome around CheckoutFlow. The payment logic itself lives in the flow
// so /trial-payment can render the same thing inline - see checkout-flow.tsx.

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId: string;
  tenantId: string;
  billingInterval?: "monthly" | "yearly";
}

export function CheckoutModal({
  isOpen,
  onClose,
  planId,
  tenantId,
  billingInterval = "monthly",
}: CheckoutModalProps) {
  // Only mirrored so the header can name the step. The flow owns the state,
  // and unmounts with the modal - which is what resets it between openings.
  const [step, setStep] = useState<CheckoutStep>("method");

  const plan = PLANS.find((p) => p.id === planId);

  if (!isOpen || !plan) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {step === "success"
                ? "Payment Successful"
                : step === "error"
                ? "Payment Failed"
                : `Subscribe to ${plan.name}`}
            </h2>
            {step === "method" || step === "details" ? (
              <p className="text-sm text-gray-500">
                {billingInterval === "yearly"
                  ? `${plan.yearlyMonthlyLabel}/mo (billed yearly)`
                  : `${plan.priceLabel}/month`}{" "}
                &middot; {plan.messagesLabel}
              </p>
            ) : null}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6">
          <CheckoutFlow
            planId={planId}
            tenantId={tenantId}
            billingInterval={billingInterval}
            onStepChange={setStep}
            onDone={() => {
              onClose();
              window.location.reload();
            }}
          />
        </div>
      </div>
    </div>
  );
}
