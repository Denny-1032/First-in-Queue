"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { renderMarkdown } from "@/lib/widget/markdown";

// Text web-chat widget (Phase 1, Block 7).
//
// Replies are fetched by polling /api/widget/history with the visitor token
// rather than subscribing via Supabase Realtime: Realtime would require the
// public anon key inside the widget, and the widget runs on untrusted pages.
// See docs/phase1-spec-widget-and-onboarding.md §C2.

interface ChatMessage {
  id: string;
  direction: "inbound" | "outbound";
  sender_type: "customer" | "bot" | "agent";
  type: string;
  content: {
    text?: string;
    interactive?: {
      buttons?: Array<{ id: string; title: string }>;
      sections?: Array<{ rows: Array<{ id: string; title: string; description?: string }> }>;
    };
  };
  created_at: string;
  pending?: boolean;
}

interface Branding {
  primary_color: string;
  text_color: string;
  title: string;
  welcome_message: string;
  suggested_messages: string[];
  show_branding: boolean;
  logo_url: string | null;
  offline_message: string | null;
}

const POLL_MS = 3000;

function ChatContent() {
  const searchParams = useSearchParams();
  const widgetKey = searchParams.get("key") || "";

  const [branding, setBranding] = useState<Branding | null>(null);
  const [online, setOnline] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [booted, setBooted] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const tokenRef = useRef<string | null>(null);
  const seenIds = useRef<Set<string>>(new Set());
  const isOpenRef = useRef(true);
  // Read by the poll timer, which closes over its own render's state.
  const sendingRef = useRef(false);

  const post = useCallback((type: string, payload?: unknown) => {
    window.parent?.postMessage({ source: "fiq-widget", type, payload }, "*");
  }, []);

  // ---------------------------------------------------------------- boot

  useEffect(() => {
    if (!widgetKey) {
      setError("This chat is not configured correctly.");
      setBooted(true);
      return;
    }
    let cancelled = false;

    (async () => {
      try {
        const cfgRes = await fetch(`/api/widget/config?key=${encodeURIComponent(widgetKey)}`);
        if (!cfgRes.ok) throw new Error("config");
        const cfg = await cfgRes.json();
        if (cancelled) return;
        setBranding(cfg.branding);
        setOnline(cfg.online !== false);

        const storeKey = `fiq_visitor_${cfg.property_id}`;
        const stored = localStorage.getItem(storeKey);
        const sessRes = await fetch("/api/widget/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: widgetKey, visitor_id: stored || undefined }),
        });
        if (!sessRes.ok) throw new Error("session");
        const sess = await sessRes.json();
        if (cancelled) return;

        localStorage.setItem(storeKey, sess.visitor_id);
        tokenRef.current = sess.token;
        setToken(sess.token);
      } catch {
        if (!cancelled) setError("We couldn't start the chat. Please refresh and try again.");
      } finally {
        if (!cancelled) {
          setBooted(true);
          post("ready");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [widgetKey, post]);

  // ---------------------------------------------------------------- polling

  /**
   * @param settled true when called right after a successful send. /api/widget/message
   *        only returns once the engine has run and the inbound row is saved, so the
   *        history we just fetched already contains the visitor's message and every
   *        optimistic row can go.
   *
   *        Optimistic rows carry a client-generated `local-<ts>` id, which can never
   *        equal a server UUID — so matching them against the server's ids kept them
   *        forever and every sent message left a faded duplicate behind.
   */
  const fetchHistory = useCallback(async (settled = false) => {
    const t = tokenRef.current;
    if (!t) return;
    try {
      const res = await fetch("/api/widget/history", {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      const incoming: ChatMessage[] = data.messages || [];

      setMessages((prev) => {
        // While a send is still in flight the optimistic row is all the visitor
        // has, so keep it; once the send has settled the server list is complete.
        const keptPending = settled ? [] : prev.filter((m) => m.pending);
        const merged = [...incoming, ...keptPending];

        const fresh = incoming.filter(
          (m) => m.direction === "outbound" && !seenIds.current.has(m.id)
        );
        incoming.forEach((m) => seenIds.current.add(m.id));
        if (fresh.length && !isOpenRef.current) {
          post("unread", { count: fresh.length });
        }
        if (fresh.length) setTyping(false);
        return merged;
      });
    } catch {
      /* transient network error — next tick retries */
    }
  }, [post]);

  useEffect(() => {
    if (!token) return;
    fetchHistory();
    // Skip polls while a send is in flight. The server saves the visitor's
    // message immediately but /api/widget/message does not respond until the
    // engine has produced a reply, so a poll landing in that window would fetch
    // the real row while the optimistic one is still on screen — the message
    // appearing twice for the whole generation delay. Nothing is missed: the
    // settled send fetches history itself.
    const id = setInterval(() => {
      if (!sendingRef.current) fetchHistory();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [token, fetchHistory]);

  // ---------------------------------------------------------------- host bridge

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      const msg = e.data;
      if (!msg || msg.source !== "fiq-host") return;
      if (msg.type === "open") {
        isOpenRef.current = true;
        post("unread", { count: 0 });
        setTimeout(() => inputRef.current?.focus(), 60);
      } else if (msg.type === "close") {
        isOpenRef.current = false;
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [post]);

  // Keep the newest message in view.
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  // ---------------------------------------------------------------- sending

  const send = useCallback(
    async (text: string, replyId?: string) => {
      const t = tokenRef.current;
      const body = text.trim();
      if (!t || (!body && !replyId) || sending) return;

      setSending(true);
      sendingRef.current = true;
      setShowSuggestions(false);
      setInput("");
      setError(null);

      const optimistic: ChatMessage = {
        id: `local-${Date.now()}`,
        direction: "inbound",
        sender_type: "customer",
        type: "text",
        content: { text: body },
        created_at: new Date().toISOString(),
        pending: true,
      };
      setMessages((prev) => [...prev, optimistic]);
      setTyping(true);

      try {
        const res = await fetch("/api/widget/message", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
          body: JSON.stringify({ text: body, reply_id: replyId }),
        });
        if (res.status === 429) {
          setError("You're sending messages too quickly. Please wait a moment.");
          setTyping(false);
        } else if (!res.ok) {
          setError("That message didn't send. Please try again.");
          setTyping(false);
        } else {
          const data = await res.json();
          if (data.status === "limit_reached") setTyping(false);
          if (typeof data.online === "boolean") setOnline(data.online);
        }
        // Only a delivered message is on the server, so only then is it safe to
        // drop the optimistic row. On failure it stays put, so the visitor can
        // still see what they typed. Awaited so the `finally` below cannot
        // resume polling mid-flight.
        await fetchHistory(res.ok);
      } catch {
        setError("That message didn't send. Please try again.");
        setTyping(false);
      } finally {
        setSending(false);
        // Cleared last: polling must stay paused until history has been
        // refetched above, or the poll can race the optimistic row back in.
        sendingRef.current = false;
      }
    },
    [sending, fetchHistory]
  );

  // ---------------------------------------------------------------- render

  const b: Branding = branding ?? {
    primary_color: "#03A84E",
    text_color: "#ffffff",
    title: "Chat with us",
    welcome_message: "👋 Hi! How can we help?",
    suggested_messages: [],
    show_branding: true,
    logo_url: null,
    offline_message: null,
  };

  const chips = lastChips(messages);

  return (
    <div className="fiq-chat" style={{ ["--fiq-primary" as string]: b.primary_color }}>
      <header className="fiq-header">
        {b.logo_url && <img src={b.logo_url} alt="" className="fiq-logo" />}
        <div className="fiq-head-text">
          <h1>{b.title}</h1>
          <p>
            <span className={`fiq-dot ${online ? "on" : "off"}`} aria-hidden="true" />
            {online ? "We're online" : "Away — leave a message"}
          </p>
        </div>
        <button
          type="button"
          className="fiq-close"
          aria-label="Close chat"
          onClick={() => post("close")}
        >
          ×
        </button>
      </header>

      <div
        className="fiq-list"
        ref={listRef}
        role="log"
        aria-live="polite"
        aria-label="Conversation"
      >
        {!booted && <p className="fiq-status">Starting chat…</p>}

        {booted && (
          <Bubble
            msg={{
              id: "welcome",
              direction: "outbound",
              sender_type: "bot",
              type: "text",
              content: { text: !online && b.offline_message ? b.offline_message : b.welcome_message },
              created_at: new Date().toISOString(),
            }}
          />
        )}

        {messages.map((m, i) => (
          <div key={m.id}>
            {showDaySeparator(messages, i) && (
              <p className="fiq-day">{formatDay(m.created_at)}</p>
            )}
            <Bubble msg={m} />
          </div>
        ))}

        {typing && (
          <div className="fiq-bubble bot fiq-typing" aria-label="Assistant is typing">
            <span /><span /><span />
          </div>
        )}
      </div>

      {showSuggestions && booted && !error && b.suggested_messages?.length > 0 && (
        <div className="fiq-chips" aria-label="Suggested messages">
          {b.suggested_messages.map((s) => (
            <button key={s} type="button" onClick={() => send(s)}>
              {s}
            </button>
          ))}
        </div>
      )}

      {chips.length > 0 && (
        <div className="fiq-chips" aria-label="Quick replies">
          {chips.map((c) => (
            <button key={c.id} type="button" onClick={() => send(c.title, c.id)}>
              {c.title}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="fiq-error" role="alert">
          {error}
        </p>
      )}

      <form
        className="fiq-composer"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <label htmlFor="fiq-input" className="fiq-sr">
          Type your message
        </label>
        <textarea
          id="fiq-input"
          ref={inputRef}
          value={input}
          rows={1}
          maxLength={4000}
          placeholder="Type your message…"
          disabled={!token || sending}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
        />
        <button type="submit" disabled={!token || sending || !input.trim()} aria-label="Send message">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
        </button>
      </form>

      {b.show_branding && (
        <p className="fiq-brand">
          Powered by <strong>First in Queue</strong>
        </p>
      )}

      <style jsx global>{`
        :root { color-scheme: light; }
        html, body { margin: 0; height: 100%; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        .fiq-sr {
          position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
          overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
        }
        .fiq-chat {
          display: flex; flex-direction: column; height: 100vh; height: 100dvh;
          background: #fff; color: #111; font-size: 15px;
        }
        .fiq-header {
          display: flex; align-items: center; gap: 10px; padding: 12px 14px;
          background: var(--fiq-primary); color: #fff; flex: 0 0 auto;
        }
        .fiq-logo { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; }
        .fiq-head-text { flex: 1; min-width: 0; }
        .fiq-header h1 { margin: 0; font-size: 15px; font-weight: 600; }
        .fiq-header p { margin: 2px 0 0; font-size: 12px; opacity: .9; display: flex; align-items: center; gap: 6px; }
        .fiq-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
        .fiq-dot.on { background: #4ade80; }
        .fiq-dot.off { background: #d1d5db; }
        .fiq-close {
          background: transparent; border: none; color: #fff; font-size: 26px;
          line-height: 1; cursor: pointer; padding: 0 4px;
        }
        .fiq-close:focus-visible, .fiq-composer button:focus-visible,
        .fiq-chips button:focus-visible, textarea:focus-visible {
          outline: 3px solid #111; outline-offset: 2px;
        }
        .fiq-list { flex: 1 1 auto; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 8px; }
        .fiq-status, .fiq-day { text-align: center; color: #6b7280; font-size: 12px; margin: 6px 0; }
        .fiq-bubble {
          max-width: 82%; padding: 9px 12px; border-radius: 14px; line-height: 1.45;
          word-wrap: break-word; overflow-wrap: anywhere;
        }
        .fiq-bubble.bot { align-self: flex-start; background: #f1f0ec; border-bottom-left-radius: 4px; }
        .fiq-bubble.me {
          align-self: flex-end; background: var(--fiq-primary); color: #fff;
          border-bottom-right-radius: 4px;
        }
        .fiq-bubble.pending { opacity: .6; }
        .fiq-bubble a { color: inherit; text-decoration: underline; }
        .fiq-bubble p { margin: 0 0 6px; }
        .fiq-bubble p:last-child { margin-bottom: 0; }
        .fiq-time { display: block; font-size: 11px; opacity: .65; margin-top: 4px; }
        .fiq-typing { display: flex; gap: 4px; padding: 12px; }
        .fiq-typing span {
          width: 7px; height: 7px; border-radius: 50%; background: #9ca3af;
          animation: fiq-blink 1.2s infinite both;
        }
        .fiq-typing span:nth-child(2) { animation-delay: .2s; }
        .fiq-typing span:nth-child(3) { animation-delay: .4s; }
        @keyframes fiq-blink { 0%, 80%, 100% { opacity: .3 } 40% { opacity: 1 } }
        .fiq-chips { display: flex; flex-wrap: wrap; gap: 6px; padding: 0 14px 10px; }
        .fiq-chips button {
          border: 1px solid var(--fiq-primary); color: var(--fiq-primary); background: #fff;
          border-radius: 16px; padding: 6px 12px; font-size: 13px; cursor: pointer;
        }
        .fiq-chips button:hover { background: #f6fbf8; }
        .fiq-error { margin: 0 14px 8px; color: #a32d2d; font-size: 13px; }
        .fiq-composer {
          display: flex; align-items: flex-end; gap: 8px; padding: 10px 12px;
          border-top: 1px solid #e5e7eb; flex: 0 0 auto;
        }
        .fiq-composer textarea {
          flex: 1; resize: none; border: 1px solid #d1d5db; border-radius: 10px;
          padding: 9px 12px; font: inherit; max-height: 120px; min-height: 40px;
        }
        .fiq-composer button {
          background: var(--fiq-primary); color: #fff; border: none; border-radius: 10px;
          width: 40px; height: 40px; cursor: pointer; display: flex;
          align-items: center; justify-content: center; flex: 0 0 auto;
        }
        .fiq-composer button:disabled { opacity: .45; cursor: not-allowed; }
        .fiq-brand { margin: 0; padding: 0 0 8px; text-align: center; font-size: 11px; color: #9ca3af; }
        @media (prefers-reduced-motion: reduce) {
          .fiq-typing span { animation: none; }
          .fiq-list { scroll-behavior: auto; }
        }
      `}</style>
    </div>
  );
}

function Bubble({ msg }: { msg: ChatMessage }) {
  const mine = msg.direction === "inbound";
  const text = msg.content?.text || "";
  return (
    <div className={`fiq-bubble ${mine ? "me" : "bot"}${msg.pending ? " pending" : ""}`}>
      {mine ? (
        <span>{text}</span>
      ) : (
        <span dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }} />
      )}
      <time className="fiq-time" dateTime={msg.created_at}>
        {formatTime(msg.created_at)}
      </time>
    </div>
  );
}

/** Quick-reply chips from the most recent assistant message only. */
function lastChips(messages: ChatMessage[]): Array<{ id: string; title: string }> {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.direction === "inbound") return [];
    const inter = m.content?.interactive;
    if (!inter) continue;
    if (inter.buttons?.length) return inter.buttons;
    if (inter.sections?.length) {
      return inter.sections.flatMap((s) => s.rows.map((r) => ({ id: r.id, title: r.title })));
    }
    return [];
  }
  return [];
}

function showDaySeparator(messages: ChatMessage[], i: number): boolean {
  if (i === 0) return true;
  const a = new Date(messages[i - 1].created_at).toDateString();
  const b = new Date(messages[i].created_at).toDateString();
  return a !== b;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function formatDay(iso: string): string {
  try {
    const d = new Date(iso);
    const today = new Date().toDateString();
    if (d.toDateString() === today) return "Today";
    return d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

export default function WidgetChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatContent />
    </Suspense>
  );
}
