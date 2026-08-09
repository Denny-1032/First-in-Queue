import { describe, it, expect, beforeAll } from "vitest";
import crypto from "crypto";

const SECRET = crypto.randomBytes(32).toString("base64");

// The module reads the env var at import time.
process.env.LIPILA_WEBHOOK_SECRET = SECRET;

let verifyWebhook: typeof import("./webhook").verifyWebhook;
let readWebhookHeaders: typeof import("./webhook").readWebhookHeaders;

beforeAll(async () => {
  ({ verifyWebhook, readWebhookHeaders } = await import("./webhook"));
});

const BODY = JSON.stringify({ referenceId: "abc123", status: "Successful", amount: 499 });

function sign(id: string, timestamp: string, body: string, secret = SECRET): string {
  return (
    "v1," +
    crypto
      .createHmac("sha256", Buffer.from(secret, "base64"))
      .update(`${id}.${timestamp}.${body}`)
      .digest("base64")
  );
}

function nowTs(): string {
  return String(Math.floor(Date.now() / 1000));
}

describe("verifyWebhook", () => {
  it("accepts a correctly signed payload", () => {
    const ts = nowTs();
    const result = verifyWebhook(BODY, {
      id: "evt_1",
      timestamp: ts,
      signature: sign("evt_1", ts, BODY),
    });
    expect(result).toEqual({ ok: true, webhookId: "evt_1" });
  });

  it("accepts when one of several space-delimited signatures matches", () => {
    const ts = nowTs();
    const rotating = `${sign("evt_1", ts, BODY, crypto.randomBytes(32).toString("base64"))} ${sign("evt_1", ts, BODY)}`;
    const result = verifyWebhook(BODY, { id: "evt_1", timestamp: ts, signature: rotating });
    expect(result.ok).toBe(true);
  });

  it("rejects a body that was tampered with after signing", () => {
    const ts = nowTs();
    const signature = sign("evt_1", ts, BODY);
    // The attack this guards: flip Failed to Successful and keep the signature.
    const tampered = JSON.stringify({ referenceId: "abc123", status: "Successful", amount: 49900 });
    const result = verifyWebhook(tampered, { id: "evt_1", timestamp: ts, signature });
    expect(result).toEqual({ ok: false, reason: "signature mismatch" });
  });

  it("rejects a signature computed with the wrong secret", () => {
    const ts = nowTs();
    const result = verifyWebhook(BODY, {
      id: "evt_1",
      timestamp: ts,
      signature: sign("evt_1", ts, BODY, crypto.randomBytes(32).toString("base64")),
    });
    expect(result.ok).toBe(false);
  });

  it("rejects a replay older than 5 minutes", () => {
    const ts = String(Math.floor(Date.now() / 1000) - 6 * 60);
    const result = verifyWebhook(BODY, {
      id: "evt_1",
      timestamp: ts,
      signature: sign("evt_1", ts, BODY),
    });
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toMatch(/old/);
  });

  it("rejects when the signature header is absent", () => {
    const result = verifyWebhook(BODY, { id: "evt_1", timestamp: nowTs(), signature: null });
    expect(result.ok).toBe(false);
  });

  it("does not treat a signature bound to another event id as valid", () => {
    const ts = nowTs();
    const result = verifyWebhook(BODY, {
      id: "evt_2",
      timestamp: ts,
      signature: sign("evt_1", ts, BODY),
    });
    expect(result.ok).toBe(false);
  });
});

describe("readWebhookHeaders", () => {
  it("pulls the three Lipila headers", () => {
    const headers = new Headers({
      "webhook-id": "evt_9",
      "webhook-timestamp": "1700000000",
      "webhook-signature": "v1,abc",
    });
    expect(readWebhookHeaders(headers)).toEqual({
      id: "evt_9",
      timestamp: "1700000000",
      signature: "v1,abc",
    });
  });
});
