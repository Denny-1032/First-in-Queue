import { describe, it, expect, afterEach, vi } from "vitest";
import type { NextRequest } from "next/server";
import { isFirstPartyWidgetRequest } from "./guard";

// The widget document is served from OUR origin, so its own /api/widget/* calls
// can never match a customer's allowed_domains. These pin the first-party escape
// hatch that makes the iframe able to boot at all.

function req(headers: Record<string, string>): NextRequest {
  const lower: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) lower[k.toLowerCase()] = v;
  return { headers: { get: (k: string) => lower[k.toLowerCase()] ?? null } } as unknown as NextRequest;
}

describe("isFirstPartyWidgetRequest", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("same-origin GET (no Origin header) is first-party via Sec-Fetch-Site", () => {
    expect(
      isFirstPartyWidgetRequest(
        req({ host: "firstinqueue.com", "sec-fetch-site": "same-origin" }),
        null
      )
    ).toBe(true);
  });

  it("Origin matching the serving host is first-party", () => {
    expect(
      isFirstPartyWidgetRequest(req({ host: "firstinqueue.com" }), "https://firstinqueue.com")
    ).toBe(true);
  });

  it("works on the app subdomain too — the snippet may point at either", () => {
    expect(
      isFirstPartyWidgetRequest(
        req({ host: "app.firstinqueue.com" }),
        "https://app.firstinqueue.com"
      )
    ).toBe(true);
  });

  it("accepts the configured canonical app URL even when Host differs", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.firstinqueue.com");
    expect(
      isFirstPartyWidgetRequest(
        req({ host: "first-in-queue.vercel.app" }),
        "https://app.firstinqueue.com"
      )
    ).toBe(true);
  });

  it("a customer's site is NOT first-party — it must pass the allowlist instead", () => {
    expect(
      isFirstPartyWidgetRequest(req({ host: "firstinqueue.com" }), "https://codarti.com")
    ).toBe(false);
  });

  it("an attacker's origin is not first-party", () => {
    expect(
      isFirstPartyWidgetRequest(req({ host: "firstinqueue.com" }), "https://evil.example")
    ).toBe(false);
  });

  it("cross-site request with no Origin is NOT first-party", () => {
    expect(
      isFirstPartyWidgetRequest(
        req({ host: "firstinqueue.com", "sec-fetch-site": "cross-site" }),
        null
      )
    ).toBe(false);
  });

  it("a header-less client (curl) is not first-party", () => {
    expect(isFirstPartyWidgetRequest(req({ host: "firstinqueue.com" }), null)).toBe(false);
  });

  it("a malformed Origin is rejected rather than throwing", () => {
    expect(isFirstPartyWidgetRequest(req({ host: "firstinqueue.com" }), "not-a-url")).toBe(false);
  });

  // WKWebView before iOS 16.4 sends neither Origin nor Sec-Fetch-Site, so the
  // mobile-app embed falls back to Referer.
  it("old WKWebView (no Origin, no Sec-Fetch-Site) is first-party via Referer", () => {
    expect(
      isFirstPartyWidgetRequest(
        req({ host: "firstinqueue.com", referer: "https://firstinqueue.com/widget/chat?key=x" }),
        null
      )
    ).toBe(true);
  });

  it("a Referer on someone else's site is not first-party", () => {
    expect(
      isFirstPartyWidgetRequest(
        req({ host: "firstinqueue.com", referer: "https://evil.example/page" }),
        null
      )
    ).toBe(false);
  });

  it("Sec-Fetch-Site still wins over Referer when present", () => {
    expect(
      isFirstPartyWidgetRequest(
        req({
          host: "firstinqueue.com",
          "sec-fetch-site": "cross-site",
          referer: "https://firstinqueue.com/widget/chat",
        }),
        null
      )
    ).toBe(false);
  });

  it("suffix collision on the host does not pass", () => {
    expect(
      isFirstPartyWidgetRequest(req({ host: "firstinqueue.com" }), "https://notfirstinqueue.com")
    ).toBe(false);
  });
});
