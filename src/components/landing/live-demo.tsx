"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { Bot, Globe, MessageSquare, Mic, MicOff, Phone, PhoneOff, Loader2 } from "lucide-react";
import { useVoiceCall, formatCallTime } from "@/lib/widget/use-voice-call";

// "See it in action". The chat tabs replay a scripted conversation at real
// speed - typing indicator, pauses, the lot - because a screenshot of a
// conversation proves nothing about a product whose whole claim is that it
// answers fast.
//
// The voice tab is not a simulation: it dials the same FiQ support agent a
// customer would reach. That endpoint is IP rate limited server-side, since
// every connection costs real Retell minutes.

const FIQ_VOICE_ENDPOINT = "/api/voice/fiq-support/web-call";

type Sender = "customer" | "bot";

interface ScriptLine {
  from: Sender;
  text: string;
  /** How long the assistant appears to be typing before this line lands. */
  typingMs?: number;
  /** Pause before the line is shown, i.e. how long the customer took to write. */
  delayMs?: number;
}

const WEB_SCRIPT: ScriptLine[] = [
  { from: "customer", text: "Hi! Do you deliver to Kitwe?", delayMs: 600 },
  {
    from: "bot",
    text: "Yes we do! Deliveries to Kitwe go out every Tuesday and Friday, and usually arrive the next morning.",
    typingMs: 1100,
  },
  { from: "customer", text: "How much is delivery?", delayMs: 1400 },
  {
    from: "bot",
    text: "K85 for orders under K1,000, and free above that. Would you like me to check if your order qualifies?",
    typingMs: 1200,
  },
  { from: "customer", text: "Yes please, order #ORD-2024-8847", delayMs: 1500 },
  {
    from: "bot",
    text: "That one's K1,240 - so delivery is free. It's packed and leaves on Friday. Anything else?",
    typingMs: 1400,
  },
];

const WHATSAPP_SCRIPT: ScriptLine[] = [
  { from: "customer", text: "Good evening, are you still open?", delayMs: 600 },
  {
    from: "bot",
    text: "Good evening! We closed at 6pm, but I can still help right now - and anything you order tonight goes out first thing tomorrow.",
    typingMs: 1200,
  },
  { from: "customer", text: "Ok. Do you have the 20kg bag in stock?", delayMs: 1600 },
  {
    from: "bot",
    text: "Yes, 14 left. Want me to hold one under your name until noon tomorrow?",
    typingMs: 1100,
  },
  { from: "customer", text: "Please do 👍", delayMs: 1200 },
  {
    from: "bot",
    text: "Done - reserved under your number. I've sent the pickup details to this chat.",
    typingMs: 1000,
  },
];

const TABS = [
  { id: "web", label: "Website chat", icon: Globe },
  { id: "whatsapp", label: "WhatsApp", icon: MessageSquare },
  { id: "voice", label: "Voice call", icon: Phone },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function LiveDemo() {
  const [tab, setTab] = useState<TabId>("web");

  return (
    <div>
      <div className="flex justify-center mb-6">
        <div
          className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1"
          role="tablist"
          aria-label="Demo channel"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                tab === t.id
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "voice" ? (
        <VoiceDemo />
      ) : (
        <ChatReplay
          key={tab}
          script={tab === "whatsapp" ? WHATSAPP_SCRIPT : WEB_SCRIPT}
          channel={tab}
        />
      )}
    </div>
  );
}

