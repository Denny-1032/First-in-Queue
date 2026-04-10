"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { RetellWebClient } from "retell-client-js-sdk";
import { Phone, PhoneOff } from "lucide-react";

interface WebCallClientProps {
  accessToken: string;
  autoStart?: boolean;
  onCallStart?: () => void;
  onCallEnd?: () => void;
  onTranscriptUpdate?: (transcript: string) => void;
  onError?: (error: string) => void;
}

export default function WebCallClient({
  accessToken,
  autoStart = true,
  onCallStart,
  onCallEnd,
  onTranscriptUpdate,
  onError,
}: WebCallClientProps) {
  const [isCallActive, setIsCallActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [agentIsSpeaking, setAgentIsSpeaking] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callEnded, setCallEnded] = useState(false);
  
  const retellClientRef = useRef<RetellWebClient | null>(null);
  const callStartTimeRef = useRef<Date | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasStartedRef = useRef(false);

  const startCall = useCallback(async () => {
    if (!retellClientRef.current || !accessToken || hasStartedRef.current) return;
    hasStartedRef.current = true;

    try {
      setIsConnecting(true);
      await retellClientRef.current.startCall({
        accessToken,
        sampleRate: 24000,
      });
    } catch (error) {
      console.error("[WebCall] Failed to start call:", error);
      setIsConnecting(false);
      hasStartedRef.current = false;
      onError?.(error instanceof Error ? error.message : "Failed to start call. Check microphone permissions.");
    }
  }, [accessToken, onError]);

  useEffect(() => {
    retellClientRef.current = new RetellWebClient();
    const client = retellClientRef.current;

    client.on("call_started", () => {
      console.log("[WebCall] Call started");
      setIsCallActive(true);
      setIsConnecting(false);
      callStartTimeRef.current = new Date();
      
      durationIntervalRef.current = setInterval(() => {
        if (callStartTimeRef.current) {
          const duration = Math.floor(
            (new Date().getTime() - callStartTimeRef.current.getTime()) / 1000
          );
          setCallDuration(duration);
        }
      }, 1000);
      
      onCallStart?.();
    });

    client.on("call_ended", () => {
      console.log("[WebCall] Call ended");
      setIsCallActive(false);
      setAgentIsSpeaking(false);
      setCallEnded(true);
      
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
      
      onCallEnd?.();
    });

    client.on("agent_start_talking", () => setAgentIsSpeaking(true));
    client.on("agent_stop_talking", () => setAgentIsSpeaking(false));

    client.on("update", (update) => {
      if (update.transcript) {
        const newTranscript = update.transcript
          .map((item: any) => `${item.role}: ${item.content}`)
          .join("\n");
        setTranscript(newTranscript);
        onTranscriptUpdate?.(newTranscript);
      }
    });

    client.on("error", (error) => {
      console.error("[WebCall] Error:", error);
      setIsConnecting(false);
      setIsCallActive(false);
      onError?.(error.message || "Call error occurred");
    });

    // Auto-start call if configured
    if (autoStart && accessToken) {
      startCall();
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (client) {
        client.stopCall();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopCall = () => {
    if (retellClientRef.current) {
      retellClientRef.current.stopCall();
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
      {/* Call Status */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center mb-2">
          {isConnecting && (
            <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse mr-2" />
          )}
          {isCallActive && (
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2 animate-pulse" />
          )}
          {callEnded && !isCallActive && (
            <div className="w-3 h-3 bg-gray-400 rounded-full mr-2" />
          )}
          {!isConnecting && !isCallActive && !callEnded && (
            <div className="w-3 h-3 bg-blue-400 rounded-full mr-2 animate-pulse" />
          )}
          <span className="text-sm font-medium text-gray-600">
            {isConnecting
              ? "Connecting..."
              : isCallActive
              ? "On Call"
              : callEnded
              ? "Call Ended"
              : "Starting..."}
          </span>
        </div>
        {(isCallActive || callEnded) && (
          <div className="text-2xl font-bold text-gray-800">
            {formatDuration(callDuration)}
          </div>
        )}
      </div>

      {/* Agent Speaking Indicator */}
      {agentIsSpeaking && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-center">
            <div className="flex space-x-1 mr-2">
              <div className="w-1.5 h-3 bg-blue-500 rounded-full animate-pulse" />
              <div className="w-1.5 h-4 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: "0.15s" }} />
              <div className="w-1.5 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: "0.3s" }} />
            </div>
            <span className="text-sm text-blue-700">Agent is speaking...</span>
          </div>
        </div>
      )}

      {/* Call Controls */}
      <div className="flex justify-center items-center space-x-4 mb-6">
        {!isCallActive && !isConnecting && !callEnded ? (
          <button
            onClick={startCall}
            disabled={!accessToken}
            className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded-full p-4 transition-colors"
          >
            <Phone className="w-6 h-6" />
          </button>
        ) : isCallActive ? (
          <button
            onClick={stopCall}
            className="bg-red-500 hover:bg-red-600 text-white rounded-full p-4 transition-colors animate-pulse"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        ) : null}
      </div>

      {/* Transcript */}
      {transcript && (
        <div className="bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto">
          <h3 className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Transcript</h3>
          <div className="space-y-1">
            {transcript.split("\n").map((line, i) => {
              const isAgent = line.startsWith("agent:");
              return (
                <p key={i} className={`text-xs ${isAgent ? "text-blue-700" : "text-gray-700"}`}>
                  {line}
                </p>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
