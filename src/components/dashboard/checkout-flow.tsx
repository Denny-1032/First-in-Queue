"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { PLANS, type PlanDefinition } from "@/lib/lipila/plans";
import {
  PaymentMethodPicker,
  PayerFields,
  payerComplete,
  emptyPayer,
  type PaymentMethod,
  type PayerDetails,
} from "./payment-fields";

// The plan purchase flow itself - method, details, mobile-money polling,
// success and failure. Rendered inside CheckoutModal on the dashboard and
// inline on /trial-payment, so there is exactly one implementation of the
// payment call and its status polling.

export type CheckoutStep = "method" | "details" | "processing" | "success" | "error";

interface CheckoutFlowProps {
  planId: string;
  tenantId: string;
  billingInterval?: "monthly" | "yearly";
  /** Prefilled from the tenant record where the caller already has it. */
  initialEmail?: string;
  /** Lets the surrounding chrome (e.g. a modal header) follow the step. */
  onStepChange?: (step: CheckoutStep) => void;
  /** The success CTA. Defaults to a full reload of the dashboard. */
  onDone?: () => void;
}

export function CheckoutFlow({
  planId,
  tenantId,
  billingInterval = "monthly",
  initialEmail = "",
  onStepChange,
  onDone,
}: CheckoutFlowProps) {
  const [step, setStepState] = useState<CheckoutStep>("method");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("mobile_money");
  const [payer, setPayer] = useState<PayerDetails>({ ...emptyPayer, email: initialEmail });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [pollCount, setPollCount] = useState(0);

  const plan: PlanDefinition | undefined = PLANS.find((p) => p.id === planId);

  const setStep = useCallback(
    (next: CheckoutStep) => {
      setStepState(next);
      onStepChange?.(next);
    },
    [onStepChange]
  );

  // The email only arrives once the tenant record has loaded, which can be
  // after first paint - but never clobber what the customer has typed.
  useEffect(() => {
    if (!initialEmail) return;
    setPayer((p) => (p.email ? p : { ...p, email: initialEmail }));
  }, [initialEmail]);

  // Poll payment status for mobile money.
  const pollStatus = useCallback(async () => {
    if (!referenceId || step !== "processing" || paymentMethod !== "mobile_money") return;

    try {
      const res = await fetch(`/api/payments/status?ref=${encodeURIComponent(referenceId)}`);
      const data = await res.json();

      if (data.status === "successful") {
        setStep("success");
        return;
      }
      if (data.status === "failed") {
        setErrorMsg(data.message || "Payment failed. Please try again.");
        setStep("error");
        return;
      }

      // Still pending - continue polling (max 60 attempts = ~5 minutes)
      if (pollCount < 60) {
        setPollCount((c) => c + 1);
      } else {
        setErrorMsg(
          "Payment is taking longer than expected. Please check your phone and try again."
        );
        setStep("error");
      }
    } catch {
      // Silently retry
      setPollCount((c) => c + 1);
    }
  }, [referenceId, step, paymentMethod, pollCount, setStep]);

  useEffect(() => {
    if (step === "processing" && paymentMethod === "mobile_money" && referenceId) {
      const timer = setTimeout(pollStatus, 5000);
      return () => clearTimeout(timer);
    }
  }, [step, paymentMethod, referenceId, pollCount, pollStatus]);

  async function handleSubmit() {
    setLoading(true);
    setErrorMsg("");

    try {
      const body: Record<string, string> = {
        tenantId,
        planId,
        paymentMethod,
        email: payer.email,
        billingInterval,
      };

      if (payer.phoneNumber) body.phoneNumber = payer.phoneNumber;
      if (paymentMethod === "card") {
        body.firstName = payer.firstName;
        body.lastName = payer.lastName;
      }

      const res = await fetch("/api/payments/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Payment failed");
        setStep("error");
        return;
      }

      // Instant activation (e.g. admin override)
      if (data.status === "active") {
        setStep("success");
        return;
      }

      setReferenceId(data.referenceId);

      // Card payment - redirect to Lipila's 3D Secure page.
      if (paymentMethod === "card" && data.cardRedirectionUrl) {
        window.location.href = data.cardRedirectionUrl;
        return;
      }

      // Mobile money - show processing screen and start polling.
      setStep("processing");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      setStep("error");
    } finally {
      setLoading(false);
    }
  }

  if (!plan) return null;

  const priceLabel = billingInterval === "yearly" ? plan.yearlyPriceLabel : plan.priceLabel;

  return (
    <>
      {step === "method" && (
        <PaymentMethodPicker
          onSelect={(m) => {
            setPaymentMethod(m);
            setStep("details");
          }}
        />
      )}

      {step === "details" && (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setStep("method")}
            className="text-xs text-emerald-600 hover:text-emerald-700 font-medium mb-2"
          >
            &larr; Change payment method
          </button>

          <PayerFields method={paymentMethod} value={payer} onChange={setPayer} />

          <div className="rounded-xl bg-gray-50 p-4 mt-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">
                {plan.name} Plan ({billingInterval === "yearly" ? "Yearly" : "Monthly"})
              </span>
              <span className="font-bold text-gray-900">
                {priceLabel}
                {billingInterval === "yearly" ? "/yr" : "/mo"}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !payerComplete(paymentMethod, payer)}
            className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3.5 text-sm font-semibold text-white hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              `Pay ${priceLabel}`
            )}
          </button>

          <p className="text-xs text-center text-gray-400">Payments processed securely by Lipila</p>
        </div>
      )}

      {step === "processing" && (
        <div className="text-center py-8 space-y-4">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Check your phone</h3>
            <p className="text-sm text-gray-500 mt-2 max-w-xs mx-auto">
              A payment prompt has been sent to <strong>{payer.phoneNumber}</strong>. Enter your PIN
              to complete the payment.
            </p>
          </div>
          <p className="text-xs text-gray-400">Waiting for confirmation... ({pollCount}/60)</p>
        </div>
      )}

      {step === "success" && (
        <div className="text-center py-8 space-y-4">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">You&apos;re all set!</h3>
            <p className="text-sm text-gray-500 mt-2">
              Your {plan.name} plan is now active. Enjoy {plan.messagesLabel}!
            </p>
          </div>
          <button
            type="button"
            onClick={() => (onDone ? onDone() : window.location.reload())}
            className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3 text-sm font-semibold text-white hover:from-emerald-600 hover:to-teal-700 transition-all"
          >
            Go to Dashboard
          </button>
        </div>
      )}

      {step === "error" && (
        <div className="text-center py-8 space-y-4">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Payment Failed</h3>
            <p className="text-sm text-gray-500 mt-2">{errorMsg}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setStep("method");
              setErrorMsg("");
            }}
            className="w-full rounded-xl border-2 border-gray-200 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all"
          >
            Try Again
          </button>
        </div>
      )}
    </>
  );
}
