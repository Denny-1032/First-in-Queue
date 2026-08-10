"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { TOPUP_MIX_NOTE, type TopupPack } from "@/lib/credit/rates";
import {
  PaymentMethodPicker,
  PayerFields,
  payerComplete,
  emptyPayer,
  type PaymentMethod,
  type PayerDetails,
} from "./payment-fields";

// Buying usage credit. Kept out of the settings page itself so the panel there
// is just a balance and a button - the packs only appear once someone has said
// they want to top up.
//
// A top-up buys a prepaid KWACHA BALANCE, not a bundle of messages: the pack
// figures are what that balance covers at today's rates. TOPUP_MIX_NOTE says so
// on screen, which is why no individual figure needs to hedge.

type Step = "pack" | "method" | "details" | "processing" | "success" | "error";

export function TopupModal({
  isOpen,
  onClose,
  packs,
  defaultPhone,
  onCredited,
}: {
  isOpen: boolean;
  onClose: () => void;
  packs: TopupPack[];
  defaultPhone?: string;
  onCredited: () => void;
}) {
  const [step, setStep] = useState<Step>("pack");
  const [pack, setPack] = useState<TopupPack | null>(null);
  const [method, setMethod] = useState<PaymentMethod>("mobile_money");
  const [payer, setPayer] = useState<PayerDetails>({ ...emptyPayer, phoneNumber: defaultPhone || "" });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [pollCount, setPollCount] = useState(0);

  // Reset whenever the modal is reopened.
  useEffect(() => {
    if (!isOpen) return;
    setStep("pack");
    setPack(null);
    setMethod("mobile_money");
    setPayer({ ...emptyPayer, phoneNumber: defaultPhone || "" });
    setLoading(false);
    setErrorMsg("");
    setReferenceId("");
    setPollCount(0);
  }, [isOpen, defaultPhone]);

  const pollStatus = useCallback(async () => {
    if (!referenceId || step !== "processing") return;
    try {
      const res = await fetch(`/api/payments/status?ref=${encodeURIComponent(referenceId)}`);
      const data = await res.json();

      if (data.status === "successful") {
        // The status route settles the payment, which is what adds the credit.
        onCredited();
        setStep("success");
        return;
      }
      if (data.status === "failed") {
        setErrorMsg(data.message || "The payment did not go through.");
        setStep("error");
        return;
      }
      if (pollCount < 60) {
        setPollCount((c) => c + 1);
      } else {
        setErrorMsg("This is taking longer than expected. Check your phone, then try again.");
        setStep("error");
      }
    } catch {
      setPollCount((c) => c + 1);
    }
  }, [referenceId, step, pollCount, onCredited]);

  useEffect(() => {
    if (step === "processing" && referenceId) {
      const timer = setTimeout(pollStatus, 5000);
      return () => clearTimeout(timer);
    }
  }, [step, referenceId, pollCount, pollStatus]);

  async function submit() {
    if (!pack) return;
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/credit/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packId: pack.id,
          paymentMethod: method,
          phoneNumber: payer.phoneNumber,
          email: payer.email,
          ...(method === "card" ? { firstName: payer.firstName, lastName: payer.lastName } : {}),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Could not start the top-up.");
        setStep("error");
        return;
      }

      // Card - Lipila's own checkout takes it from here, and sends the customer
      // back to /api/payments/confirm, which credits and redirects.
      if (method === "card" && data.cardRedirectionUrl) {
        window.location.href = data.cardRedirectionUrl;
        return;
      }

      setReferenceId(data.referenceId);
      setStep("processing");
    } catch {
      setErrorMsg("Could not start the top-up.");
      setStep("error");
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {step === "success" ? "Credit added" : step === "error" ? "Top-up failed" : "Add usage credit"}
            </h2>
            {pack && step !== "success" && step !== "error" && (
              <p className="text-sm text-gray-500">
                {pack.label} &middot; {pack.description}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6">
          {step === "pack" && (
            <div className="space-y-3">
              {packs.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setPack(p);
                    setStep("method");
                  }}
                  className="w-full flex items-center justify-between gap-4 rounded-xl border-2 border-gray-200 p-4 hover:border-emerald-400 hover:bg-emerald-50/50 transition-all text-left"
                >
                  <div>
                    <p className="font-semibold text-gray-900">{p.label} credit</p>
                    <p className="text-xs text-gray-500">{p.description}</p>
                  </div>
                </button>
              ))}
              <p className="text-xs text-gray-400 pt-1">{TOPUP_MIX_NOTE}</p>
            </div>
          )}

          {step === "method" && (
            <>
              <button
                type="button"
                onClick={() => setStep("pack")}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium mb-3"
              >
                &larr; Change amount
              </button>
              <PaymentMethodPicker
                onSelect={(m) => {
                  setMethod(m);
                  setStep("details");
                }}
                prompt="How would you like to pay?"
              />
            </>
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

              <PayerFields method={method} value={payer} onChange={setPayer} />

              <div className="rounded-xl bg-gray-50 p-4 mt-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{pack?.label} usage credit</span>
                  <span className="font-bold text-gray-900">{pack?.label}</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">{TOPUP_MIX_NOTE}</p>
              </div>

              <button
                type="button"
                onClick={submit}
                disabled={loading || !payerComplete(method, payer)}
                className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3.5 text-sm font-semibold text-white hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Starting...
                  </>
                ) : (
                  `Pay ${pack?.label}`
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
                  A payment prompt has been sent to <strong>{payer.phoneNumber}</strong>. Enter your
                  PIN to add the credit.
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
                <h3 className="text-lg font-semibold text-gray-900">{pack?.label} added</h3>
                <p className="text-sm text-gray-500 mt-2">
                  That covers {pack?.description}. WhatsApp and voice are live again.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3 text-sm font-semibold text-white hover:from-emerald-600 hover:to-teal-700 transition-all"
              >
                Done
              </button>
            </div>
          )}

          {step === "error" && (
            <div className="text-center py-8 space-y-4">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Top-up failed</h3>
                <p className="text-sm text-gray-500 mt-2">{errorMsg}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStep("pack");
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
