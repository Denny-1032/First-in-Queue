"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, Phone, PhoneOff, X, Loader2, Mic, MicOff } from "lucide-react";
import { RetellWebClient } from "retell-client-js-sdk";

export function FiqSupportWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [status, setStatus] = useState("Ready to call");
  const [error, setError] = useState<string | null>(null);

  const clientRef = useRef<RetellWebClient | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (clientRef.current) {
        try { clientRef.current.stopCall(); } catch { /* ignore */ }
      }
    };
  }, []);

  const startCall = async () => {
    setIsConnecting(true);
    setError(null);
    setStatus("Connecting to FiQ Support...");

    try {
      const res = await fetch("/api/voice/fiq-support/web-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to connect");
      }

      const { access_token } = await res.json();

      clientRef.current = new RetellWebClient();

      clientRef.current.on("call_started", () => {
        setIsCallActive(true);
        setIsConnecting(false);
        setStatus("Connected to FiQ Support");
      });

      clientRef.current.on("call_ended", () => {
        endCall();
      });

      clientRef.current.on("error", (err: Error) => {
        console.error("[FiQ Widget] Error:", err);
        setError(err.message || "Call error");
        endCall();
      });

      await clientRef.current.startCall({ accessToken: access_token });
    } catch (err) {
      console.error("[FiQ Widget] Failed:", err);
      setError(err instanceof Error ? err.message : "Failed to start call");
      setIsConnecting(false);
      setStatus("Call failed");
    }
  };

  const endCall = () => {
    if (clientRef.current) {
      try { clientRef.current.stopCall(); } catch { /* ignore */ }
      clientRef.current = null;
    }
    setIsCallActive(false);
    setIsConnecting(false);
    setIsMuted(false);
    setStatus("Call ended");
  };

  const toggleMute = () => {
    if (clientRef.current) {
      if (isMuted) {
        clientRef.current.unmute();
      } else {
        clientRef.current.mute();
      }
      setIsMuted(!isMuted);
    }
  };

  // Closed state — floating button
  if (!isOpen) {
    return (
      <button
        onClick={() => { setIsOpen(true); setError(null); setStatus("Ready to call"); }}
        className="fixed bottom-6 left-6 z-50 flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 pl-4 pr-5 py-3 text-white shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 hover:scale-105 transition-all duration-200"
        title="Talk to FiQ Support"
      >
        <MessageCircle className="h-5 w-5" />
        <span className="text-sm font-semibold">Talk to us</span>
      </button>
    );
  }

  // Open state — compact card
  return (
    <div className="fixed bottom-6 left-6 z-50 w-80 rounded-2xl bg-white border border-gray-200 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-3">
        <div className="flex items-center gap-2 text-white">
          <Phone className="h-4 w-4" />
          <span className="text-sm font-semibold">FiQ Support</span>
        </div>
        <button
          onClick={() => { if (isCallActive) endCall(); setIsOpen(false); }}
          className="text-white/80 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      <div className="p-5">
        {/* Status */}
        <p className={`text-xs font-medium text-center mb-4 ${
          isCallActive ? "text-emerald-600" : error ? "text-red-500" : "text-gray-500"
        }`}>
          {isCallActive ? "● Connected" : error ? error : status}
        </p>

        {/* Idle state */}
        {!isCallActive && !isConnecting && (
          <div className="text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
              <Phone className="h-6 w-6 text-emerald-600" />
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Speak to our AI support agent — no phone number needed.
            </p>
            <button
              onClick={startCall}
              className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 text-sm transition-colors flex items-center justify-center gap-2"
            >
              <Phone className="h-4 w-4" />
              Call FiQ Support
            </button>
          </div>
        )}

        {/* Connecting */}
        {isConnecting && (
          <div className="text-center py-4">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mx-auto mb-3" />
            <p className="text-xs text-gray-500">Connecting...</p>
          </div>
        )}

        {/* Active call */}
        {isCallActive && (
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={toggleMute}
              className={`h-11 w-11 rounded-full flex items-center justify-center border transition-colors ${
                isMuted
                  ? "bg-red-100 border-red-300"
                  : "bg-gray-100 border-gray-200 hover:bg-gray-200"
              }`}
            >
              {isMuted ? <MicOff className="h-5 w-5 text-red-600" /> : <Mic className="h-5 w-5 text-gray-600" />}
            </button>
            <button
              onClick={endCall}
              className="h-11 px-6 rounded-full bg-red-600 hover:bg-red-700 text-white font-semibold text-sm flex items-center gap-2 transition-colors"
            >
              <PhoneOff className="h-4 w-4" />
              End
            </button>
          </div>
        )}

        {/* Error retry */}
        {error && !isConnecting && !isCallActive && (
          <button
            onClick={() => { setError(null); setStatus("Ready to call"); }}
            className="text-xs text-emerald-600 hover:text-emerald-700 underline mt-2 block mx-auto"
          >
            Try again
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-2 border-t border-gray-100">
        <p className="text-[10px] text-gray-400 text-center">
          Powered by First in Queue • No phone number needed
        </p>
      </div>
    </div>
  );
}
