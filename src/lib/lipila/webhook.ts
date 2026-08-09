// =============================================
// Lipila webhook signature verification
// Docs: https://docs.lipila.io/docs/security/webhook-security.html
// =============================================

import crypto from "crypto";

/**
 * Base64-encoded 32-byte signing key from the Lipila dashboard
 * (Settings -> Webhooks). Not the API key.
 */
const LIPILA_WEBHOOK_SECRET = process.env.LIPILA_WEBHOOK_SECRET || "";

/** Lipila retries for a while; anything older than this is a replay. */
const MAX_AGE_SECONDS = 5 * 60;

export interface LipilaWebhookHeaders {
  id: string | null;
  timestamp: string | null;
  signature: string | null;
}

export type WebhookVerdict =
  | { ok: true; webhookId: string }
  | { ok: false; reason: string };

export function readWebhookHeaders(headers: Headers): LipilaWebhookHeaders {
  return {
    id: headers.get("webhook-id"),
    timestamp: headers.get("webhook-timestamp"),
    signature: headers.get("webhook-signature"),
  };
}

/**
 * Verify a Lipila webhook against the raw request body.
 *
 * The signed content is `{webhook-id}.{webhook-timestamp}.{raw_body}`, HMAC-
 * SHA256 with the base64-decoded secret, base64 encoded, prefixed `v1,`. The
 * `webhook-signature` header may carry several space-delimited signatures
 * during a key rotation, so any match is accepted.
 *
 * `rawBody` must be the bytes as received. Re-serialising the parsed JSON
 * changes key order and whitespace and the signature will never match.
 */
export function verifyWebhook(
  rawBody: string,
  headers: LipilaWebhookHeaders,
  now: Date = new Date()
): WebhookVerdict {
  if (!LIPILA_WEBHOOK_SECRET) {
    return { ok: false, reason: "LIPILA_WEBHOOK_SECRET is not configured" };
  }

  const { id, timestamp, signature } = headers;
  if (!id || !timestamp || !signature) {
    return { ok: false, reason: "missing webhook-id, webhook-timestamp or webhook-signature" };
  }

  const sentAt = Number(timestamp);
  if (!Number.isFinite(sentAt)) {
    return { ok: false, reason: "webhook-timestamp is not a unix timestamp" };
  }

  const ageSeconds = Math.abs(Math.floor(now.getTime() / 1000) - sentAt);
  if (ageSeconds > MAX_AGE_SECONDS) {
    return { ok: false, reason: `webhook is ${ageSeconds}s old (max ${MAX_AGE_SECONDS}s)` };
  }

  let key: Buffer;
  try {
    key = Buffer.from(LIPILA_WEBHOOK_SECRET, "base64");
  } catch {
    return { ok: false, reason: "LIPILA_WEBHOOK_SECRET is not valid base64" };
  }

  const expected =
    "v1," +
    crypto.createHmac("sha256", key).update(`${id}.${timestamp}.${rawBody}`).digest("base64");

  const matched = signature
    .split(" ")
    .map((s) => s.trim())
    .filter(Boolean)
    .some((candidate) => timingSafeEquals(expected, candidate));

  if (!matched) return { ok: false, reason: "signature mismatch" };

  return { ok: true, webhookId: id };
}

/** Constant-time compare that tolerates unequal lengths. */
function timingSafeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
