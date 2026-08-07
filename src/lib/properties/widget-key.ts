import { randomBytes } from "crypto";

// Public widget keys. They live in the customer's page source, so they are
// identifiers, not secrets — but they gate AI-message credits, so they must be
// unguessable. Prefixed so secret scanners and support tickets can spot them.
// See docs/phase1-spec-widget-and-onboarding.md §3 (B2).

const KEY_PREFIX = "fiq_live_";
const REVOKED_PREFIX = "fiq_revoked_";
const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const DEFAULT_LENGTH = 43; // ~256 bits of entropy over base62

/**
 * Generate `length` base62 characters using rejection sampling, so there is no
 * modulo bias favouring the first characters of the alphabet.
 */
function base62Random(length: number): string {
  const out: string[] = [];
  // 62 * 4 = 248: bytes >= 248 would bias the distribution, so reject them.
  const cutoff = 248;
  while (out.length < length) {
    const buf = randomBytes(length); // over-generate; some bytes get rejected
    for (let i = 0; i < buf.length && out.length < length; i++) {
      const b = buf[i];
      if (b < cutoff) out.push(BASE62[b % 62]);
    }
  }
  return out.join("");
}

/** A fresh public widget key, e.g. "fiq_live_a1B2c3...". */
export function generateWidgetKey(): string {
  return KEY_PREFIX + base62Random(DEFAULT_LENGTH);
}

export function isWidgetKey(value: string): boolean {
  return value.startsWith(KEY_PREFIX);
}

/**
 * Mark a rotated key as revoked. Callers keep the revoked key readable during a
 * grace window so open chats issued under it can drain before it stops working.
 */
export function revokedKeyMarker(oldKey: string): string {
  return REVOKED_PREFIX + oldKey.slice(KEY_PREFIX.length);
}

export { KEY_PREFIX, REVOKED_PREFIX };
