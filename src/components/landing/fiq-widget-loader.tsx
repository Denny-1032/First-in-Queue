"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Dogfooding: the marketing site runs the same widget we sell, loaded through
// the same public loader a customer pastes into their own page. It replaced two
// hand-built bubbles - a wa.me link and a bespoke voice card - neither of which
// was the product.
//
// Chat, voice and WhatsApp all live inside it now, configured from FiQ's own
// property in the dashboard rather than from code here.

/** Surfaces where our own support widget would be noise or a distraction. */
const HIDDEN_PREFIXES = ["/dashboard", "/admin", "/login", "/signup", "/onboarding", "/widget", "/trial-payment"];

export function FiqWidgetLoader() {
  const pathname = usePathname();
  const key = process.env.NEXT_PUBLIC_FIQ_WIDGET_KEY;
  // The homepage keeps its launcher too. The hero embeds the same widget
  // inline, but the bubble in the corner is what a visitor will actually see on
  // their own site, so it has to be visible where they are evaluating us.
  const hidden = HIDDEN_PREFIXES.some((p) => pathname.startsWith(p));

  useEffect(() => {
    // No key configured yet (e.g. a fresh environment): render nothing rather
    // than a launcher that opens onto an error.
    if (!key || hidden) return;

    const existing = document.querySelector<HTMLScriptElement>("script[data-fiq-dogfood]");
    if (existing) return;

    const s = document.createElement("script");
    s.src = "/widget.js";
    s.async = true;
    s.dataset.key = key;
    s.dataset.fiqDogfood = "1";
    document.body.appendChild(s);
  }, [key, hidden]);

  // The loader builds its own shadow-DOM root on document.body, so once it is
  // on the page a client-side route change cannot unmount it. Remove it
  // explicitly when navigating to a surface it should not appear on.
  useEffect(() => {
    if (!hidden) return;
    document.querySelector("script[data-fiq-dogfood]")?.remove();
    document.querySelector("[data-fiq-root]")?.remove();
  }, [hidden]);

  return null;
}
