"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { RetellWebClient } from "retell-client-js-sdk";
import { Phone, PhoneOff, X, MessageCircle, Loader2 } from "lucide-react";

function WidgetIframeContent() {
  const searchParams = useSearchParams();
  
  // Widget configuration from URL params
  const config = {
    tenantId: searchParams.get("tenantId") || "",
    agentId: searchParams.get("agentId") || "",
    primaryColor: searchParams.get("primaryColor") || "#3b82f6",
    backgroundColor: searchParams.get("backgroundColor") || "#ffffff",
    textColor: searchParams.get("textColor") || "#1f2937",
    title: searchParams.get("title") || "Need Help?",
    subtitle: searchParams.get("subtitle") || "Talk to our AI assistant",
    showBranding: searchParams.get("showBranding") !== "false",
  };

  const [isOpen, setIsOpen] = useState(true); // Always open in iframe
  const [isCallActive, setIsCallActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [agentIsSpeaking, setAgentIsSpeaking] = useState(false);
  const [error, setError] = useState("");
  const [accessToken, setAccessToken] = useState("");
  
  const retellClientRef = useRef<RetellWebClient | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      retellClientRef.current = new RetellWebClient();
      setupEventListeners();
    }
  }, []);

  const setupEventListeners = () => {
    const client = retellClientRef.current;
    if (!client) return;

    client.on("call_started", () => {
      console.log("[WidgetIframe] Call started");
      setIsCallActive(true);
      setIsConnecting(false);
      
      // Notify parent window about call state
      window.parent.postMessage({
        type: "fiq-widget-call-started",
        tenantId: config.tenantId,
        agentId: config.agentId,
      }, "*");
    });

    client.on("call_ended", () => {
      console.log("[WidgetIframe] Call ended");
      setIsCallActive(false);
      setAgentIsSpeaking(false);
      setTranscript("");
      
      // Notify parent window
      window.parent.postMessage({
        type: "fiq-widget-call-ended",
        tenantId: config.tenantId,
        agentId: config.agentId,
      }, "*");
    });

    client.on("agent_start_talking", () => {
      setAgentIsSpeaking(true);
    });

    client.on("agent_stop_talking", () => {
      setAgentIsSpeaking(false);
    });

    client.on("update", (update) => {
      if (update.transcript) {
        const newTranscript = update.transcript
          .map((item: any) => `${item.role}: ${item.content}`)
          .join("\n");
        setTranscript(newTranscript);
      }
    });

    client.on("error", (error) => {
      console.error("[WidgetIframe] Error:", error);
      setIsConnecting(false);
      setIsCallActive(false);
      setError(error.message || "Call error occurred");
    });
  };

  const initializeCall = async () => {
    setIsConnecting(true);
    setError("");

    try {
      const response = await fetch(`${window.location.origin}/api/voice/web-call`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tenantId: config.tenantId,
          agentId: config.agentId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to initialize call");
      }

      const data = await response.json();
      setAccessToken(data.accessToken);
      
      // Start the call immediately
      if (retellClientRef.current) {
        await retellClientRef.current.startCall({
          accessToken: data.accessToken,
          sampleRate: 24000,
        });
      }
    } catch (err) {
      console.error("[WidgetIframe] Failed to initialize call:", err);
      setError(err instanceof Error ? err.message : "Failed to start call");
      setIsConnecting(false);
    }
  };

  const endCall = () => {
    if (retellClientRef.current) {
      retellClientRef.current.stopCall();
    }
  };

  // Validate required params
  if (!config.tenantId || !config.agentId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center p-6 bg-white rounded-lg shadow">
          <p className="text-red-600">Invalid widget configuration</p>
          <p className="text-sm text-gray-600 mt-2">Missing tenantId or agentId</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: config.backgroundColor }}>
      <div className="max-w-sm mx-auto h-screen flex flex-col">  
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 border-b"
          style={{ 
            borderColor: `${config.primaryColor}20`,
            backgroundColor: config.backgroundColor 
          }}
        >
          <div>
            <h3 className="font-semibold" style={{ color: config.textColor }}>
              {config.title}
            </h3>
            <p className="text-sm opacity-75" style={{ color: config.textColor }}>
              {config.subtitle}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4">
          {!isCallActive && !isConnecting && (
            <div className="text-center py-6">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: `${config.primaryColor}20` }}
              >
                <MessageCircle className="w-8 h-8" style={{ color: config.primaryColor }} />
              </div>
              <p className="text-sm mb-4" style={{ color: config.textColor }}>
                Click below to start a voice call with our AI assistant
              </p>
              <button
                onClick={initializeCall}
                className="w-full py-3 px-4 rounded-lg font-medium transition-colors hover:opacity-90"
                style={{ backgroundColor: config.primaryColor, color: "white" }}
              >
                <Phone className="w-4 h-4 inline mr-2" />
                Start Call
              </button>
            </div>
          )}

          {isConnecting && (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" style={{ color: config.primaryColor }} />
              <p className="text-sm" style={{ color: config.textColor }}>
                Connecting to AI assistant...
              </p>
            </div>
          )}

          {isCallActive && (
            <div className="space-y-4">
              {/* Call status */}
              <div className="flex items-center justify-center">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm font-medium" style={{ color: config.textColor }}>
                    Connected
                  </span>
                  {agentIsSpeaking && (
                    <span className="text-xs opacity-75">Agent speaking...</span>
                  )}
                </div>
              </div>

              {/* End call button */}
              <button
                onClick={endCall}
                className="w-full py-2 px-4 rounded-lg font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                <PhoneOff className="w-4 h-4 inline mr-2" />
                End Call
              </button>

              {/* Transcript */}
              {transcript && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg max-h-32 overflow-y-auto">
                  <p className="text-xs font-medium mb-2" style={{ color: config.textColor }}>
                    Conversation
                  </p>
                  <pre className="text-xs whitespace-pre-wrap" style={{ color: config.textColor }}>
                    {transcript}
                  </pre>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Footer branding */}
        {config.showBranding && (
          <div className="px-4 py-2 border-t border-gray-200">
            <p className="text-xs text-center opacity-60" style={{ color: config.textColor }}>
              Powered by First in Queue
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function WidgetIframe() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
        </div>
      }
    >
      <WidgetIframeContent />
    </Suspense>
  );
}
