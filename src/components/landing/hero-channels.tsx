"use client";

import { useState } from "react";
import Image from "next/image";
import {
  ChevronLeft,
  CheckCheck,
  Loader2,
  MessageSquare,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Search,
} from "lucide-react";
import { useVoiceCall, formatCallTime } from "@/lib/widget/use-voice-call";

// All three channels, side by side with the headline.
//
// Website chat is the real product: the same /widget/chat document the launcher
// loads on a customer's site - not a copy - so it cannot drift from what we
// sell. The `embed=inline` flag only tells it there is no panel to collapse
// back into. Framing is allowed by the CSP the middleware sets for /widget/*:
// 'self' is always in frame-ancestors.
//
// WhatsApp cannot be embedded at all, so it is a finished-conversation preview
// - an inbox of chats that were already handled, openable one at a time.
//
// Voice is not a simulation either: it dials the same FiQ support agent a
// customer would reach. That endpoint is IP rate limited server-side, since
// every connection costs real Retell minutes.

const FIQ_VOICE_ENDPOINT = "/api/voice/fiq-support/web-call";

/** Height of the panel body, shared by all three tabs so switching never jumps. */
const PANEL_H = "h-[460px] sm:h-[500px]";

const TABS = [
  { id: "chat", label: "Website", icon: MessageSquare },
  { id: "whatsapp", label: "WhatsApp", icon: WhatsAppGlyph },
  { id: "voice", label: "Phone", icon: Phone },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function HeroChannels() {
  const [tab, setTab] = useState<TabId>("chat");

  return (
    <div className="w-full max-w-[440px] mx-auto lg:mx-0">
      <div
        className="inline-flex w-full rounded-xl border border-gray-200 bg-gray-50 p-1 mb-3"
        role="tablist"
        aria-label="Channel"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
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

      <div className="rounded-2xl border border-gray-200 bg-white shadow-2xl shadow-gray-300/40 overflow-hidden">
        {tab === "chat" && <WebsiteChat />}
        {tab === "whatsapp" && <WhatsAppInbox />}
        {tab === "voice" && <VoiceDemo />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Website chat - the live widget                                      */
/* ------------------------------------------------------------------ */

function WebsiteChat() {
  const key = process.env.NEXT_PUBLIC_FIQ_WIDGET_KEY;

  // No key configured (a fresh environment): show nothing rather than a broken
  // frame. Same rule the launcher follows.
  if (!key) {
    return (
      <div className={`${PANEL_H} flex items-center justify-center px-8 text-center`}>
        <p className="text-sm text-gray-400">Chat is warming up. Try the other two channels.</p>
      </div>
    );
  }

  return (
    <iframe
      src={`/widget/chat?key=${encodeURIComponent(key)}&embed=inline`}
      title="Chat with First in Queue"
      allow="microphone; autoplay"
      className={`w-full ${PANEL_H} border-0 block`}
    />
  );
}

/* ------------------------------------------------------------------ */
/* WhatsApp - an inbox of conversations that were already handled      */
/* ------------------------------------------------------------------ */

interface WaLine {
  from: "customer" | "business";
  text: string;
  time: string;
}

interface WaThread {
  id: string;
  name: string;
  /** Initials shown in the avatar circle. */
  initials: string;
  color: string;
  time: string;
  lines: WaLine[];
}

const WA_THREADS: WaThread[] = [
  {
    id: "mwape",
    name: "Mwape B.",
    initials: "MB",
    color: "bg-emerald-500",
    time: "21:14",
    lines: [
      { from: "customer", text: "Good evening, are you still open?", time: "21:08" },
      {
        from: "business",
        text: "Good evening! We closed at 18:00, but I can still help right now - anything you order tonight goes out first thing tomorrow.",
        time: "21:08",
      },
      { from: "customer", text: "Ok. Do you have the 20kg bag in stock?", time: "21:11" },
      {
        from: "business",
        text: "Yes, 14 left. Want me to hold one under your name until noon tomorrow?",
        time: "21:11",
      },
      { from: "customer", text: "Please do 👍", time: "21:13" },
      {
        from: "business",
        text: "Done - reserved under your number. Pickup details sent to this chat.",
        time: "21:14",
      },
    ],
  },
  {
    id: "chanda",
    name: "Chanda P.",
    initials: "CP",
    color: "bg-blue-500",
    time: "20:02",
    lines: [
      { from: "customer", text: "How much is delivery to Kabulonga?", time: "19:58" },
      {
        from: "business",
        text: "K60 to Kabulonga, free over K500. Same day if you order before 15:00.",
        time: "19:58",
      },
      { from: "customer", text: "And if I order now?", time: "20:01" },
      {
        from: "business",
        text: "It goes out tomorrow morning, at your door by 11:00. Shall I put the order through?",
        time: "20:01",
      },
      { from: "customer", text: "Yes please, same address as last time", time: "20:02" },
      { from: "business", text: "Ordered. You'll get a message when the driver leaves. 🛵", time: "20:02" },
    ],
  },
  {
    id: "grace",
    name: "Grace T.",
    initials: "GT",
    color: "bg-purple-500",
    time: "18:47",
    lines: [
      { from: "customer", text: "Can I book for Saturday morning?", time: "18:44" },
      {
        from: "business",
        text: "We have 09:00, 10:30 and 11:15 free on Saturday. Which suits you?",
        time: "18:44",
      },
      { from: "customer", text: "10:30", time: "18:46" },
      {
        from: "business",
        text: "Booked - Saturday 10:30, under Grace. I'll send a reminder on Friday evening.",
        time: "18:47",
      },
      { from: "customer", text: "Perfect, thank you", time: "18:47" },
    ],
  },
  {
    id: "joseph",
    name: "Joseph M.",
    initials: "JM",
    color: "bg-amber-500",
    time: "17:20",
    lines: [
      { from: "customer", text: "Bwanji, muli na ma solar panel?", time: "17:16" },
      {
        from: "business",
        text: "Eya, tili nayo! 300W ndi K1,850, 450W ndi K2,600. Zonse zili ndi warranty ya zaka ziwiri.",
        time: "17:16",
      },
      { from: "customer", text: "Ok ndifuna 450W iwiri. Mukulandira mobile money?", time: "17:19" },
      {
        from: "business",
        text: "Eya - Airtel, MTN ndi Zamtel. Total K5,200. Ndikutumizireni link ya kulipira.",
        time: "17:20",
      },
    ],
  },
];

function WhatsAppInbox() {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = WA_THREADS.find((t) => t.id === openId) || null;

  return (
    <div className={`${PANEL_H} flex flex-col`}>
      {open ? (
        <>
          <div className="flex items-center gap-3 bg-[#075E54] px-3 py-3">
            <button
              onClick={() => setOpenId(null)}
              className="text-white/80 hover:text-white transition-colors"
              aria-label="Back to chats"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold text-white ${open.color}`}
            >
              {open.initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{open.name}</p>
              <p className="text-[11px] text-emerald-200">answered in seconds</p>
            </div>
          </div>

          <div className="flex-1 space-y-2.5 overflow-y-auto bg-[#ECE5DD] p-4">
            {open.lines.map((line, i) => (
              <div
                key={i}
                className={`flex ${line.from === "business" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-[13px] leading-snug shadow-sm ${
                    line.from === "business"
                      ? "rounded-tr-sm bg-[#DCF8C6] text-gray-900"
                      : "rounded-tl-sm bg-white text-gray-900"
                  }`}
                >
                  {line.text}
                  <span className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-gray-500">
                    {line.time}
                    {line.from === "business" && <CheckCheck className="h-3 w-3 text-sky-500" />}
                  </span>
                </div>
              </div>
            ))}
            <div className="flex justify-center pt-1">
              <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] text-gray-500">
                Handled without staff
              </span>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="bg-[#075E54] px-4 py-3">
            <div className="flex items-center gap-3">
              <Image
                src="/fiq-logo.png?v=2"
                alt=""
                width={200}
                height={200}
                className="h-8 w-8 rounded-full bg-white/10 object-contain p-0.5"
              />
              <p className="flex-1 text-sm font-medium text-white">Your WhatsApp, last night</p>
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5">
              <Search className="h-3.5 w-3.5 text-white/60" />
              <span className="text-xs text-white/60">Search</span>
            </div>
          </div>

          <div className="flex-1 divide-y divide-gray-100 overflow-y-auto bg-white">
            {WA_THREADS.map((t) => {
              const last = t.lines[t.lines.length - 1];
              return (
                <button
                  key={t.id}
                  onClick={() => setOpenId(t.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50"
                >
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${t.color}`}
                  >
                    {t.initials}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-gray-900">{t.name}</span>
                      <span className="shrink-0 text-[10px] text-gray-400">{t.time}</span>
                    </span>
                    <span className="mt-0.5 flex items-center gap-1">
                      {/* Read receipts only belong on messages we sent. */}
                      {last.from === "business" && (
                        <CheckCheck className="h-3.5 w-3.5 shrink-0 text-sky-500" />
                      )}
                      <span className="truncate text-xs text-gray-500">{last.text}</span>
                    </span>
                  </span>
                </button>
              );
            })}
            <p className="px-4 py-3 text-center text-[11px] text-gray-400">
              Every one of these was answered while the shop was closed.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Voice - a real call to the FiQ support agent                        */
/* ------------------------------------------------------------------ */

function VoiceDemo() {
  const voice = useVoiceCall({ endpoint: FIQ_VOICE_ENDPOINT });
  const onCall = voice.state === "connecting" || voice.state === "active";

  return (
    <div className={`${PANEL_H} flex flex-col`}>
      <div className="flex items-center gap-3 bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
          <Phone className="h-4 w-4 text-white" />
        </span>
        <div>
          <p className="text-sm font-medium text-white">Your phone line</p>
          <p className="text-xs text-purple-200">
            {voice.state === "active"
              ? voice.agentTalking
                ? "Speaking…"
                : "Listening…"
              : "Ready when you are"}
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
        {voice.state === "idle" || voice.state === "ended" ? (
          <>
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-purple-100">
              <Phone className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              {voice.state === "ended" ? "Call ended" : "This one is real"}
            </h3>
            <p className="mx-auto mt-2 max-w-sm text-sm text-gray-500">
              Talk to the same line that answers phones for FiQ customers. No phone number, no
              download - it runs in this tab.
            </p>
            <button
              onClick={voice.start}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/25 transition-all hover:from-purple-700 hover:to-indigo-700"
            >
              <Phone className="h-4 w-4" />
              {voice.state === "ended" ? "Call again" : "Start the call"}
            </button>
            <p className="mt-3 text-xs text-gray-400">Your browser will ask for the microphone.</p>
          </>
        ) : voice.state === "error" ? (
          <>
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
              <PhoneOff className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Couldn&apos;t connect</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm text-gray-500">{voice.error}</p>
            <button
              onClick={voice.reset}
              className="mt-6 rounded-xl border-2 border-gray-200 px-6 py-3 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50"
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
                <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
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
                      ? "border-red-300 bg-red-100"
                      : "border-gray-200 bg-gray-100 hover:bg-gray-200"
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
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-red-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-red-700"
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

/** lucide has no WhatsApp mark, and the tab reads wrong without one. */
function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.48-1.75-1.65-2.05-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.01-1.04 2.48s1.06 2.87 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.28.17-1.41-.07-.13-.27-.2-.57-.35z" />
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.87 9.87 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.16 8.16 0 0 1-1.25-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.19 8.19 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.25 8.23z" />
    </svg>
  );
}
