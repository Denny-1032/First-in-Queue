import { describe, it, expect, vi, afterEach } from "vitest";
import {
  issueVisitorToken,
  verifyVisitorToken,
  shouldRenew,
  generateVisitorId,
  widgetKeyFingerprint,
  KEY_ROTATION_GRACE_MS,
} from "./visitor-token";

const KEY = "fiq_live_" + "a".repeat(32);
const base = {
  propertyId: "prop-1",
  tenantId: "tenant-1",
  conversationId: "conv-1",
  visitorId: "v_abc",
  widgetKey: KEY,
};

afterEach(() => vi.useRealTimers());

describe("visitor tokens", () => {
  it("round-trips a valid token", () => {
    const p = verifyVisitorToken(issueVisitorToken(base), KEY);
    expect(p).toMatchObject({
      propertyId: "prop-1",
      tenantId: "tenant-1",
      conversationId: "conv-1",
      visitorId: "v_abc",
    });
  });

  it("rejects a tampered payload", () => {
    const token = issueVisitorToken(base);
    const [, sig] = token.split(".");
    // re-point the token at another tenant's conversation
    const forged = Buffer.from(
      JSON.stringify({ ...base, conversationId: "victim-conv", kf: "x", iat: Date.now(), exp: Date.now() + 1e6 })
    ).toString("base64url");
    expect(verifyVisitorToken(`${forged}.${sig}`, KEY)).toBeNull();
  });

  it("rejects garbage, empty and signature-less input", () => {
    expect(verifyVisitorToken(null)).toBeNull();
    expect(verifyVisitorToken("")).toBeNull();
    expect(verifyVisitorToken("no-dot")).toBeNull();
    expect(verifyVisitorToken("a.b")).toBeNull();
  });

  it("rejects a short signature without throwing (timingSafeEqual length guard)", () => {
    const token = issueVisitorToken(base);
    const [payload] = token.split(".");
    expect(() => verifyVisitorToken(`${payload}.abc`, KEY)).not.toThrow();
    expect(verifyVisitorToken(`${payload}.abc`, KEY)).toBeNull();
  });

  it("rejects an expired token", () => {
    const token = issueVisitorToken(base);
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 25 * 60 * 60 * 1000);
    expect(verifyVisitorToken(token, KEY)).toBeNull();
  });

  describe("key rotation", () => {
    const NEW_KEY = "fiq_live_" + "b".repeat(32);

    it("still accepts a token inside the grace window", () => {
      const token = issueVisitorToken(base);
      expect(verifyVisitorToken(token, NEW_KEY)).not.toBeNull();
    });

    it("rejects it once the grace window has passed", () => {
      const token = issueVisitorToken(base);
      vi.useFakeTimers();
      vi.setSystemTime(Date.now() + KEY_ROTATION_GRACE_MS + 1000);
      expect(verifyVisitorToken(token, NEW_KEY)).toBeNull();
      // ...but the un-rotated key keeps working
      expect(verifyVisitorToken(token, KEY)).not.toBeNull();
    });
  });

  it("flags renewal past half of the TTL", () => {
    const p = verifyVisitorToken(issueVisitorToken(base), KEY)!;
    expect(shouldRenew(p)).toBe(false);
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 13 * 60 * 60 * 1000);
    expect(shouldRenew(p)).toBe(true);
  });
});

describe("helpers", () => {
  it("fingerprints keys stably and distinctly, without leaking the key", () => {
    const fp = widgetKeyFingerprint(KEY);
    expect(fp).toBe(widgetKeyFingerprint(KEY));
    expect(fp).not.toBe(widgetKeyFingerprint("fiq_live_" + "c".repeat(32)));
    expect(KEY).not.toContain(fp);
  });

  it("generates unique visitor ids", () => {
    expect(generateVisitorId()).not.toBe(generateVisitorId());
    expect(generateVisitorId()).toMatch(/^v_/);
  });
});