function ChatReplay({ script, channel }: { script: ScriptLine[]; channel: "web" | "whatsapp" }) {
  const [shown, setShown] = useState<ScriptLine[]>([]);
  const [typing, setTyping] = useState(false);
  const [done, setDone] = useState(false);
  const [paused, setPaused] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  const replay = useCallback(() => {
    setShown([]);
    setTyping(false);
    setDone(false);
  }, []);

  useEffect(() => {
    // Someone who has asked for reduced motion gets the finished conversation,
    // not an animation they cannot turn off.
    if (reducedMotion) {
      setShown(script);
      setDone(true);
      return;
    }
    if (paused || done) return;

    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const step = (i: number) => {
      if (cancelled || i >= script.length) {
        if (!cancelled) setDone(true);
        return;
      }
      const line = script[i];

      timers.push(
        setTimeout(() => {
          if (cancelled) return;
          if (line.from === "bot") {
            setTyping(true);
            timers.push(
              setTimeout(() => {
                if (cancelled) return;
                setTyping(false);
                setShown((prev) => [...prev, line]);
                step(i + 1);
              }, line.typingMs ?? 900)
            );
          } else {
            setShown((prev) => [...prev, line]);
            step(i + 1);
          }
        }, line.delayMs ?? 400)
      );
    };

    step(shown.length);

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
    // `shown.length` is deliberately excluded: it changes on every line and
    // would restart the schedule mid-conversation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [script, paused, done, reducedMotion]);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: reducedMotion ? "auto" : "smooth",
    });
  }, [shown, typing, reducedMotion]);

  const isWhatsApp = channel === "whatsapp";

  return (
    <div
      className="rounded-2xl border border-gray-200 bg-gradient-to-b from-gray-50 to-white shadow-2xl shadow-gray-200/50 overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className={`px-6 py-4 flex items-center gap-3 ${
          isWhatsApp ? "bg-[#075E54]" : "bg-emerald-600"
        }`}
      >
        <Image
          src="/fiq-logo.png?v=2"
          alt=""
          width={200}
          height={200}
          className="h-9 w-9 object-contain rounded-full bg-white/10 p-0.5"
        />
        <div className="flex-1">
          <p className="text-white font-medium text-sm">FiQ Assistant</p>
          <p className="text-emerald-200 text-xs">
            {isWhatsApp ? "WhatsApp Business" : "online"}
          </p>
        </div>
        {done && (
          <button
            onClick={replay}
            className="text-xs font-medium text-white/80 hover:text-white transition-colors"
          >
            Replay
          </button>
        )}
      </div>

      <div
        ref={listRef}
        className={`p-6 space-y-4 h-[340px] overflow-y-auto ${
          isWhatsApp ? "bg-[#ECE5DD]" : "bg-[#f0f2f5]"
        }`}
        role="log"
        aria-live="polite"
      >
        {shown.map((line, i) => (
          <div key={i} className={`flex ${line.from === "bot" ? "justify-end" : "justify-start"}`}>
            <div
              className={`rounded-2xl px-4 py-2.5 text-sm shadow-sm max-w-[75%] ${
                line.from === "bot"
                  ? `rounded-tr-sm text-white ${isWhatsApp ? "bg-[#128C7E]" : "bg-emerald-500"}`
                  : "rounded-tl-sm bg-white text-gray-900"
              }`}
            >
              {line.text}
            </div>
          </div>
        ))}

        {typing && (
          <div className="flex justify-end">
            <div className="bg-white rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm flex gap-1.5">
              <Dot /> <Dot delay="150ms" /> <Dot delay="300ms" />
            </div>
          </div>
        )}

        {done && (
          <div className="flex justify-center pt-2">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-white/80 rounded-full px-3 py-1">
              <Bot className="h-3 w-3 text-emerald-500" />
              Handled automatically - no staff involved
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Dot({ delay = "0ms" }: { delay?: string }) {
  return (
    <span
      className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce motion-reduce:animate-none"
      style={{ animationDelay: delay }}
    />
  );
}

function VoiceDemo() {
  const voice = useVoiceCall({ endpoint: FIQ_VOICE_ENDPOINT });
  const onCall = voice.state === "connecting" || voice.state === "active";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-2xl shadow-gray-200/50 overflow-hidden">
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
          <Phone className="h-4 w-4 text-white" />
        </span>
        <div>
          <p className="text-white font-medium text-sm">FiQ Voice Agent</p>
          <p className="text-purple-200 text-xs">
            {voice.state === "active"
              ? voice.agentTalking
                ? "Speaking…"
                : "Listening…"
              : "Ready when you are"}
          </p>
        </div>
      </div>

      <div className="p-8 text-center min-h-[340px] flex flex-col items-center justify-center">
        {voice.state === "idle" || voice.state === "ended" ? (
          <>
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-purple-100">
              <Phone className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              {voice.state === "ended" ? "Call ended" : "This one is real"}
            </h3>
            <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto">
              Talk to the same voice agent that answers phones for FiQ customers. No phone number,
              no download - it runs in this tab.
            </p>
            <button
              onClick={voice.start}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-8 py-3.5 text-sm font-semibold text-white hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg shadow-purple-500/25"
            >
              <Phone className="h-4 w-4" />
              {voice.state === "ended" ? "Call again" : "Start the call"}
            </button>
            <p className="text-xs text-gray-400 mt-3">Your browser will ask for the microphone.</p>
          </>
        ) : voice.state === "error" ? (
          <>
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
              <PhoneOff className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Couldn&apos;t connect</h3>
            <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto">{voice.error}</p>
            <button
              onClick={voice.reset}
              className="mt-6 rounded-xl border-2 border-gray-200 px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all"
            >
              Try again
            </button>
          </>
        ) : (
          <>
            <div
              className={`mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full transition-colors ${
                voice.agentTalking ? "bg-purple-200" : "bg-purple-100"
              }`}
            >
              {voice.state === "connecting" ? (
                <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
              ) : (
                <Phone
                  className={`h-8 w-8 text-purple-600 ${
                    voice.agentTalking ? "animate-pulse motion-reduce:animate-none" : ""
                  }`}
                />
              )}
            </div>
            <p className="text-sm font-medium text-gray-900">
              {voice.state === "connecting" ? "Connecting…" : formatCallTime(voice.seconds)}
            </p>
            {onCall && voice.state === "active" && (
              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  onClick={voice.toggleMute}
                  aria-pressed={voice.muted}
                  className={`flex h-11 w-11 items-center justify-center rounded-full border transition-colors ${
                    voice.muted
                      ? "bg-red-100 border-red-300"
                      : "bg-gray-100 border-gray-200 hover:bg-gray-200"
                  }`}
                >
                  {voice.muted ? (
                    <MicOff className="h-5 w-5 text-red-600" />
                  ) : (
                    <Mic className="h-5 w-5 text-gray-600" />
                  )}
                </button>
                <button
                  onClick={voice.stop}
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-red-600 px-6 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
                >
                  <PhoneOff className="h-4 w-4" />
                  End call
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia(REDUCED_MOTION_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/**
 * The media query is external state, so it is read through
 * useSyncExternalStore rather than mirrored into a useState - that way the
 * first render already knows the answer and the animation never starts for
 * someone who asked for no motion. Server render returns false; the client
 * corrects it on hydration.
 */
function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false
  );
}
