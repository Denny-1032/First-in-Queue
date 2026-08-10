"use client";

import { useEffect } from "react";
import { formatCallTime, type VoiceCall } from "@/lib/widget/use-voice-call";

// The call screen everyone already knows: who you are talking to, how long for,
// mute, hang up. Nothing else - no keypad, no hold, no transfer, because the
// widget cannot do any of those.
//
// It covers the transcript rather than sitting above it as a strip. A call is a
// mode, not a notification, and the previous thin status bar read as neither.
//
// All state comes from useVoiceCall; this component owns none of it.

/** How long "Call ended" stays up before the transcript comes back. */
const ENDED_DISMISS_MS = 1600;

interface Props {
  voice: VoiceCall;
  /** Property title - who the visitor thinks they are calling. */
  title: string;
  logoUrl?: string | null;
}

export function CallOverlay({ voice, title, logoUrl }: Props) {
  const { state, reset } = voice;

  // A finished call should not need dismissing - it just goes away.
  useEffect(() => {
    if (state !== "ended") return;
    const t = setTimeout(reset, ENDED_DISMISS_MS);
    return () => clearTimeout(t);
  }, [state, reset]);

  if (state === "idle") return null;

  const onCall = state === "connecting" || state === "active";

  return (
    <div className="fiq-callscreen" role="dialog" aria-modal="true" aria-label="Voice call">
      <div className={`fiq-avatar${state === "active" && voice.agentTalking ? " talking" : ""}`}>
        {logoUrl ? (
          <img src={logoUrl} alt="" />
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.2 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
        )}
      </div>

      <p className="fiq-callname">{title}</p>

      <p className="fiq-callstatus" role="status" aria-live="polite">
        {state === "connecting" && "Connecting…"}
        {state === "active" && (
          <>
            <time dateTime={`PT${voice.seconds}S`}>{formatCallTime(voice.seconds)}</time>
            <span className="fiq-callhint">
              {voice.agentTalking ? "Speaking…" : voice.muted ? "You're muted" : "Listening…"}
            </span>
          </>
        )}
        {state === "ended" && "Call ended"}
        {state === "error" && (voice.error || "The call couldn't connect")}
      </p>

      {onCall && (
        <div className="fiq-callctrls">
          <button
            type="button"
            className={`fiq-ctrl${voice.muted ? " active" : ""}`}
            onClick={voice.toggleMute}
            aria-pressed={voice.muted}
            aria-label={voice.muted ? "Unmute microphone" : "Mute microphone"}
            disabled={state !== "active"}
          >
            {voice.muted ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M1 1l22 22M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23M12 19v3" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3" />
              </svg>
            )}
          </button>

          <button type="button" className="fiq-ctrl end" onClick={voice.stop} aria-label="End call">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 9c-1.6 0-3.15.25-4.6.7v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85a.89.89 0 0 1-.62.25c-.24 0-.47-.1-.63-.26L.29 13.08a.87.87 0 0 1-.26-.63c0-.25.1-.47.26-.63C3.34 9.02 7.46 7.4 12 7.4s8.66 1.62 11.71 4.42c.16.16.26.38.26.63 0 .24-.1.47-.26.63l-2.64 2.46a.87.87 0 0 1-.63.26.89.89 0 0 1-.62-.25 11.4 11.4 0 0 0-2.66-1.85.99.99 0 0 1-.56-.9v-3.1A15.65 15.65 0 0 0 12 9z" />
            </svg>
          </button>
        </div>
      )}

      {state === "error" && (
        <div className="fiq-callctrls">
          <button type="button" className="fiq-callagain" onClick={voice.start}>
            Try again
          </button>
          <button type="button" className="fiq-callback" onClick={reset}>
            Back to chat
          </button>
        </div>
      )}

      <style jsx global>{`
        .fiq-callscreen {
          position: absolute;
          inset: 0;
          z-index: 5;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 14px;
          padding: 24px;
          text-align: center;
          color: #fff;
          background: linear-gradient(160deg, var(--fiq-primary), rgba(0, 0, 0, 0.82));
        }
        .fiq-avatar {
          position: relative;
          width: 96px;
          height: 96px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.16);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
        }
        .fiq-avatar img {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
        }
        .fiq-avatar svg {
          width: 40px;
          height: 40px;
        }
        /* The ring is the only thing that says "it is talking now", so it grows
           from the avatar rather than sitting on it - visible over a logo too. */
        .fiq-avatar.talking::after {
          content: "";
          position: absolute;
          inset: -10px;
          border-radius: 50%;
          border: 2px solid rgba(255, 255, 255, 0.55);
          animation: fiq-ring 1.4s ease-out infinite;
        }
        @keyframes fiq-ring {
          0% { transform: scale(0.92); opacity: 0.9; }
          100% { transform: scale(1.15); opacity: 0; }
        }
        .fiq-callname {
          margin: 0;
          font-size: 17px;
          font-weight: 600;
        }
        .fiq-callstatus {
          margin: 0;
          font-size: 13px;
          opacity: 0.85;
          display: flex;
          flex-direction: column;
          gap: 3px;
          min-height: 34px;
        }
        .fiq-callstatus time {
          font-size: 15px;
          font-variant-numeric: tabular-nums;
          opacity: 0.95;
        }
        .fiq-callhint { opacity: 0.75; }
        .fiq-callctrls {
          display: flex;
          align-items: center;
          gap: 18px;
          margin-top: 8px;
        }
        .fiq-ctrl {
          width: 54px;
          height: 54px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.2);
          color: #fff;
        }
        .fiq-ctrl svg { width: 22px; height: 22px; }
        .fiq-ctrl:hover { background: rgba(255, 255, 255, 0.3); }
        .fiq-ctrl.active { background: #fff; color: #111; }
        .fiq-ctrl.end { background: #dc2626; }
        .fiq-ctrl.end:hover { background: #b91c1c; }
        .fiq-ctrl:disabled { opacity: 0.5; cursor: not-allowed; }
        .fiq-ctrl:focus-visible,
        .fiq-callagain:focus-visible,
        .fiq-callback:focus-visible {
          outline: 3px solid #fff;
          outline-offset: 3px;
        }
        .fiq-callagain,
        .fiq-callback {
          border-radius: 999px;
          padding: 9px 18px;
          font: inherit;
          font-size: 13px;
          cursor: pointer;
        }
        .fiq-callagain { background: #fff; color: #111; border: none; font-weight: 600; }
        .fiq-callback { background: transparent; color: #fff; border: 1px solid rgba(255, 255, 255, 0.5); }
        @media (prefers-reduced-motion: reduce) {
          .fiq-avatar.talking::after { animation: none; opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
