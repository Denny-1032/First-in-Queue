import { describe, it, expect } from "vitest";
import { frameAncestorsFor, isOriginAllowed } from "./allowlist";

// frame-ancestors is the control that replaced X-Frame-Options: DENY on the
// widget documents (spec §6). It must permit exactly what isOriginAllowed
// permits — no more.

describe("frameAncestorsFor", () => {
  it("empty allowlist → first-party only, every third party denied", () => {
    expect(frameAncestorsFor([])).toBe("'self'");
  });

  it("emits the exact origin and a wildcard for subdomains", () => {
    expect(frameAncestorsFor(["example.com"])).toBe(
      "'self' https://example.com https://*.example.com"
    );
  });

  it("normalizes away scheme, www. and path", () => {
    expect(frameAncestorsFor(["https://www.example.com/contact"])).toBe(
      "'self' https://example.com https://*.example.com"
    );
  });

  it("de-duplicates entries that normalize to the same host", () => {
    expect(frameAncestorsFor(["example.com", "www.example.com", "https://example.com"])).toBe(
      "'self' https://example.com https://*.example.com"
    );
  });

  it("keeps multiple distinct hosts", () => {
    expect(frameAncestorsFor(["a.com", "b.co.zm"])).toBe(
      "'self' https://a.com https://*.a.com https://b.co.zm https://*.b.co.zm"
    );
  });

  it("drops unparseable entries rather than emitting a broken source", () => {
    expect(frameAncestorsFor(["", "   ", "example.com"])).toBe(
      "'self' https://example.com https://*.example.com"
    );
  });

  it("never emits a wildcard that would allow any origin", () => {
    const value = frameAncestorsFor(["example.com"]);
    expect(value).not.toContain("*;");
    expect(value.split(" ")).not.toContain("*");
    expect(value).not.toContain("https://*.*");
  });

  it("agrees with isOriginAllowed on the subdomain rule", () => {
    const domains = ["example.com"];
    // allowed by isOriginAllowed → covered by a frame-ancestors source
    expect(isOriginAllowed("https://shop.example.com", domains)).toBe(true);
    expect(frameAncestorsFor(domains)).toContain("https://*.example.com");

    // suffix collision is rejected by isOriginAllowed, and the wildcard
    // `*.example.com` does not match `notexample.com` either
    expect(isOriginAllowed("https://notexample.com", domains)).toBe(false);
    expect(frameAncestorsFor(domains)).not.toContain("notexample.com");
  });
});
