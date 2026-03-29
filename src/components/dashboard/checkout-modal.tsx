"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X,
  Smartphone,
  CreditCard,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { PLANS, type PlanDefinition } from "@/lib/lipila/plans";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId: string;
  tenantId: string;
}

type Step = "method" | "details" | "processing" | "success" | "error";

export function CheckoutModal({
  isOpen,
  onClose,
  planId,
  tenantId,
}: CheckoutModalProps) {
  const [step, setStep] = useState<Step>("method");
  const [paymentMethod, setPaymentMethod] = useState<"mobile_money" | "card">(
    "mobile_money"
  );
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [pollCount, setPollCount] = useState(0);

  const plan: PlanDefinition | undefined = PLANS.find((p) => p.id === planId);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep("method");
      setPaymentMethod("mobile_money");
      setPhoneNumber("");
      setEmail("");
      setFirstName("");
      setLastName("");
      setLoading(false);
      setErrorMsg("");
      setReferenceId("");
      setPollCount(0);
    }
  }, [isOpen]);

  // Poll payment status for mobile money
  const pollStatus = useCallback(async () => {
    if (!referenceId || step !== "processing" || paymentMethod !== "mobile_money")
      return;

    try {
      const res = await fetch(
        `/api/payments/status?ref=${encodeURIComponent(referenceId)}`
      );
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

      // Still pending — continue polling (max 60 attempts = ~5 minutes)
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
  }, [referenceId, step, paymentMethod, pollCount]);

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
        email,
      };

      if (phoneNumber) body.phoneNumber = phoneNumber;
      if (paymentMethod === "card") {
        body.firstName = firstName;
        body.lastName = lastName;
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

      // Card payment — redirect to Lipila 3D Secure page
      if (paymentMethod === "card" && data.cardRedirectionUrl) {
        window.location.href = data.cardRedirectionUrl;
        return;
      }

      // Mobile money — show processing screen and start polling
      setStep("processing");
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Something went wrong"
      );
      setStep("error");
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen || !plan) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
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
                {plan.priceLabel}/month &middot; {plan.messagesLabel}
              </p>
            ) : null}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6">
          {/* Step: Choose Payment Method */}
          {step === "method" && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                Choose your payment method:
              </p>

              <button
                onClick={() => {
                  setPaymentMethod("mobile_money");
                  setStep("details");
                }}
                className="w-full flex items-center gap-4 rounded-xl border-2 border-gray-200 p-4 hover:border-emerald-400 hover:bg-emerald-50/50 transition-all text-left"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100">
                  <Smartphone className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Mobile Money</p>
                  <p className="text-xs text-gray-500">
                    Airtel Money, MTN Money, or Zamtel Kwacha
                  </p>
                </div>
              </button>

              <button
                onClick={() => {
                  setPaymentMethod("card");
                  setStep("details");
                }}
                className="w-full flex items-center gap-4 rounded-xl border-2 border-gray-200 p-4 hover:border-emerald-400 hover:bg-emerald-50/50 transition-all text-left"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
                  <CreditCard className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    Visa / Mastercard
                  </p>
                  <p className="text-xs text-gray-500">
                    Pay with debit or credit card
                  </p>
                </div>
              </button>
            </div>
          )}

          {/* Step: Enter Details */}
          {step === "details" && (
            <div className="space-y-4">
              <button
                onClick={() => setStep("method")}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium mb-2"
              >
                &larr; Change payment method
              </button>

              {paymentMethod === "mobile_money" ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. 0971234567"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      A payment prompt will be sent to this number
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="you@business.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        First Name
                      </label>
                      <input
                        type="text"
                        placeholder="John"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Last Name
                      </label>
                      <input
                        type="text"
                        placeholder="Doe"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="you@business.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Phone Number (optional)
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. 0971234567"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </>
              )}

              <div className="rounded-xl bg-gray-50 p-4 mt-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{plan.name} Plan</span>
                  <span className="font-bold text-gray-900">
                    {plan.priceLabel}/mo
                  </span>
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={
                  loading ||
                  !email ||
                  (paymentMethod === "mobile_money" && !phoneNumber)
                }
                className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3.5 text-sm font-semibold text-white hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Pay ${plan.priceLabel}`
                )}
              </button>

              <p className="text-xs text-center text-gray-400">
                Payments processed securely by Lipila
              </p>
            </div>
          )}

          {/* Step: Processing (MoMo) */}
          {step === "processing" && (
            <div className="text-center py-8 space-y-4">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Check your phone
                </h3>
                <p className="text-sm text-gray-500 mt-2 max-w-xs mx-auto">
                  A payment prompt has been sent to{" "}
                  <strong>{phoneNumber}</strong>. Enter your PIN to complete the
                  payment.
                </p>
              </div>
              <p className="text-xs text-gray-400">
                Waiting for confirmation... ({pollCount}/60)
              </p>
            </div>
          )}

          {/* Step: Success */}
          {step === "success" && (
            <div className="text-center py-8 space-y-4">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  You&apos;re all set!
                </h3>
                <p className="text-sm text-gray-500 mt-2">
                  Your {plan.name} plan is now active. Enjoy{" "}
                  {plan.messagesLabel}!
                </p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  window.location.reload();
                }}
                className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3 text-sm font-semibold text-white hover:from-emerald-600 hover:to-teal-700 transition-all"
              >
                Go to Dashboard
              </button>
            </div>
          )}

          {/* Step: Error */}
          {step === "error" && (
            <div className="text-center py-8 space-y-4">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Payment Failed
                </h3>
                <p className="text-sm text-gray-500 mt-2">{errorMsg}</p>
              </div>
              <button
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
        </div>
      </div>
    </div>
  );
}
