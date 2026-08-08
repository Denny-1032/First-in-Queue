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

  it("localhost gets an http form with a port wildcard, so dev pages can frame", () => {
    expect(frameAncestorsFor(["localhost"])).toBe(
      "'self' http://localhost:* https://localhost:*"
    );
  });

  it("127.0.0.1 is treated as loopback too", () => {
    expect(frameAncestorsFor(["127.0.0.1"])).toBe(
      "'self' http://127.0.0.1:* https://127.0.0.1:*"
    );
  });

  it("loopback allowance does NOT leak http to real domains", () => {
    const value = frameAncestorsFor(["localhost", "example.com"]);
    expect(value).toContain("http://localhost:*");
    expect(value).toContain("https://example.com");
    // The real domain must stay https-only.
    expect(value).not.toContain("http://example.com");
  });

  it("is opt-in: no loopback source unless localhost is allowlisted", () => {
    const value = frameAncestorsFor(["example.com"]);
    expect(value).not.toContain("localhost");
    expect(value).not.toContain("http://");
  });

  it("closes the CORS/framing asymmetry that left dev panels blank", () => {
    const domains = ["localhost"];
    // isOriginAllowed ignores scheme and port, so CORS accepted this origin...
    expect(isOriginAllowed("http://localhost:8080", domains)).toBe(true);
    // ...and frame-ancestors must now cover it too, or the panel renders empty.
    expect(frameAncestorsFor(domains)).toContain("http://localhost:*");
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
