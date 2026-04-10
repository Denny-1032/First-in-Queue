"use client";

import { useState, useEffect, useRef } from "react";
import { RetellWebClient } from "retell-client-js-sdk";
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX } from "lucide-react";

interface WebCallClientProps {
  accessToken: string;
  onCallStart?: () => void;
  onCallEnd?: () => void;
  onTranscriptUpdate?: (transcript: string) => void;
  onError?: (error: string) => void;
}

export default function WebCallClient({
  accessToken,
  onCallStart,
  onCallEnd,
  onTranscriptUpdate,
  onError,
}: WebCallClientProps) {
  const [isCallActive, setIsCallActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOff, setIsSpeakerOff] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [agentIsSpeaking, setAgentIsSpeaking] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  
  const retellClientRef = useRef<RetellWebClient | null>(null);
  const callStartTimeRef = useRef<Date | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Initialize Retell Web Client
    retellClientRef.current = new RetellWebClient();
    
    // Set up event listeners
    const client = retellClientRef.current;

    client.on("call_started", () => {
      console.log("[WebCall] Call started");
      setIsCallActive(true);
      setIsConnecting(false);
      callStartTimeRef.current = new Date();
      
      // Start duration timer
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
      
      // Clear duration timer
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
      
      onCallEnd?.();
    });

    client.on("agent_start_talking", () => {
      console.log("[WebCall] Agent started talking");
      setAgentIsSpeaking(true);
    });

    client.on("agent_stop_talking", () => {
      console.log("[WebCall] Agent stopped talking");
      setAgentIsSpeaking(false);
    });

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

    return () => {
      // Cleanup
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (client) {
        client.stopCall();
      }
    };
  }, [onCallStart, onCallEnd, onTranscriptUpdate, onError]);

  const startCall = async () => {
    if (!retellClientRef.current || !accessToken) {
      onError?.("Invalid access token");
      return;
    }

    try {
      setIsConnecting(true);
      await retellClientRef.current.startCall({
        accessToken,
        sampleRate: 24000,
      });
    } catch (error) {
      console.error("[WebCall] Failed to start call:", error);
      setIsConnecting(false);
      onError?.(error instanceof Error ? error.message : "Failed to start call");
    }
  };

  const stopCall = () => {
    if (retellClientRef.current) {
      retellClientRef.current.stopCall();
    }
  };

  const toggleMute = () => {
    if (retellClientRef.current) {
      // Note: RetellWebClient doesn't have built-in mute/unmute
      // This would need to be implemented at the audio stream level
      setIsMuted(!isMuted);
    }
  };

  const toggleSpeaker = () => {
    if (retellClientRef.current) {
      // Note: Speaker control would need audio context manipulation
      setIsSpeakerOff(!isSpeakerOff);
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
          {!isConnecting && !isCallActive && (
            <div className="w-3 h-3 bg-gray-400 rounded-full mr-2" />
          )}
          <span className="text-sm font-medium text-gray-600">
            {isConnecting ? "Connecting..." : isCallActive ? "On Call" : "Ready"}
          </span>
        </div>
        {isCallActive && (
          <div className="text-2xl font-bold text-gray-800">
            {formatDuration(callDuration)}
          </div>
        )}
      </div>

      {/* Agent Speaking Indicator */}
      {agentIsSpeaking && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mr-2" />
            <span className="text-sm text-blue-700">Agent is speaking...</span>
          </div>
        </div>
      )}

      {/* Call Controls */}
      <div className="flex justify-center items-center space-x-4 mb-6">
        {!isCallActive ? (
          <button
            onClick={startCall}
            disabled={isConnecting || !accessToken}
            className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded-full p-4 transition-colors"
          >
            <Phone className="w-6 h-6" />
          </button>
        ) : (
          <button
            onClick={stopCall}
            className="bg-red-500 hover:bg-red-600 text-white rounded-full p-4 transition-colors"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        )}

        <button
          onClick={toggleMute}
          disabled={!isCallActive}
          className="bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 rounded-full p-3 transition-colors"
        >
          {isMuted ? <MicOff className="w-5 h-5 text-gray-600" /> : <Mic className="w-5 h-5 text-gray-600" />}
        </button>

        <button
          onClick={toggleSpeaker}
          disabled={!isCallActive}
          className="bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 rounded-full p-3 transition-colors"
        >
          {isSpeakerOff ? <VolumeX className="w-5 h-5 text-gray-600" /> : <Volume2 className="w-5 h-5 text-gray-600" />}
        </button>
      </div>

      {/* Transcript */}
      {transcript && (
        <div className="bg-gray-50 rounded-lg p-4 max-h-32 overflow-y-auto">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Transcript</h3>
          <pre className="text-xs text-gray-600 whitespace-pre-wrap">{transcript}</pre>
        </div>
      )}
    </div>
  );
}
