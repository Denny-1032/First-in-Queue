"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface WebCallWidgetProps {
  agentId?: string;
  greeting?: string;
}

// Retell Client SDK URL
const RETELL_CLIENT_SDK = "https://cdn.retellai.com/retell-client-sdk.js";

// Extend Window interface for Retell
declare global {
  interface Window {
    Retell?: any;
  }
}

export function WebCallWidget({ agentId: propAgentId, greeting }: WebCallWidgetProps) {
  const [isCallActive, setIsCallActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [status, setStatus] = useState<string>("Ready to call");
  const [error, setError] = useState<string | null>(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [agentId, setAgentId] = useState<string>(propAgentId || "");
  const [isLoadingAgent, setIsLoadingAgent] = useState(!propAgentId);

  const clientRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch support agent if not provided
  useEffect(() => {
    if (propAgentId) return;

    async function fetchSupportAgent() {
      try {
        const res = await fetch("/api/voice/agents");
        if (res.ok) {
          const data = await res.json();
          const agents = data.agents || [];
          if (agents.length > 0) {
            setAgentId(agents[0].retell_agent_id);
          } else {
            setError("No voice agents available");
          }
        } else {
          setError("Failed to load voice agents");
        }
      } catch {
        setError("Failed to load voice agents");
      } finally {
        setIsLoadingAgent(false);
      }
    }

    fetchSupportAgent();
  }, [propAgentId]);

  // Load Retell Client SDK with retry logic
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if SDK is already loaded
    if (window.Retell) {
      console.log("[WebCall] SDK already loaded");
      setSdkLoaded(true);
      return;
    }

    let retryCount = 0;
    const maxRetries = 3;

    const loadScript = () => {
      const existingScript = document.querySelector(`script[src="${RETELL_CLIENT_SDK}"]`);
      if (existingScript) {
        console.log("[WebCall] Script already exists, checking if loaded...");
        // Check if it's already loaded
        if (window.Retell) {
          setSdkLoaded(true);
          return;
        }
        // Remove existing script and retry
        existingScript.remove();
      }

      const script = document.createElement("script");
      script.src = RETELL_CLIENT_SDK;
      script.async = true;
      script.crossOrigin = "anonymous";
      
      script.onload = () => {
        console.log("[WebCall] SDK loaded successfully");
        // Give it a moment to initialize
        setTimeout(() => {
          if (window.Retell) {
            setSdkLoaded(true);
          } else {
            console.error("[WebCall] SDK script loaded but Retell not available");
            handleError();
          }
        }, 500);
      };
      
      script.onerror = (e) => {
        console.error("[WebCall] Failed to load SDK:", e);
        handleError();
      };
      
      document.body.appendChild(script);
    };

    const handleError = () => {
      retryCount++;
      if (retryCount < maxRetries) {
        console.log(`[WebCall] Retrying SDK load (${retryCount}/${maxRetries})...`);
        setTimeout(loadScript, 1000 * retryCount);
      } else {
        setError("Failed to load calling SDK. Please refresh the page or try again later.");
      }
    };

    loadScript();

    return () => {
      // Don't remove script on unmount to allow reuse
    };
  }, []);

  // Start a call using Retell Client SDK
  const startCall = async () => {
    if (!sdkLoaded || !window.Retell) {
      setError("Calling SDK not loaded. Please refresh the page.");
      return;
    }

    if (!agentId) {
      setError("No support agent available. Please try again later.");
      return;
    }

    setIsConnecting(true);
    setStatus("Requesting microphone access...");
    setError(null);

    try {
      // 1. Get access token from our API
      setStatus("Connecting to FiQ Support...");
      const res = await fetch("/api/voice/web-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to start call");
      }

      const { access_token } = await res.json();

      // 2. Create Retell client and start call
      const Retell = window.Retell;
      if (!Retell) {
        throw new Error("Retell SDK not available");
      }
      clientRef.current = new Retell({
        accessToken: access_token,
      });

      // Set up event listeners
      clientRef.current.on("call_started", () => {
        setIsCallActive(true);
        setIsConnecting(false);
        setStatus("Connected to FiQ Support");
      });

      clientRef.current.on("call_ended", () => {
        endCall();
      });

      clientRef.current.on("error", (err: Error) => {
        console.error("[WebCall] Client error:", err);
        setError(err.message || "Call error occurred");
        endCall();
      });

      // Start the call - this handles WebRTC internally
      await clientRef.current.start();

    } catch (err) {
      console.error("[WebCall] Failed to start call:", err);
      setError(err instanceof Error ? err.message : "Failed to start call");
      setIsConnecting(false);
      setStatus("Call failed");
    }
  };

  const endCall = () => {
    if (clientRef.current) {
      try {
        clientRef.current.stop();
      } catch {
        // Ignore cleanup errors
      }
      clientRef.current = null;
    }
    setIsCallActive(false);
    setIsConnecting(false);
    setIsMuted(false);
    setIsSpeakerMuted(false);
    setStatus("Call ended");
  };

  const toggleMute = () => {
    if (clientRef.current) {
      const newMuteState = !isMuted;
      if (newMuteState) {
        clientRef.current.mute();
      } else {
        clientRef.current.unmute();
      }
      setIsMuted(newMuteState);
    }
  };

  const toggleSpeaker = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isSpeakerMuted;
      setIsSpeakerMuted(!isSpeakerMuted);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (clientRef.current) {
        try {
          clientRef.current.stop();
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, []);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
          <Phone className="h-8 w-8 text-emerald-600" />
        </div>
        <CardTitle>FiQ Support</CardTitle>
        <CardDescription>
          {greeting || "Talk to our AI support agent directly from your browser"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        <div className="text-center">
          <p className={cn(
            "text-sm font-medium",
            isCallActive ? "text-emerald-600" : error ? "text-red-600" : "text-gray-500"
          )}>
            {isCallActive ? "● On Call" : isLoadingAgent ? "Loading support agent..." : status}
          </p>
          {error && (
            <div className="space-y-2">
              <p className="text-xs text-red-500 mt-1">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  window.location.reload();
                }}
                className="text-xs text-emerald-600 hover:text-emerald-700 underline"
              >
                Click to retry
              </button>
            </div>
          )}
          {isLoadingAgent && !error && (
            <div className="flex items-center justify-center gap-2 mt-2">
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              <span className="text-xs text-gray-400">Loading support agent...</span>
            </div>
          )}
          {!sdkLoaded && !isLoadingAgent && !error && (
            <div className="flex items-center justify-center gap-2 mt-2">
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              <span className="text-xs text-gray-400">Loading calling SDK...</span>
            </div>
          )}
        </div>

        {/* Hidden audio element for remote stream */}
        <audio ref={audioRef} autoPlay playsInline className="hidden" />

        {/* Call Controls */}
        <div className="flex items-center justify-center gap-3">
          {!isCallActive && !isConnecting && (
            <Button
              onClick={startCall}
              disabled={!sdkLoaded || isLoadingAgent || !agentId}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-6 text-lg disabled:opacity-50"
            >
              <Phone className="h-5 w-5" />
              {isLoadingAgent ? "Loading..." : "Call FiQ Support"}
            </Button>
          )}

          {isConnecting && (
            <Button disabled className="gap-2 px-8 py-6 text-lg">
              <Loader2 className="h-5 w-5 animate-spin" />
              Connecting...
            </Button>
          )}

          {isCallActive && (
            <>
              <Button
                variant="outline"
                size="icon"
                onClick={toggleMute}
                className={cn(
                  "h-12 w-12 rounded-full",
                  isMuted && "bg-red-100 border-red-300"
                )}
              >
                {isMuted ? (
                  <MicOff className="h-5 w-5 text-red-600" />
                ) : (
                  <Mic className="h-5 w-5" />
                )}
              </Button>

              <Button
                onClick={endCall}
                className="gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-6 text-lg rounded-full"
              >
                <PhoneOff className="h-5 w-5" />
                End Call
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={toggleSpeaker}
                className={cn(
                  "h-12 w-12 rounded-full",
                  isSpeakerMuted && "bg-amber-100 border-amber-300"
                )}
              >
                {isSpeakerMuted ? (
                  <VolumeX className="h-5 w-5 text-amber-600" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </Button>
            </>
          )}
        </div>

        {/* Help Text */}
        <p className="text-xs text-gray-400 text-center">
          {isCallActive 
            ? "Your call is private and recorded for quality purposes" 
            : "No phone number needed. Works on any device with a microphone."}
        </p>
      </CardContent>
    </Card>
  );
}
