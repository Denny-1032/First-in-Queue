import { describe, it, expect } from "vitest";
import {
  generateWidgetKey,
  isWidgetKeyShaped,
  normalizeDomain,
  deriveAllowedDomains,
  isOriginAllowed,
  corsOriginFor,
} from "./keys";

describe("widget keys", () => {
  it("generates prefixed, correctly shaped, unique keys", () => {
    const a = generateWidgetKey();
    const b = generateWidgetKey();
    expect(a).toMatch(/^fiq_live_[0-9A-Za-z]{32}$/);
    expect(isWidgetKeyShaped(a)).toBe(true);
    expect(a).not.toBe(b);
  });

  it("draws from the whole base62 alphabet without truncating", () => {
    // Rejection sampling loops until it has enough accepted bytes; this would
    // catch a short key or a generator that stalls.
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const key = generateWidgetKey().slice("fiq_live_".length);
      expect(key).toHaveLength(32);
      for (const ch of key) seen.add(ch);
    }
    // 6,400 draws over 62 symbols: every symbol should appear.
    expect(seen.size).toBe(62);
  });

  it("rejects malformed keys", () => {
    expect(isWidgetKeyShaped("fiq_live_short")).toBe(false);
    expect(isWidgetKeyShaped("nope_" + "a".repeat(32))).toBe(false);
    expect(isWidgetKeyShaped("")).toBe(false);
  });
});

describe("normalizeDomain", () => {
  it("strips protocol, www, port and path", () => {
    expect(normalizeDomain("https://www.example.com/pricing?a=1")).toBe("example.com");
    expect(normalizeDomain("http://example.com:3000")).toBe("example.com");
    expect(normalizeDomain("Example.COM")).toBe("example.com");
  });

  it("returns null for junk", () => {
    expect(normalizeDomain("")).toBeNull();
    expect(normalizeDomain("   ")).toBeNull();
  });
});

describe("deriveAllowedDomains", () => {
  it("seeds the apex and www forms from the wizard's site URL", () => {
    expect(deriveAllowedDomains("https://shop.co.zm/store")).toEqual(["shop.co.zm", "www.shop.co.zm"]);
  });
});

describe("isOriginAllowed", () => {
  const allowed = ["example.com"];

  it("allows the exact host and its subdomains", () => {
    expect(isOriginAllowed("https://example.com", allowed)).toBe(true);
    expect(isOriginAllowed("https://www.example.com", allowed)).toBe(true);
    expect(isOriginAllowed("https://shop.example.com", allowed)).toBe(true);
  });

  it("DENIES a suffix collision", () => {
    // the classic bug: endsWith("example.com") would wrongly allow this
    expect(isOriginAllowed("https://notexample.com", allowed)).toBe(false);
    expect(isOriginAllowed("https://evil-example.com", allowed)).toBe(false);
  });

  it("DENIES an unrelated origin", () => {
    expect(isOriginAllowed("https://attacker.io", allowed)).toBe(false);
  });

  it("DENIES when the allowlist is empty — empty is never allow-all", () => {
    expect(isOriginAllowed("https://example.com", [])).toBe(false);
  });

  it("DENIES a missing Origin header", () => {
    expect(isOriginAllowed(null, allowed)).toBe(false);
  });
});

describe("corsOriginFor", () => {
  it("echoes only a matched origin, never a wildcard", () => {
    expect(corsOriginFor("https://shop.example.com", ["example.com"])).toBe("https://shop.example.com");
    expect(corsOriginFor("https://attacker.io", ["example.com"])).toBeNull();
  });
});
