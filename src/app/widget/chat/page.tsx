"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { renderMarkdown } from "@/lib/widget/markdown";
import { useVoiceCall } from "@/lib/widget/use-voice-call";
import { CallOverlay } from "@/components/widget/call-overlay";
import { EMOJI_GROUPS } from "@/lib/widget/emoji";
import { downscaleImage } from "@/lib/widget/image-resize";
import {
  DOCUMENT_ACCEPT,
  IMAGE_ACCEPT,
  MAX_PICK_BYTES,
  MAX_UPLOAD_BYTES,
  checkUpload,
  formatBytes,
  type MediaKind,
} from "@/lib/widget/media";

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
    /** Signed, short-lived URL minted by /api/widget/history. */
    media_url?: string;
    media_path?: string;
    media_size?: number;
    mime_type?: string;
    filename?: string;
    caption?: string;
    interactive?: {
      buttons?: Array<{ id: string; title: string }>;
      sections?: Array<{ rows: Array<{ id: string; title: string; description?: string }> }>;
    };
  };
  created_at: string;
  pending?: boolean;
}

/** A file the visitor has picked but not sent yet. */
interface Attachment {
  file: File;
  kind: MediaKind;
  /** Object URL for the local preview; revoked when the attachment is cleared. */
  previewUrl: string | null;
}

