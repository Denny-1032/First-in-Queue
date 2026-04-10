"use client";

import { useState, useEffect } from "react";
import { RetellWebClient } from "retell-client-js-sdk";
import { Phone, PhoneOff, X, MessageCircle, Loader2 } from "lucide-react";

interface CallUsWidgetProps {
  // Widget configuration
  tenantId: string;
  agentId: string;
  primaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  title?: string;
  subtitle?: string;
  showBranding?: boolean;
}

interface WidgetConfig {
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  position: string;
  title: string;
  subtitle: string;
  showBranding: boolean;
}

export default function CallUsWidget({
  tenantId,
  agentId,
  primaryColor = "#3b82f6",
  backgroundColor = "#ffffff",
  textColor = "#1f2937",
  position = "bottom-right",
  title = "Need Help?",
  subtitle = "Talk to our AI assistant",
  showBranding = true,
}: CallUsWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [agentIsSpeaking, setAgentIsSpeaking] = useState(false);
  const [error, setError] = useState("");
  const [accessToken, setAccessToken] = useState("");
  
  const retellClientRef = useRef<RetellWebClient | null>(null);

  const config: WidgetConfig = {
    primaryColor,
    backgroundColor,
    textColor,
    position,
    title,
    subtitle,
    showBranding,
  };

  // Position classes for the widget
  const positionClasses = {
    "bottom-right": "bottom-4 right-4",
    "bottom-left": "bottom-4 left-4",
    "top-right": "top-4 right-4",
    "top-left": "top-4 left-4",
  };

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
      console.log("[CallUsWidget] Call started");
      setIsCallActive(true);
      setIsConnecting(false);
    });

    client.on("call_ended", () => {
      console.log("[CallUsWidget] Call ended");
      setIsCallActive(false);
      setAgentIsSpeaking(false);
      setTranscript("");
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
      console.error("[CallUsWidget] Error:", error);
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
          tenantId,
          agentId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to initialize call");
      }

      const data = await response.json();
      setAccessToken(data.accessToken);
      
      // Start the call immediately after getting access token
      if (retellClientRef.current) {
        await retellClientRef.current.startCall({
          accessToken: data.accessToken,
          sampleRate: 24000,
        });
      }
    } catch (err) {
      console.error("[CallUsWidget] Failed to initialize call:", err);
      setError(err instanceof Error ? err.message : "Failed to start call");
      setIsConnecting(false);
    }
  };

  const endCall = () => {
    if (retellClientRef.current) {
      retellClientRef.current.stopCall();
    }
  };

  const toggleWidget = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setError("");
    }
  };

  if (!isOpen) {
    // Floating button when closed
    return (
      <div
        className={`fixed ${positionClasses[position]} z-50`}
        style={{ zIndex: 9999 }}
      >
        <button
          onClick={toggleWidget}
          className="flex items-center justify-center w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
          style={{ backgroundColor: config.primaryColor }}
          title={config.title}
        >
          {isCallActive ? (
            <div className="relative">
              <Phone className="w-6 h-6 text-white" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
            </div>
          ) : (
            <MessageCircle className="w-6 h-6 text-white" />
          )}
        </button>
      </div>
    );
  }

  // Expanded widget when open
  return (
    <div
      className={`fixed ${positionClasses[position]} z-50`}
      style={{ zIndex: 9999 }}
    >
      <div
        className="rounded-lg shadow-2xl border border-gray-200"
        style={{
          backgroundColor: config.backgroundColor,
          width: "320px",
          maxHeight: "500px",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 border-b border-gray-200"
          style={{ borderColor: `${config.primaryColor}20` }}
        >
          <div>
            <h3 className="font-semibold" style={{ color: config.textColor }}>
              {config.title}
            </h3>
            <p className="text-sm opacity-75" style={{ color: config.textColor }}>
              {config.subtitle}
            </p>
          </div>
          <button
            onClick={toggleWidget}
            className="p-1 rounded hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" style={{ color: config.textColor }} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
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

// Helper function to embed the widget on any website
export function embedCallUsWidget(config: CallUsWidgetProps) {
  // This function can be called from external websites to embed the widget
  // The external site would need to load this component via a script tag
  console.log("Call Us Widget embedded with config:", config);
}
