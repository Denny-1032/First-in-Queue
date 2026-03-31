"use client";

import { useState } from "react";
import { Phone, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

export function VoiceDemoCall() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) return;

    setLoading(true);
    setStatus("idle");
    setMessage("");

    try {
      const response = await fetch("/api/demo/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: phoneNumber.startsWith("+") ? phoneNumber : `+260${phoneNumber}` }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus("success");
        setMessage(data.message || "Demo call initiated! You'll receive a call in 10-15 seconds.");
        setPhoneNumber("");
      } else if (response.status === 503) {
        setStatus("error");
        setMessage(data.error || "Demo calls coming soon! We're setting up the voice line.");
      } else {
        setStatus("error");
        setMessage(data.error || "Failed to initiate demo call");
      }
    } catch (error) {
      setStatus("error");
      setMessage("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-gradient-to-b from-gray-50 to-white shadow-2xl shadow-gray-200/50 overflow-hidden">
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-5 text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm mb-3">
          <Phone className="h-8 w-8 text-white" />
        </div>
        <p className="text-white font-semibold">Try a Live Demo Call</p>
        <p className="text-purple-200 text-sm">15-second sales call from our AI • 1 call per day</p>
      </div>
      
      <div className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="demo-phone" className="block text-sm font-medium text-gray-700 mb-2">
              Your phone number
            </label>
            <div className="flex gap-2">
              <input
                id="demo-phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="97 123 4567"
                className="flex-1 h-11 px-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !phoneNumber.trim()}
                className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Call Me"
                )}
              </button>
            </div>
          </div>

          {status === "success" && (
            <div className="flex items-start gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-emerald-800">Demo call initiated!</p>
                <p className="text-sm text-emerald-700 mt-1">{message}</p>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">Unable to place call</p>
                <p className="text-sm text-red-700 mt-1">{message}</p>
              </div>
            </div>
          )}

          <div className="text-xs text-gray-500 text-center">
            By requesting a demo call, you agree to receive a 15-second automated call from FiQ's AI assistant.
          </div>
        </form>
      </div>
    </div>
  );
}
