"use client";

import { useState } from "react";
import {
  ChevronLeft,
  CheckCheck,
  Loader2,
  MessageSquare,
  Mic,
  MicOff,
  MoreVertical,
  Paperclip,
  Phone,
  PhoneOff,
  Pin,
  Search,
  Smile,
  SquarePen,
} from "lucide-react";
import { useVoiceCall, formatCallTime } from "@/lib/widget/use-voice-call";

// All three channels, side by side with the headline.
//
// Website chat is the real product: the same /widget/chat document the launcher
// loads on a customer's site - not a copy - so it cannot drift from what we
// sell. The `embed=inline` flag only tells it there is no panel to collapse
// back into. Framing is allowed by the CSP the proxy sets for /widget/*:
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
  /** Green count pill on the right of the row, as WhatsApp shows it. */
  unread?: number;
  pinned?: boolean;
  lines: WaLine[];
}

// WhatsApp's own palette, so the panel reads as WhatsApp at a glance rather
// than as "a green chat app".
const WA = {
  green: "#25d366",
  deepGreen: "#046a49",
  chipActive: "#d9fdd3",
  outgoing: "#d9fdd3",
  tick: "#53bdeb",
  wallpaper: "#efeae2",
  searchBg: "#f0f2f5",
};

/**
 * The doodle wallpaper, inlined.
 *
 * A data URI rather than an asset: it is decorative, it must not cost a request
 * on the landing page's critical path, and there is no licensed WhatsApp
 * background to ship anyway - this is a suggestion of one.
 */
