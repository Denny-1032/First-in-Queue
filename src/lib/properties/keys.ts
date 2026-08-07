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
const KEY_BYTES = 32;
const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/**
 * Generate a public widget key: `fiq_live_` + 32 bytes of CSPRNG entropy in
 * base62. The prefix makes keys greppable by secret scanners and instantly
 * identifiable in a support ticket.
 */
export function generateWidgetKey(): string {
  const bytes = crypto.randomBytes(KEY_BYTES);
  let out = "";
  for (const b of bytes) out += BASE62[b % 62];
  return KEY_PREFIX + out;
}

export function isWidgetKeyShaped(key: string): boolean {
  return typeof key === "string" && new RegExp(`^${KEY_PREFIX}[0-9A-Za-z]{${KEY_BYTES}}$`).test(key);
}

// --- Domain allowlisting -------------------------------------------------
//
// These live in ./allowlist so they can be imported by middleware.ts, which
// runs on the Edge runtime and must not pull in the node `crypto` above.
// Re-exported here so existing import sites keep working.

export {
  normalizeDomain,
  deriveAllowedDomains,
  isOriginAllowed,
  corsOriginFor,
  frameAncestorsFor,
} from "./allowlist";
