"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { DEMO_SUBDOMAINS } from "@/lib/demo/decks";

// Dogfooding: the marketing site runs the same widget we sell, loaded through
// the same public loader a customer pastes into their own page. It replaced two
// hand-built bubbles - a wa.me link and a bespoke voice card - neither of which
// was the product.
//
// Chat, voice and WhatsApp all live inside it now, configured from FiQ's own
// property in the dashboard rather than from code here.

/** Surfaces where our own support widget would be noise or a distraction. */
// "/demo" carries the prospect's own assistant in the corner. Ours alongside it
// puts two chat bubbles on a page whose whole job is showing off one.
const HIDDEN_PREFIXES = ["/dashboard", "/admin", "/login", "/signup", "/onboarding", "/widget", "/trial-payment", "/demo"];

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

    // A demo subdomain serves /demo/<slug> through a rewrite, so the client
    // still sees "/" and the prefix check above never fires. Checked here
    // rather than in state: a second effect would settle one render too late
    // and the script would already be on the page.
    const label = window.location.hostname.split(".")[0].toLowerCase();
    if (DEMO_SUBDOMAINS[label]) return;

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
