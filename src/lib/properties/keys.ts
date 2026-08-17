import crypto from "crypto";

// =============================================
// Widget keys and domain allowlisting
// ---------------------------------------------
// The widget key is PUBLIC by definition — it sits in the customer's page
// source. Anyone can copy it. `allowed_domains` is what stops a copied key
// being used from someone else's site to burn the property's AI credits.
// See docs/phase1-spec-widget-and-onboarding.md §3.3 and §6.
// =============================================

const KEY_PREFIX = "fiq_live_";
/** Characters after the prefix. Changing this invalidates every key already
 *  issued and the WordPress plugin's regex — see wordpress-plugin.test.ts. */
const KEY_LENGTH = 32;
const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/**
 * Generate a public widget key: `fiq_live_` + 32 base62 characters of CSPRNG
 * entropy. The prefix makes keys greppable by secret scanners and instantly
 * identifiable in a support ticket.
 *
 * Drawn by rejection sampling rather than `byte % 62`: 256 is not a multiple of
 * 62, so the naive form makes the first eight characters of the alphabet
 * measurably more likely. The bias is small against 32 characters of base62,
 * but rejecting the tail costs nothing.
 */
export function generateWidgetKey(): string {
  // 62 * 4 = 248, so bytes at or above the cutoff would skew the distribution.
  const CUTOFF = 248;
  const out: string[] = [];
  while (out.length < KEY_LENGTH) {
    // Over-generate; some bytes get rejected.
    const bytes = crypto.randomBytes(KEY_LENGTH);
    for (let i = 0; i < bytes.length && out.length < KEY_LENGTH; i++) {
      if (bytes[i] < CUTOFF) out.push(BASE62[bytes[i] % 62]);
    }
  }
  return KEY_PREFIX + out.join("");
}

export function isWidgetKeyShaped(key: string): boolean {
  return typeof key === "string" && new RegExp(`^${KEY_PREFIX}[0-9A-Za-z]{${KEY_LENGTH}}$`).test(key);
}

// --- Domain allowlisting -------------------------------------------------
//
// These live in ./allowlist so they can be imported by proxy.ts, which
// runs on the Edge runtime and must not pull in the node `crypto` above.
// Re-exported here so existing import sites keep working.

export {
  normalizeDomain,
  deriveAllowedDomains,
  isOriginAllowed,
  corsOriginFor,
  frameAncestorsFor,
} from "./allowlist";
