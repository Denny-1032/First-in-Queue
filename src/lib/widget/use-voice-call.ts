"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RetellWebClient } from "retell-client-js-sdk";

// Browser voice call for the chat widget.
//
// The SDK is ~200KB and most visitors never press call, so it is imported
// dynamically on first use — the chat panel's initial load must not pay for it.
//
// The access token comes from /api/widget/voice-call, which is what enforces
// plan, minutes and rate limits. Nothing here is a security control; a visitor
// editing this code still cannot obtain a token.

export type VoiceState = "idle" | "connecting" | "active" | "ended" | "error";

interface Options {
  /** Reads the current visitor token at call time (it can be reissued). */
  getToken: () => string | null;
  onEvent?: (type: string, payload?: unknown) => void;
}

const MIC_DENIED =
  "We couldn't use your microphone. Allow microphone access and try again.";

export function useVoiceCall({ getToken, onEvent }: Options) {
  const [state, setState] = useState<VoiceState>("idle");
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [agentTalking, setAgentTalking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientRef = useRef<RetellWebClient | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startingRef = useRef(false);

  const clearTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const stop = useCallback(() => {
    clientRef.current?.stopCall();
  }, []);

  const start = useCallback(async () => {
    if (startingRef.current || state === "connecting" || state === "active") return;
    const token = getToken();
    if (!token) return;

    startingRef.current = true;
    setError(null);
    setSeconds(0);
    setMuted(false);
    setState("connecting");

    try {
      const res = await fetch("/api/widget/voice-call", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setState("error");
        setError(
          res.status === 429
            ? "Too many call attempts. Please try again later."
            : res.status === 403
              ? "Voice calling isn't available right now. Send a message instead."
              : data.error || "We couldn't start the call. Please try again."
        );
        return;
      }

      const { access_token } = await res.json();

      const { RetellWebClient } = await import("retell-client-js-sdk");
      const client = new RetellWebClient();
      clientRef.current = client;

      client.on("call_started", () => {
        setState("active");
        setSeconds(0);
        clearTimer();
        timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
        onEvent?.("voice-started");
      });

      client.on("call_ended", () => {
        clearTimer();
        setAgentTalking(false);
        setState("ended");
        onEvent?.("voice-ended");
      });

      client.on("agent_start_talking", () => setAgentTalking(true));
      client.on("agent_stop_talking", () => setAgentTalking(false));

      client.on("error", (e: unknown) => {
        clearTimer();
        const msg = e instanceof Error ? e.message : String(e ?? "");
        setState("error");
        setError(/permission|denied|notallowed/i.test(msg) ? MIC_DENIED : "The call dropped. Please try again.");
        client.stopCall();
      });

      await client.startCall({ accessToken: access_token, sampleRate: 24000 });
    } catch (e) {
      // getUserMedia rejects here when the visitor blocks the mic, or when the
      // embedding page withholds the microphone permission from our iframe.
      const msg = e instanceof Error ? e.message : "";
      setState("error");
      setError(/permission|denied|notallowed|notfound/i.test(msg) ? MIC_DENIED : "We couldn't start the call. Please try again.");
    } finally {
      startingRef.current = false;
    }
  }, [getToken, onEvent, state]);

  const toggleMute = useCallback(() => {
    const client = clientRef.current;
    if (!client) return;
    setMuted((m) => {
      if (m) client.unmute();
      else client.mute();
      return !m;
    });
  }, []);

  const reset = useCallback(() => {
    setState("idle");
    setError(null);
    setSeconds(0);
  }, []);

  // Never leave a call running when the panel unmounts — that keeps billing.
  useEffect(() => {
    return () => {
      clearTimer();
      clientRef.current?.stopCall();
    };
  }, []);

  return { state, seconds, muted, agentTalking, error, start, stop, toggleMute, reset };
}

export function formatCallTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
