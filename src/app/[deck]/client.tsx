"use client";

import { useEffect, useState } from "react";

/**
 * Loads the real widget.js on the demo page, exactly as a customer would paste
 * it onto their own site. That gives the launcher bubble - open and close, not
 * an always-open panel - and the loader builds its iframe on page load, so the
 * chat is warm before anyone clicks. Same code path the product ships.
 */
export function DemoWidget({ widgetKey, title }: { widgetKey: string; title: string }) {
  useEffect(() => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-fiq-demo]");
    if (existing) return;
    const s = document.createElement("script");
    s.src = "/widget.js";
    s.async = true;
    s.dataset.key = widgetKey;
    // Overrides the "Chat with us" default so the panel header never flashes it
    // before the property config resolves.
    s.dataset.title = title;
    s.dataset.fiqDemo = "1";
    document.body.appendChild(s);
  }, [widgetKey, title]);

  return null;
}

/**
 * "Good afternoon. How can we help?" - resolved to the viewer's clock, not the
 * build's. The page is statically generated, so the time of day has to be
 * decided on the client; it starts neutral to avoid a hydration mismatch and
 * settles on mount.
 */
export function TimeGreeting() {
  const [greeting, setGreeting] = useState("Hello");

  useEffect(() => {
    // Mount-time by design: the server prerenders "Hello" (stable across build
    // and hydrate) and the viewer's local hour is only knowable here.
    const h = new Date().getHours();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGreeting(h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening");
  }, []);

  return <>{greeting}. How can we help?</>;
}
