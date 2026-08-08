"use client";

import { useEffect } from "react";
import Image from "next/image";
import { MessageSquare, ShieldCheck, Zap } from "lucide-react";

// The wizard's left panel. Dogfooding (§7): if a FIQ widget key is configured
// we load our own widget loader so the customer talks to the product while
// buying it. The static chat preview below is the always-present fallback so
// the panel is never empty, even before FIQ's own property is configured.
export function DogfoodPanel() {
  const fiqKey = process.env.NEXT_PUBLIC_FIQ_WIDGET_KEY;

  useEffect(() => {
    if (!fiqKey) return;
    const existing = document.querySelector<HTMLScriptElement>("script[data-fiq-dogfood]");
    if (existing) return;
    const s = document.createElement("script");
    s.src = "/widget.js";
    s.async = true;
    s.dataset.key = fiqKey;
    s.dataset.fiqDogfood = "1";
    document.body.appendChild(s);
  }, [fiqKey]);

  return (
    <div className="flex h-full flex-col justify-between p-10 text-white">
      <div className="flex items-center gap-2">
        <Image
          src="/fiq-logo.png?v=2"
          alt="First in Queue"
          width={40}
          height={40}
          className="h-9 w-9 object-contain"
        />
        <span className="text-lg font-bold">First in Queue</span>
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-bold leading-snug">
          Your AI assistant will be answering customers in a few minutes.
        </h2>

        {/* Static chat preview - the fallback that keeps the panel alive. */}
        <div className="space-y-3 rounded-2xl bg-white/10 p-4 backdrop-blur">
          <div className="flex items-center gap-2 text-sm font-medium text-white/90">
            <MessageSquare className="h-4 w-4" /> Chat with us
          </div>
          <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-white/15 px-3 py-2 text-sm">
            👋 Hi! How can we help?
          </div>
          <div className="ml-auto max-w-[80%] rounded-2xl rounded-tr-sm bg-white px-3 py-2 text-sm text-gray-900">
            What are your opening hours?
          </div>
          <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-white/15 px-3 py-2 text-sm">
            We&apos;re open 8am–6pm, Monday to Saturday. 😊
          </div>
        </div>

        <ul className="space-y-3 text-sm text-white/90">
          <li className="flex items-center gap-2">
            <Zap className="h-4 w-4 shrink-0" /> Learns your business from your website automatically.
          </li>
          <li className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0" /> No credit card. Nothing to install but one line of code.
          </li>
        </ul>
      </div>

      <p className="text-xs text-white/60">Set up in under five minutes.</p>
    </div>
  );
}