/** What /api/widget/upload hands back once the object is stored. */
interface UploadedMedia {
  path: string;
  kind: MediaKind;
  filename: string;
  mime_type: string;
  size: number;
  url: string | null;
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
/** Panel collapsed or tab in the background: only the unread badge depends on it. */
const IDLE_POLL_MS = 15000;
/** Ceiling for the 429 backoff. */
const MAX_BACKOFF_MS = 30000;
/** An optimistic row older than this has lost its send; never keep it on screen. */
const STALE_PENDING_MS = 20000;
/** Longest the typing dots may run without a reply landing. */
const TYPING_WATCHDOG_MS = 60000;

/**
 * Seed text for the WhatsApp handoff. Deliberately generic: the widget's
 * transcript is not carried over - it lives against a visitor token that the
 * WhatsApp conversation has no way to claim, and pasting it into the message
 * box would hand the customer's own words back to them as if they had typed
 * them again.
 */
const WHATSAPP_PREFILL = "Hi! I was just on your website and have a question.";

function ChatContent() {
  const searchParams = useSearchParams();
  const widgetKey = searchParams.get("key") || "";
  // On desktop the loader draws its own detached branding pill outside the
  // panel, so suppress the in-panel one and avoid showing it twice.
  const brandInHost = searchParams.get("brandhost") === "1";
  // Loaded directly in an Android WebView / WKWebView: there is no parent frame
  // to post "close" to, so the host app supplies its own dismiss chrome.
  const nativeEmbed = searchParams.get("embed") === "native";
  // Embedded inline in a page (our own landing hero), not in the launcher's
  // panel: there is nothing to collapse back into, so no close button either.
  const inlineEmbed = searchParams.get("embed") === "inline";
  const dismissable = !nativeEmbed && !inlineEmbed;

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
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState<string | null>(null);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [dragging, setDragging] = useState(false);
  /** Whether new messages should pull the view down. False while reading back. */
  const [stickToBottom, setStickToBottom] = useState(true);

  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const tokenRef = useRef<string | null>(null);
  const seenIds = useRef<Set<string>>(new Set());
  /**
   * Is the visitor actually looking at this panel?
   *
   * An inline or native embed is on screen from the moment it loads. The
   * launcher's panel is NOT: widget.js builds its iframe eagerly and only posts
   * "open" when the bubble is clicked, so defaulting to true meant a collapsed
   * launcher polled at full speed - and, on a page that also embeds the widget
   * inline, doubled the poll rate against a shared rate-limit bucket.
   */
  const isOpenRef = useRef(!dismissable);
  // Read by the poll timer, which closes over its own render's state.
  const sendingRef = useRef(false);
  /** Set by the poll effect; lets the host bridge force an immediate refresh. */
  const pokeRef = useRef<(() => void) | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  /**
   * message id → the attachment URL first seen for it.
   *
   * Every poll signs the private object again, producing a different URL for
   * the same file. Rendering that straight through would make the browser
   * re-download each image every three seconds and flash it on screen, so the
   * first URL for a message is the one that sticks for the session.
   */
  const mediaUrls = useRef<Map<string, string>>(new Map());

  const post = useCallback((type: string, payload?: unknown) => {
    window.parent?.postMessage({ source: "fiq-widget", type, payload }, "*");
  }, []);

  const getToken = useCallback(() => tokenRef.current, []);
  const voice = useVoiceCall({ getToken, onEvent: post });
  const onCall = voice.state === "connecting" || voice.state === "active";

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
        setVoiceEnabled(cfg.voice?.enabled === true);
        setWhatsappNumber(cfg.whatsapp?.enabled ? cfg.whatsapp.number : null);

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
   * Typing dots, with a deadline. Nothing else clears them but the arrival of a
   * reply, so a poll that fails - or an engine that never answers - used to
   * leave them running for the rest of the session.
   */
  const showTyping = useCallback((on: boolean) => {
    clearTimeout(typingTimer.current);
    setTyping(on);
    if (on) typingTimer.current = setTimeout(() => setTyping(false), TYPING_WATCHDOG_MS);
  }, []);

  useEffect(() => () => clearTimeout(typingTimer.current), []);

  /**
   * @param settled true when called right after a successful send. /api/widget/message
   *        only returns once the engine has run and the inbound row is saved, so the
   *        history we just fetched already contains the visitor's message and every
   *        optimistic row can go.
   *
   *        Optimistic rows carry a client-generated `local-<ts>` id, which can never
   *        equal a server UUID - so matching them against the server's ids kept them
   *        forever and every sent message left a faded duplicate behind.
   */
  const fetchHistory = useCallback(async (settled = false): Promise<number> => {
    const t = tokenRef.current;
    if (!t) return 0;
    try {
      const res = await fetch("/api/widget/history", {
        headers: { Authorization: `Bearer ${t}` },
      });
      // Status is returned, not swallowed: the poll loop backs off on 429, and
      // a silent failure here is what used to leave the typing dots spinning.
      if (!res.ok) return res.status;
      const data = await res.json();
      // Pin each message to the first signed URL we saw for it; see mediaUrls.
      const incoming: ChatMessage[] = ((data.messages || []) as ChatMessage[]).map((m) => {
        const url = m.content?.media_url;
        if (!url) return m;
        const cached = mediaUrls.current.get(m.id);
        if (cached) return { ...m, content: { ...m.content, media_url: cached } };
        mediaUrls.current.set(m.id, url);
        return m;
      });

      setMessages((prev) => {
        // While a send is still in flight the optimistic row is all the visitor
        // has, so keep it; once the send has settled the server list is
        // complete. The age check is the safety net: a poll that fails while a
        // send is in flight used to strand the optimistic row forever, and the
        // next successful poll then rendered it BESIDE the server's own copy.
        const keptPending = settled
          ? []
          : prev.filter((m) => m.pending && Date.now() - Date.parse(m.created_at) < STALE_PENDING_MS);
        const merged = [...incoming, ...keptPending];

        const fresh = incoming.filter(
          (m) => m.direction === "outbound" && !seenIds.current.has(m.id)
        );
        incoming.forEach((m) => seenIds.current.add(m.id));
        if (fresh.length && !isOpenRef.current) {
          post("unread", { count: fresh.length });
        }
        if (fresh.length) showTyping(false);
        return merged;
      });
      return 200;
    } catch {
      /* transient network error - next tick retries */
      return 0;
    }
  }, [post, showTyping]);

  /**
   * Self-rescheduling poll.
   *
   * A fixed 3s interval spends 100 requests per the history route's 300s
   * window, which only allows 60 - and a page can carry two widget documents
   * (our own homepage embeds the panel inline AND runs the launcher), which
   * share one visitor token and therefore one bucket. Every poll then 429s,
   * replies stop arriving, and the visitor sees a chat that has silently died.
   *
   * So: full speed only when the panel is open and the tab is in front, a slow
   * badge-freshness cadence otherwise, and exponential backoff if the server
   * does push back.
   */
  useEffect(() => {
    if (!token) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let backoff = 0;
    let stopped = false;

    const baseDelay = () =>
      isOpenRef.current && document.visibilityState === "visible" ? POLL_MS : IDLE_POLL_MS;

    const tick = async () => {
      // Skip polls while a send is in flight. The server saves the visitor's
      // message immediately but /api/widget/message does not respond until the
      // engine has produced a reply, so a poll landing in that window would
      // fetch the real row while the optimistic one is still on screen.
      // Nothing is missed: the settled send fetches history itself.
      if (!sendingRef.current) {
        const status = await fetchHistory();
        backoff = status === 429 ? Math.min(backoff ? backoff * 2 : POLL_MS * 2, MAX_BACKOFF_MS) : 0;
      }
      if (!stopped) timer = setTimeout(tick, Math.max(baseDelay(), backoff));
    };

    fetchHistory();
    timer = setTimeout(tick, baseDelay());

    // Coming back to the tab - or opening the panel - should feel instant, not
    // "up to 15 seconds".
    const poke = () => {
      if (stopped) return;
      clearTimeout(timer);
      backoff = 0;
      timer = setTimeout(tick, 0);
    };
    pokeRef.current = poke;

    const onVisible = () => {
      if (document.visibilityState === "visible") poke();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      stopped = true;
      clearTimeout(timer);
      pokeRef.current = null;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [token, fetchHistory]);

  // ---------------------------------------------------------------- host bridge

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      const msg = e.data;
      if (!msg || msg.source !== "fiq-host") return;
      if (msg.type === "open") {
        isOpenRef.current = true;
        post("unread", { count: 0 });
        // The panel was polling at the idle cadence while collapsed; catch up now.
        pokeRef.current?.();
        setTimeout(() => inputRef.current?.focus(), 60);
      } else if (msg.type === "close") {
        isOpenRef.current = false;
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [post]);

  // Keep the newest message in view - but only while the reader is already at
  // the bottom. Scrolling unconditionally on every message and every typing tick
  // yanked people back down mid-sentence whenever they scrolled up to re-read
  // something, which during a streamed reply is continuous.
  useEffect(() => {
    if (!stickToBottom) return;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing, stickToBottom]);

  /**
   * Re-arm auto-scroll when the reader returns to the bottom, disarm the moment
   * they leave it. The threshold is generous because smooth scrolling lands a
   * pixel or two short and would otherwise disarm itself.
   */
  const onListScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setStickToBottom(distanceFromBottom < 48);
  }, []);

  // ---------------------------------------------------------------- attachments

  /**
   * @param revoke false when the preview URL is still on screen (an optimistic
   *        bubble is showing it) and the caller will release it later.
   */
  const clearAttachment = useCallback((revoke = true) => {
    setAttachment((prev) => {
      if (prev?.previewUrl && revoke) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
    // Reset the inputs, or picking the same file twice in a row fires no
    // change event and nothing appears to happen.
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (docInputRef.current) docInputRef.current.value = "";
  }, []);

  /** Validate, shrink if it's a photo, and stage the file for the next send. */
  const pickFile = useCallback(
    async (file: File | null | undefined) => {
      if (!file) return;
      setError(null);

      if (file.size > MAX_PICK_BYTES) {
        setError(`That file is too large (max ${formatBytes(MAX_PICK_BYTES)}).`);
        return;
      }

      // Check the declared type first, so an unsupported file is rejected
      // before we spend time decoding it. Size is re-checked after downscaling.
      const typeCheck = checkUpload(
        { name: file.name, type: file.type, size: file.size },
        MAX_PICK_BYTES
      );
      if (!typeCheck.ok || !typeCheck.kind) {
        setError(typeCheck.error || "That file type isn't supported.");
        return;
      }

      const prepared = typeCheck.kind === "image" ? await downscaleImage(file) : file;
      if (prepared.size > MAX_UPLOAD_BYTES) {
        setError(`That file is too large (max ${formatBytes(MAX_UPLOAD_BYTES)}).`);
        return;
      }

      clearAttachment();
      setAttachment({
        file: prepared,
        kind: typeCheck.kind,
        previewUrl: typeCheck.kind === "image" ? URL.createObjectURL(prepared) : null,
      });
      setShowEmoji(false);
      inputRef.current?.focus();
    },
    [clearAttachment]
  );

  /** Insert an emoji at the caret rather than at the end of the message. */
  const insertEmoji = useCallback((emoji: string) => {
    const el = inputRef.current;
    setInput((prev) => {
      if (!el) return prev + emoji;
      const start = el.selectionStart ?? prev.length;
      const end = el.selectionEnd ?? prev.length;
      const next = prev.slice(0, start) + emoji + prev.slice(end);
      // Restore the caret after React has written the new value.
      requestAnimationFrame(() => {
        el.focus();
        const at = start + emoji.length;
        el.setSelectionRange(at, at);
      });
      return next;
    });
  }, []);

  // Close the emoji panel on outside click or Escape.
  useEffect(() => {
    if (!showEmoji) return;
    function onDown(e: MouseEvent) {
      if (!emojiRef.current?.contains(e.target as Node)) setShowEmoji(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setShowEmoji(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [showEmoji]);

  // ---------------------------------------------------------------- sending

  const send = useCallback(
    async (text: string, replyId?: string) => {
      const t = tokenRef.current;
      const body = text.trim();
      const pendingFile = attachment;
      if (!t || (!body && !replyId && !pendingFile) || sending) return;

      setSending(true);
      sendingRef.current = true;
      setShowSuggestions(false);
      setShowEmoji(false);
      setInput("");
      setError(null);

      const optimistic: ChatMessage = {
        id: `local-${Date.now()}`,
        direction: "inbound",
        sender_type: "customer",
        type: pendingFile ? pendingFile.kind : "text",
        content: pendingFile
          ? {
              // The local object URL stands in until the send settles and the
              // real, signed one arrives with the refetched history.
              media_url: pendingFile.previewUrl || undefined,
              filename: pendingFile.file.name,
              mime_type: pendingFile.file.type,
              media_size: pendingFile.file.size,
              ...(body && { caption: body }),
            }
          : { text: body },
        created_at: new Date().toISOString(),
        pending: true,
      };
      setMessages((prev) => [...prev, optimistic]);
      showTyping(true);

      try {
        // Store the file first. Only its returned path goes into the message,
        // so a failed upload never produces a message pointing at nothing.
        let uploaded: UploadedMedia | null = null;
        if (pendingFile) {
          setUploading(true);
          const form = new FormData();
          form.append("file", pendingFile.file, pendingFile.file.name);
          const upRes = await fetch("/api/widget/upload", {
            method: "POST",
            headers: { Authorization: `Bearer ${t}` },
            body: form,
          });
          setUploading(false);

          if (!upRes.ok) {
            const detail = await upRes.json().catch(() => ({}));
            setError(detail.error || "That file didn't upload. Please try again.");
            showTyping(false);
            // Leave the picked file in place so they can retry without
            // choosing it again, and drop the optimistic bubble.
            setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
            setInput(body);
            return;
          }
          uploaded = (await upRes.json()) as UploadedMedia;
          // The optimistic bubble is still showing this preview, so the object
          // URL is released further down instead of here.
          clearAttachment(false);
        }

        const res = await fetch("/api/widget/message", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
          body: JSON.stringify({
            text: body,
            reply_id: replyId,
            ...(uploaded && {
              media: {
                path: uploaded.path,
                filename: uploaded.filename,
                mime_type: uploaded.mime_type,
                size: uploaded.size,
              },
            }),
          }),
        });
        if (res.status === 429) {
          setError("You're sending messages too quickly. Please wait a moment.");
          showTyping(false);
        } else if (!res.ok) {
          setError("That message didn't send. Please try again.");
          showTyping(false);
        } else {
          const data = await res.json();
          if (data.status === "limit_reached") showTyping(false);
          if (typeof data.online === "boolean") setOnline(data.online);
        }
        // Only a delivered message is on the server, so only then is it safe to
        // drop the optimistic row. On failure it stays put, so the visitor can
        // still see what they typed.
        //
        // Dropped HERE rather than being left to the refetch below: the history
        // request can fail (a rate-limited poll window, a network blip) and a
        // stranded optimistic row is exactly what produced the faded duplicate
        // sitting under the assistant's reply.
        if (res.ok) setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));

        // Awaited so the `finally` below cannot resume polling mid-flight.
        await fetchHistory(res.ok);

        // History now carries the server's own copy of the attachment, so the
        // local preview can go.
        if (res.ok && pendingFile?.previewUrl) URL.revokeObjectURL(pendingFile.previewUrl);
      } catch {
        setError("That message didn't send. Please try again.");
        showTyping(false);
      } finally {
        setSending(false);
        setUploading(false);
        // Cleared last: polling must stay paused until history has been
        // refetched above, or the poll can race the optimistic row back in.
        sendingRef.current = false;
      }
    },
    [sending, fetchHistory, attachment, clearAttachment, showTyping]
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
    <div
      className={`fiq-chat${nativeEmbed ? " native" : ""}`}
      style={{ ["--fiq-primary" as string]: b.primary_color }}
    >
      <header className="fiq-header">
        {b.logo_url && <img src={b.logo_url} alt="" className="fiq-logo" />}
        <div className="fiq-head-text">
          <h1>{b.title}</h1>
          <p>
            <span className={`fiq-dot ${online ? "on" : "off"}`} aria-hidden="true" />
            {online ? "We're online" : "Away - leave a message"}
          </p>
        </div>
        {whatsappNumber && !onCall && (
          <a
            className="fiq-wa"
            href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(WHATSAPP_PREFILL)}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Continue this conversation on WhatsApp"
            title="Continue on WhatsApp"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
              <path d="M12.04 2A9.9 9.9 0 0 0 2.1 11.9c0 1.75.46 3.46 1.34 4.97L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01a9.9 9.9 0 0 0 9.9-9.9A9.9 9.9 0 0 0 12.04 2zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.39 8.22 8.22 0 0 1 8.25-8.2 8.22 8.22 0 0 1 8.2 8.24 8.22 8.22 0 0 1-8.2 8.21zm4.5-6.15c-.25-.12-1.46-.72-1.68-.8-.23-.09-.39-.13-.56.12-.16.25-.64.8-.78.97-.15.16-.29.18-.53.06-.25-.12-1.04-.38-1.98-1.22-.73-.65-1.23-1.46-1.37-1.7-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.44.13-.15.17-.25.25-.42.08-.16.04-.31-.02-.43-.06-.13-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.16 0-.43.06-.65.31-.23.25-.86.84-.86 2.05s.88 2.38 1 2.54c.13.17 1.73 2.64 4.19 3.7.58.26 1.04.4 1.4.51.59.19 1.13.16 1.55.1.47-.07 1.46-.6 1.66-1.18.21-.58.21-1.07.15-1.18-.06-.11-.22-.17-.47-.29z" />
            </svg>
          </a>
        )}
        {voiceEnabled && !onCall && (
          <button
            type="button"
            className="fiq-call"
            aria-label="Talk to us - start a voice call"
            title="Talk to us"
            onClick={voice.start}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.2 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </button>
        )}
        {dismissable && (
          <button
            type="button"
            className="fiq-close"
            aria-label="Close chat"
            onClick={() => post("close")}
          >
            ×
          </button>
        )}
      </header>

      <CallOverlay voice={voice} title={b.title} logoUrl={b.logo_url} />

      <div
        className="fiq-list"
        ref={listRef}
        onScroll={onListScroll}
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

      {attachment && (
        <div className="fiq-attachment">
          {attachment.previewUrl ? (
            <img src={attachment.previewUrl} alt="" className="fiq-attachment-thumb" />
          ) : (
            <span className="fiq-attachment-icon" aria-hidden="true">
              <FileIcon />
            </span>
          )}
          <span className="fiq-attachment-meta">
            <strong>{attachment.file.name}</strong>
            <em>{formatBytes(attachment.file.size)}</em>
          </span>
          <button
            type="button"
            className="fiq-attachment-remove"
            aria-label={`Remove ${attachment.file.name}`}
            onClick={() => clearAttachment()}
            disabled={sending}
          >
            ×
          </button>
        </div>
      )}

      <form
        className={`fiq-composer${dragging ? " dragover" : ""}`}
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes("Files")) return;
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          if (!e.dataTransfer.files?.length) return;
          e.preventDefault();
          setDragging(false);
          pickFile(e.dataTransfer.files[0]);
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
          placeholder={attachment ? "Add a message (optional)…" : "Type your message…"}
          disabled={!token || sending}
          onChange={(e) => setInput(e.target.value)}
          onPaste={(e) => {
            // Screenshots pasted straight from the clipboard.
            const item = Array.from(e.clipboardData.items).find((i) =>
              i.type.startsWith("image/")
            );
            const file = item?.getAsFile();
            if (file) {
              e.preventDefault();
              pickFile(file);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
        />

        <div className="fiq-tools">
          {/* Hidden from assistive tech: the labelled buttons below are the
              real controls, so announcing these too would be a duplicate. */}
          <input
            ref={docInputRef}
            type="file"
            className="fiq-sr"
            accept={DOCUMENT_ACCEPT}
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => pickFile(e.target.files?.[0])}
          />
          <input
            ref={imageInputRef}
            type="file"
            className="fiq-sr"
            accept={IMAGE_ACCEPT}
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => pickFile(e.target.files?.[0])}
          />

          <button
            type="button"
            className="fiq-tool"
            aria-label="Attach a document"
            title="Attach a document"
            disabled={!token || sending}
            onClick={() => docInputRef.current?.click()}
          >
            <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M21.44 11.05 12.25 20.24a5 5 0 0 1-7.07-7.07l9.19-9.19a3 3 0 0 1 4.24 4.24l-9.2 9.19a1 1 0 0 1-1.41-1.41l8.49-8.49" />
            </svg>
          </button>

          <button
            type="button"
            className="fiq-tool"
            aria-label="Send an image"
            title="Send an image"
            disabled={!token || sending}
            onClick={() => imageInputRef.current?.click()}
          >
            <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-5-5L5 21" />
            </svg>
          </button>

          <div className="fiq-emoji-wrap" ref={emojiRef}>
            <button
              type="button"
              className="fiq-tool"
              aria-label="Insert an emoji"
              title="Emoji"
              aria-expanded={showEmoji}
              disabled={!token || sending}
              onClick={() => setShowEmoji((v) => !v)}
            >
              <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M8.5 14.5a4.5 4.5 0 0 0 7 0" strokeLinecap="round" />
                <path d="M9 9.5h.01M15 9.5h.01" strokeLinecap="round" />
              </svg>
            </button>

            {showEmoji && (
              <div className="fiq-emoji" role="dialog" aria-label="Emoji">
                {EMOJI_GROUPS.map((group) => (
                  <div key={group.label} className="fiq-emoji-group">
                    <p>{group.label}</p>
                    <div className="fiq-emoji-grid">
                      {group.emoji.map((e) => (
                        <button
                          key={e}
                          type="button"
                          aria-label={e}
                          onClick={() => insertEmoji(e)}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="fiq-send"
            disabled={!token || sending || (!input.trim() && !attachment)}
            aria-label={uploading ? "Uploading attachment" : "Send message"}
          >
            {uploading ? (
              <span className="fiq-spinner" aria-hidden="true" />
            ) : (
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            )}
          </button>
        </div>
      </form>

      {b.show_branding && !brandInHost && (
        <div className="fiq-brandbar">
          <a
            className="fiq-brand"
            href="https://firstinqueue.com?utm_source=widget&utm_medium=branding"
            target="_blank"
            rel="noopener noreferrer"
          >
            {/* 48px mark, not the 7MB full-res logo - this loads on every visit. */}
            <img src="/fiq-mark.png" alt="" className="fiq-brand-logo" />
            <span>
              Powered by <strong>First in Queue</strong>
            </span>
          </a>
        </div>
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
          /* Containing block for the call overlay, which covers the whole panel. */
          position: relative;
        }
        .fiq-header {
          display: flex; align-items: center; gap: 10px; padding: 12px 14px;
          background: var(--fiq-primary); color: #fff; flex: 0 0 auto;
        }
        .fiq-logo { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; }
        .fiq-head-text { flex: 1; min-width: 0; }
        /* The assistant's name is the widget's identity - it leads the panel,
           so it is set clearly larger than the status line under it. */
        .fiq-header h1 {
          margin: 0; font-size: 19px; font-weight: 700; line-height: 1.2;
          letter-spacing: -.01em;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .fiq-header p { margin: 3px 0 0; font-size: 12px; opacity: .9; display: flex; align-items: center; gap: 6px; }
        .fiq-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
        .fiq-dot.on { background: #4ade80; }
        .fiq-dot.off { background: #d1d5db; }
        .fiq-close {
          background: transparent; border: none; color: #fff; font-size: 26px;
          line-height: 1; cursor: pointer; padding: 0 4px;
        }
        .fiq-call, .fiq-wa {
          background: rgba(255, 255, 255, .18); border: none; color: #fff;
          width: 32px; height: 32px; border-radius: 50%; cursor: pointer;
          display: flex; align-items: center; justify-content: center; flex: 0 0 auto;
          text-decoration: none;
        }
        .fiq-call:hover, .fiq-wa:hover { background: rgba(255, 255, 255, .3); }
        .fiq-call:focus-visible, .fiq-wa:focus-visible { outline: 3px solid #111; outline-offset: 2px; }
        /* WebView embeds have no browser chrome - keep the composer off the
           home indicator / gesture bar. */
        .fiq-chat.native .fiq-composer { padding-bottom: calc(10px + env(safe-area-inset-bottom)); }
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

        /* --- Composer: message on top, tools underneath, all in one field --- */
        .fiq-composer {
          display: flex; flex-direction: column; gap: 4px; flex: 0 0 auto;
          margin: 0 12px 12px; padding: 6px 8px 6px 10px;
          border: 1px solid #d1d5db; border-radius: 14px; background: #fff;
        }
        .fiq-composer:focus-within { border-color: var(--fiq-primary); }
        .fiq-composer.dragover { border-color: var(--fiq-primary); background: #f6fbf8; }
        .fiq-composer textarea {
          resize: none; border: none; outline: none; background: transparent;
          padding: 6px 2px; font: inherit; max-height: 120px; min-height: 34px;
        }
        .fiq-tools { display: flex; align-items: center; gap: 2px; }
        .fiq-tool {
          background: transparent; border: none; color: #6b7280; cursor: pointer;
          width: 32px; height: 32px; border-radius: 8px; display: flex;
          align-items: center; justify-content: center; flex: 0 0 auto; padding: 0;
        }
        .fiq-tool:hover:not(:disabled) { background: #f3f4f6; color: #111; }
        .fiq-tool:disabled { opacity: .4; cursor: not-allowed; }
        .fiq-send {
          margin-left: auto; background: var(--fiq-primary); color: #fff; border: none;
          border-radius: 999px; width: 36px; height: 36px; cursor: pointer;
          display: flex; align-items: center; justify-content: center; flex: 0 0 auto;
        }
        .fiq-send:disabled { opacity: .45; cursor: not-allowed; }
        .fiq-tool:focus-visible, .fiq-send:focus-visible { outline: 3px solid #111; outline-offset: 2px; }
        .fiq-spinner {
          width: 16px; height: 16px; border-radius: 50%; display: block;
          border: 2px solid rgba(255, 255, 255, .45); border-top-color: #fff;
          animation: fiq-spin .7s linear infinite;
        }
        @keyframes fiq-spin { to { transform: rotate(360deg); } }

        /* --- Staged attachment, above the composer --- */
        .fiq-attachment {
          display: flex; align-items: center; gap: 10px; margin: 0 12px 8px;
          padding: 8px 10px; border: 1px solid #e5e7eb; border-radius: 12px;
          background: #f9fafb;
        }
        .fiq-attachment-thumb {
          width: 40px; height: 40px; border-radius: 8px; object-fit: cover; flex: 0 0 auto;
        }
        .fiq-attachment-icon { color: var(--fiq-primary); display: flex; flex: 0 0 auto; }
        .fiq-attachment-meta { display: flex; flex-direction: column; min-width: 0; gap: 2px; }
        .fiq-attachment-meta strong {
          font-size: 13px; font-weight: 600; overflow: hidden;
          text-overflow: ellipsis; white-space: nowrap;
        }
        .fiq-attachment-meta em { font-style: normal; font-size: 11px; color: #6b7280; }
        .fiq-attachment-remove {
          margin-left: auto; background: transparent; border: none; color: #6b7280;
          font-size: 22px; line-height: 1; cursor: pointer; padding: 0 4px;
        }
        .fiq-attachment-remove:hover { color: #111; }

        /* --- Attachments inside bubbles --- */
        .fiq-bubble.media { padding: 6px 6px 8px; }
        .fiq-bubble.media > span:not(.fiq-media-missing) { display: block; padding: 2px 6px 0; }
        .fiq-bubble.media .fiq-time { padding: 0 6px; }
        .fiq-media-link { display: block; }
        .fiq-media-img {
          display: block; max-width: 100%; max-height: 240px; border-radius: 10px;
          object-fit: cover;
        }
        .fiq-media-missing { display: block; padding: 4px 6px; font-size: 13px; opacity: .7; }
        .fiq-doc {
          display: flex; align-items: center; gap: 10px; padding: 8px;
          border-radius: 10px; background: rgba(0, 0, 0, .05);
          color: inherit; text-decoration: none;
        }
        .fiq-bubble.me .fiq-doc { background: rgba(255, 255, 255, .18); }
        .fiq-doc:hover { background: rgba(0, 0, 0, .09); }
        .fiq-bubble.me .fiq-doc:hover { background: rgba(255, 255, 255, .28); }
        .fiq-doc-meta { display: flex; flex-direction: column; min-width: 0; gap: 2px; }
        .fiq-doc-meta strong {
          font-size: 13px; font-weight: 600; overflow-wrap: anywhere;
        }
        .fiq-doc-meta em { font-style: normal; font-size: 11px; opacity: .7; }

        /* --- Emoji panel --- */
        .fiq-emoji-wrap { position: relative; display: flex; }
        .fiq-emoji {
          position: absolute; bottom: calc(100% + 8px); left: 0; z-index: 5;
          width: 268px; max-height: 232px; overflow-y: auto; padding: 8px;
          background: #fff; border: 1px solid #e5e7eb; border-radius: 12px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, .16);
        }
        .fiq-emoji-group + .fiq-emoji-group { margin-top: 6px; }
        .fiq-emoji-group p {
          margin: 0 0 4px; font-size: 11px; text-transform: uppercase;
          letter-spacing: .04em; color: #9ca3af;
        }
        .fiq-emoji-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 2px; }
        .fiq-emoji-grid button {
          background: transparent; border: none; cursor: pointer; font-size: 19px;
          line-height: 1; padding: 4px 0; border-radius: 6px;
        }
        .fiq-emoji-grid button:hover { background: #f3f4f6; }
        .fiq-emoji-grid button:focus-visible { outline: 2px solid #111; outline-offset: 1px; }
        .fiq-brandbar {
          display: flex; justify-content: center; flex: 0 0 auto;
          background: #f7f8f9; padding: 8px 0 10px;
        }
        .fiq-brand {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 5px 12px 5px 8px; border-radius: 999px;
          background: #fff; border: 1px solid #e5e7eb;
          box-shadow: 0 1px 4px rgba(0, 0, 0, .1);
          font-size: 11px; color: #6b7280; text-decoration: none; line-height: 1;
          transition: box-shadow .15s, transform .15s;
        }
        .fiq-brand:hover { box-shadow: 0 3px 10px rgba(0, 0, 0, .14); transform: translateY(-1px); }
        .fiq-brand:focus-visible { outline: 3px solid #111; outline-offset: 2px; }
        .fiq-brand strong { color: #03A84E; font-weight: 700; }
        .fiq-brand-logo { width: 14px; height: 14px; object-fit: contain; display: block; }
        @media (prefers-reduced-motion: reduce) {
          .fiq-typing span, .fiq-spinner { animation: none; }
          .fiq-list { scroll-behavior: auto; }
        }
      `}</style>
    </div>
  );
}

/** Paperclip-free document glyph, used in bubbles and the pending-file chip. */
function FileIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

function Bubble({ msg }: { msg: ChatMessage }) {
  const mine = msg.direction === "inbound";
  const c = msg.content || {};
  const isMedia = msg.type === "image" || msg.type === "document";
  // Media messages carry their typed-alongside text as a caption; plain ones
  // use `text`. Bot-sent media (WhatsApp parity) can use either.
  const text = (isMedia ? c.caption : c.text) || (isMedia ? "" : c.text || "");

  return (
    <div
      className={`fiq-bubble ${mine ? "me" : "bot"}${msg.pending ? " pending" : ""}${
        isMedia ? " media" : ""
      }`}
    >
      {msg.type === "image" &&
        (c.media_url ? (
          <a href={c.media_url} target="_blank" rel="noopener noreferrer" className="fiq-media-link">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c.media_url} alt={c.caption || c.filename || "Attached image"} className="fiq-media-img" />
          </a>
        ) : (
          <span className="fiq-media-missing">Image unavailable</span>
        ))}

      {msg.type === "document" &&
        (c.media_url ? (
          <a
            className="fiq-doc"
            href={c.media_url}
            target="_blank"
            rel="noopener noreferrer"
            download={c.filename || undefined}
          >
            <FileIcon />
            <span className="fiq-doc-meta">
              <strong>{c.filename || "Document"}</strong>
              {c.media_size ? <em>{formatBytes(c.media_size)}</em> : null}
            </span>
          </a>
        ) : (
          <span className="fiq-media-missing">{c.filename || "Attachment"}</span>
        ))}

      {text &&
        (mine ? (
          <span>{text}</span>
        ) : (
          <span dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }} />
        ))}

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