const WA_DOODLE =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
      <g fill="none" stroke="#7d7259" stroke-width="1.4" stroke-linecap="round" opacity="0.28">
        <path d="M14 20h12v9h-8l-4 4z"/>
        <circle cx="86" cy="18" r="6"/>
        <path d="M80 44l6 6 10-12"/>
        <path d="M20 70c4-6 12-6 16 0"/>
        <path d="M52 92h14v9h-9l-5 4z"/>
        <path d="M100 78v10M95 83h10"/>
        <path d="M34 108c3-4 9-4 12 0"/>
        <circle cx="66" cy="56" r="4"/>
      </g>
    </svg>`
  );

const WA_THREADS: WaThread[] = [
  {
    id: "mwape",
    name: "Mwape B.",
    initials: "MB",
    color: "bg-emerald-500",
    time: "21:14",
    pinned: true,
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
    unread: 2,
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
    color: "bg-teal-600",
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
    unread: 1,
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

/**
 * A stand-in for WhatsApp itself.
 *
 * Everything except opening a thread is deliberately inert - the search box,
 * the filter chips, the composer are `aria-hidden` decoration, not controls, so
 * nothing here can be tabbed into and then do nothing.
 */
function WhatsAppInbox() {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = WA_THREADS.find((t) => t.id === openId) || null;

  return (
    <div className={`${PANEL_H} flex flex-col bg-white`}>
      {open ? (
        <>
          <div className="flex items-center gap-3 border-b border-gray-100 px-3 py-2.5">
            <button
              onClick={() => setOpenId(null)}
              className="text-gray-500 transition-colors hover:text-gray-900"
              aria-label="Back to chats"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold text-white ${open.color}`}
            >
              {open.initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">{open.name}</p>
              <p className="text-[11px] text-gray-500">online</p>
            </div>
            <div className="flex items-center gap-3 text-gray-400" aria-hidden="true">
              <Search className="h-4 w-4" />
              <MoreVertical className="h-4 w-4" />
            </div>
          </div>

          <div
            className="flex-1 space-y-2 overflow-y-auto px-3 py-3"
            style={{ backgroundColor: WA.wallpaper, backgroundImage: `url("${WA_DOODLE}")` }}
          >
            <div className="flex justify-center pb-1">
              <span className="rounded-md bg-white/90 px-2.5 py-1 text-[11px] text-gray-500 shadow-sm">
                Today
              </span>
            </div>

            {open.lines.map((line, i) => (
              <div
                key={i}
                className={`flex ${line.from === "business" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-2.5 py-1.5 text-[13px] leading-snug shadow-sm ${
                    line.from === "business" ? "rounded-tr-none text-gray-900" : "rounded-tl-none bg-white text-gray-900"
                  }`}
                  style={line.from === "business" ? { backgroundColor: WA.outgoing } : undefined}
                >
                  {line.text}
                  <span className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-gray-500">
                    {line.time}
                    {line.from === "business" && (
                      <CheckCheck className="h-3 w-3" style={{ color: WA.tick }} />
                    )}
                  </span>
                </div>
              </div>
            ))}

            <div className="flex justify-center pt-1">
              <span className="rounded-full bg-white/85 px-3 py-1 text-[11px] text-gray-500 shadow-sm">
                Handled without staff
              </span>
            </div>
          </div>

          {/* Composer: appearance only, so the panel does not end in mid-air. */}
          <div
            className="flex items-center gap-2 border-t border-gray-100 px-3 py-2"
            style={{ backgroundColor: WA.searchBg }}
            aria-hidden="true"
          >
            <Smile className="h-5 w-5 shrink-0 text-gray-500" />
            <Paperclip className="h-5 w-5 shrink-0 text-gray-500" />
            <span className="flex-1 rounded-full bg-white px-3 py-2 text-[13px] text-gray-400">
              Type a message
            </span>
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: WA.green }}
            >
              <Mic className="h-4 w-4 text-white" />
            </span>
          </div>
        </>
      ) : (
        <>
          <div className="px-4 pt-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[19px] font-bold tracking-tight text-gray-900">WhatsApp</h3>
              <div className="flex items-center gap-3 text-gray-500" aria-hidden="true">
                <SquarePen className="h-[18px] w-[18px]" />
                <MoreVertical className="h-[18px] w-[18px]" />
              </div>
            </div>

            <div
              className="mt-2.5 flex items-center gap-2 rounded-full px-3 py-2"
              style={{ backgroundColor: WA.searchBg }}
              aria-hidden="true"
            >
              <Search className="h-4 w-4 text-gray-500" />
              <span className="text-[13px] text-gray-500">Search or start a new chat</span>
            </div>

            <div className="mt-2.5 flex gap-2 pb-2 text-[12px]" aria-hidden="true">
              {["All", "Unread", "Favourites", "Groups"].map((chip, i) => (
                <span
                  key={chip}
                  className="rounded-full px-3 py-1"
                  style={
                    i === 0
                      ? { backgroundColor: WA.chipActive, color: WA.deepGreen }
                      : { backgroundColor: WA.searchBg, color: "#54656f" }
                  }
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {WA_THREADS.map((t) => {
              const last = t.lines[t.lines.length - 1];
              return (
                <button
                  key={t.id}
                  onClick={() => setOpenId(t.id)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-gray-50"
                >
                  <span
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${t.color}`}
                  >
                    {t.initials}
                  </span>
                  <span className="min-w-0 flex-1 border-b border-gray-100 pb-2.5">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-[15px] text-gray-900">{t.name}</span>
                      <span
                        className="shrink-0 text-[11px]"
                        style={{ color: t.unread ? WA.deepGreen : "#667781" }}
                      >
                        {t.time}
                      </span>
                    </span>
                    <span className="mt-0.5 flex items-center gap-1">
                      {/* Read receipts only belong on messages we sent. */}
                      {last.from === "business" && (
                        <CheckCheck className="h-4 w-4 shrink-0" style={{ color: WA.tick }} />
                      )}
                      <span className="truncate text-[13px] text-gray-500">{last.text}</span>
                      {t.pinned && <Pin className="ml-auto h-3.5 w-3.5 shrink-0 rotate-45 text-gray-400" />}
                      {t.unread && (
                        <span
                          className="ml-auto flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full px-1 text-[11px] font-medium text-white"
                          style={{ backgroundColor: WA.green }}
                        >
                          {t.unread}
                        </span>
                      )}
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
      <div className="flex items-center gap-3 bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
          <Phone className="h-4 w-4 text-white" />
        </span>
        <div>
          <p className="text-sm font-medium text-white">Your phone line</p>
          <p className="text-xs text-emerald-100">
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
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
              <Phone className="h-8 w-8 text-emerald-600" />
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
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/25 transition-all hover:from-emerald-700 hover:to-emerald-800"
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
                voice.agentTalking ? "bg-emerald-200" : "bg-emerald-100"
              }`}
            >
              {voice.state === "connecting" ? (
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              ) : (
                <Phone
                  className={`h-8 w-8 text-emerald-600 ${
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
