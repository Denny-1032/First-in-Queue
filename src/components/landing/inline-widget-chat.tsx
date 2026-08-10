"use client";

import { MessageSquare } from "lucide-react";

// The hero used to hold a lead-capture form: give us your phone number, and
// we'll show you the product later. This is the product, right there, working.
//
// It is the same /widget/chat document the launcher loads on a customer's site
// - not a copy of it - so it cannot drift from what we actually sell. The
// `embed=inline` flag only tells it there is no panel to collapse back into.
//
// Framing is allowed by the CSP the middleware sets for /widget/*: 'self' is
// always in frame-ancestors, so our own pages qualify without allowlisting.

export function InlineWidgetChat() {
  const key = process.env.NEXT_PUBLIC_FIQ_WIDGET_KEY;

  // No key configured (a fresh environment): show nothing rather than a broken
  // frame. Same rule the launcher follows.
  if (!key) return null;

  return (
    <div className="w-full max-w-[420px] mx-auto lg:mx-0">
      <div className="rounded-2xl border border-gray-200 bg-white shadow-2xl shadow-gray-300/40 overflow-hidden h-[520px] sm:h-[560px]">
        <iframe
          src={`/widget/chat?key=${encodeURIComponent(key)}&embed=inline`}
          title="Chat with First in Queue"
          allow="microphone; autoplay"
          className="w-full h-full border-0 block"
        />
      </div>
      <p className="mt-3 flex items-center justify-center gap-2 text-xs text-gray-500">
        <MessageSquare className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
        This is the real widget, not a screenshot. Type anything.
      </p>
    </div>
  );
}
