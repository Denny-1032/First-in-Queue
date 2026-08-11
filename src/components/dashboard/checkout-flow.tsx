"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { PLANS, type PlanDefinition } from "@/lib/lipila/plans";
import {
  PaymentMethodPicker,
  PayerFields,
  SavedMethodPicker,
  payerComplete,
  payerFromSaved,
  emptyPayer,
  type PaymentMethod,
  type PayerDetails,
  type SavedPaymentMethod,
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

  // Saved payer profiles: contact details the tenant asked us to remember, so
  // paying again is one tap instead of four fields. Never card data.
  const [saved, setSaved] = useState<SavedPaymentMethod[]>([]);
  const [showNewMethod, setShowNewMethod] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [remember, setRemember] = useState(true);

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

  // A failure here is not worth surfacing: the customer just sees the ordinary
  // "choose a method" screen, which is where they would have ended up anyway.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/payments/methods")
      .then((r) => (r.ok ? r.json() : { methods: [] }))
      .then((d) => {
        if (cancelled) return;
        const list: SavedPaymentMethod[] = d.methods || [];
        setSaved(list);
        // Nothing saved yet, so the "remember this" tick is the useful default.
        // Once they have profiles, do not silently add another every time.
        setRemember(list.length === 0);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const useSaved = (m: SavedPaymentMethod) => {
    setPaymentMethod(m.method);
    setPayer(payerFromSaved(m));
    setRemember(false);
    setStep("details");
  };

  const removeSaved = async (m: SavedPaymentMethod) => {
    setRemovingId(m.id);
    try {
      const res = await fetch(`/api/payments/methods/${m.id}`, { method: "DELETE" });
      if (res.ok) {
        setSaved((prev) => {
          const next = prev.filter((s) => s.id !== m.id);
          if (next.length === 0) setRemember(true);
          return next;
        });
      }
    } catch {
      /* leaving the entry in place is the safe failure */
    } finally {
      setRemovingId(null);
    }
  };

  /** Best effort - a payment must never fail because remembering it did. */
  async function rememberPayer(type?: string) {
    try {
      await fetch("/api/payments/methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: paymentMethod,
          phoneNumber: payer.phoneNumber,
          email: payer.email,
          firstName: payer.firstName || undefined,
          lastName: payer.lastName || undefined,
          paymentType: type,
        }),
      });
    } catch {
      /* ignore */
    }
  }

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

      // Lipila accepted the details, so they are worth keeping. Awaited before
      // the card redirect below - that navigation kills any in-flight request.
      if (remember) await rememberPayer(data.paymentType);

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
      {step === "method" &&
        (saved.length > 0 && !showNewMethod ? (
          <SavedMethodPicker
            methods={saved}
            onUse={useSaved}
            onRemove={removeSaved}
            onAddNew={() => setShowNewMethod(true)}
            removingId={removingId}
          />
        ) : (
          <div className="space-y-4">
            <PaymentMethodPicker
              onSelect={(m) => {
                setPaymentMethod(m);
                setStep("details");
              }}
            />
            {saved.length > 0 && (
              <button
                type="button"
                onClick={() => setShowNewMethod(false)}
                className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
              >
                &larr; Back to saved details
              </button>
            )}
          </div>
        ))}

      {step === "details" && (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => {
              setShowNewMethod(false);
              setStep("method");
            }}
            className="text-xs text-emerald-600 hover:text-emerald-700 font-medium mb-2"
          >
            &larr; Change payment method
          </button>

          <PayerFields method={paymentMethod} value={payer} onChange={setPayer} />

          <label className="flex items-start gap-2 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-emerald-600"
            />
            <span>
              Remember these details for next time.
              {paymentMethod === "card" && " Your card number is never stored - only the details on this form."}
            </span>
          </label>

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
            ) : paymentMethod === "card" ? (
              // The card number is entered on the bank's checkout, not here, so
              // this button does not charge anything yet - say so.
              `Continue to secure checkout - ${priceLabel}`
            ) : (
              `Pay ${priceLabel}`
            )}
          </button>
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
