import crypto from "crypto";
import { getAuthSecret } from "@/lib/auth/secret";

// =============================================
// Visitor session tokens
// ---------------------------------------------
// The widget's endpoints are public and unauthenticated by default
// (src/proxy.ts exempts /api/widget/*). This token is what authorises a
// visitor to read and write ONE conversation.
//
// The security property that matters: every widget request derives its
// tenantId / conversationId from the SIGNED TOKEN, never from the request body.
// Accepting either from the body would be a direct IDOR into other businesses'
// conversations. See docs/phase1-spec-widget-and-onboarding.md §6.
// =============================================

/** Visitor tokens prefer their own secret, then fall back to the shared one.
 *  Resolved per call so a missing secret fails at use, not at import. */
const visitorSecret = () => getAuthSecret(process.env.WIDGET_TOKEN_SECRET);

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
/** After a widget key is rotated, tokens signed under the old key stay valid
 *  this long so open chats don't break mid-conversation. */
export const KEY_ROTATION_GRACE_MS = 60 * 60 * 1000; // 1 hour

export interface VisitorTokenPayload {
  propertyId: string;
  tenantId: string;
  conversationId: string;
  visitorId: string;
  /** Fingerprint of the widget key this token was issued under. */
  kf: string;
  iat: number;
  exp: number;
}

/** Short, non-reversible fingerprint of a widget key. */
export function widgetKeyFingerprint(widgetKey: string): string {
  return crypto.createHash("sha256").update(widgetKey).digest("base64url").slice(0, 12);
}

function sign(payloadB64: string): string {
  return crypto.createHmac("sha256", visitorSecret()).update(payloadB64).digest("base64url");
}

export function issueVisitorToken(
  input: Omit<VisitorTokenPayload, "iat" | "exp" | "kf"> & { widgetKey: string }
): string {
  const now = Date.now();
  const payload: VisitorTokenPayload = {
    propertyId: input.propertyId,
    tenantId: input.tenantId,
    conversationId: input.conversationId,
    visitorId: input.visitorId,
    kf: widgetKeyFingerprint(input.widgetKey),
    iat: now,
    exp: now + TOKEN_TTL_MS,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${payloadB64}.${sign(payloadB64)}`;
}

/**
 * Verify signature, expiry and (when `currentWidgetKey` is supplied) that the
 * token was issued under the property's current key.
 *
 * Returns null on any failure — callers must treat null as "reject the
 * request", never as "fall back to body-supplied ids".
 */
export function verifyVisitorToken(
  token: string | null | undefined,
  currentWidgetKey?: string
): VisitorTokenPayload | null {
  if (!token) return null;
  try {
    const [payloadB64, signature] = token.split(".");
    if (!payloadB64 || !signature) return null;

    const expected = sign(payloadB64);
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    // timingSafeEqual throws on length mismatch — check first.
    if (sigBuf.length !== expBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;

    const payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString()
    ) as VisitorTokenPayload;

    if (!payload.propertyId || !payload.tenantId || !payload.conversationId) return null;

    const now = Date.now();
    if (typeof payload.exp !== "number" || now > payload.exp) return null;

    // Rotated key: honour a short grace window, then reject.
    if (currentWidgetKey) {
      const currentFp = widgetKeyFingerprint(currentWidgetKey);
      if (payload.kf !== currentFp && now - payload.iat > KEY_ROTATION_GRACE_MS) {
        return null;
      }
    }

    return payload;
  } catch {
    return null;
  }
}

/** Token is past halfway through its lifetime — reissue silently. */
export function shouldRenew(payload: VisitorTokenPayload): boolean {
  return Date.now() - payload.iat > TOKEN_TTL_MS / 2;
}

/** Opaque per-browser visitor id, stored in the widget's localStorage. */
export function generateVisitorId(): string {
  return "v_" + crypto.randomBytes(16).toString("base64url");
}
