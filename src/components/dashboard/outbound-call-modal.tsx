"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Phone, X, Loader2, PhoneCall, User, MessageSquareText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

interface OutboundCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string | null;
  remainingMinutes: number;
}

export function OutboundCallModal({ isOpen, onClose, tenantId, remainingMinutes }: OutboundCallModalProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<"form" | "calling" | "done">("form");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [calling, setCalling] = useState(false);
  const [callResult, setCallResult] = useState<{ callId: string; retellCallId: string } | null>(null);

  if (!isOpen) return null;

  const handleCall = async () => {
    if (!phone || !tenantId) return;

    setCalling(true);
    setStep("calling");

    try {
      const res = await fetch("/api/voice/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          customerPhone: phone.startsWith("+") ? phone : `+${phone}`,
          customerName: name || undefined,
          purpose: purpose || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to initiate call");
      }

      setCallResult(data);
      setStep("done");
      toast(`Call initiated — calling ${name || phone}...`, "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Call failed", "error");
      setStep("form");
    } finally {
      setCalling(false);
    }
  };

  const handleClose = () => {
    setStep("form");
    setPhone("");
    setName("");
    setPurpose("");
    setCallResult(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-teal-50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
              <PhoneCall className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Make a Call</h2>
              <p className="text-xs text-gray-500">{remainingMinutes} minutes remaining</p>
            </div>
          </div>
          <button onClick={handleClose} className="rounded-lg p-2 hover:bg-white/60 transition-colors">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6">
          {step === "form" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <Phone className="inline h-4 w-4 mr-1.5 text-gray-400" />
                  Phone Number *
                </label>
                <Input
                  placeholder="+260 97X XXX XXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-11"
                />
                <p className="mt-1 text-xs text-gray-400">Include country code (e.g. +260 for Zambia)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <User className="inline h-4 w-4 mr-1.5 text-gray-400" />
                  Customer Name
                </label>
                <Input
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <MessageSquareText className="inline h-4 w-4 mr-1.5 text-gray-400" />
                  Purpose
                </label>
                <Input
                  placeholder="Follow up on order #1234"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="h-11"
                />
              </div>

              {remainingMinutes <= 5 && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                  <p className="text-sm text-amber-800 font-medium">Low on voice minutes</p>
                  <p className="text-xs text-amber-600">Only {remainingMinutes} minutes remaining this period.</p>
                </div>
              )}

              <Button
                onClick={handleCall}
                disabled={!phone || remainingMinutes <= 0}
                className="w-full h-11 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <PhoneCall className="h-4 w-4" />
                Call Now
              </Button>
            </div>
          )}

          {step === "calling" && (
            <div className="flex flex-col items-center py-8 space-y-4">
              <div className="relative">
                <div className="h-20 w-20 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Phone className="h-8 w-8 text-emerald-600" />
                </div>
                <div className="absolute inset-0 rounded-full border-2 border-emerald-400 animate-ping" />
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-gray-900">Connecting...</p>
                <p className="text-sm text-gray-500">{name || phone}</p>
              </div>
              <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
            </div>
          )}

          {step === "done" && (
            <div className="flex flex-col items-center py-8 space-y-4">
              <div className="h-20 w-20 rounded-full bg-emerald-100 flex items-center justify-center">
                <PhoneCall className="h-8 w-8 text-emerald-600" />
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-gray-900">Call Initiated</p>
                <p className="text-sm text-gray-500">
                  AI agent is now calling {name || phone}
                </p>
              </div>
              <Button onClick={handleClose} variant="outline" className="gap-2">
                Close
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
