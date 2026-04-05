import crypto from "crypto";

const ITERATIONS = 100000;
const KEY_LENGTH = 64;
const DIGEST = "sha512";

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(32).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const verify = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString("hex");
  return hash === verify;
}

const AUTH_SECRET = process.env.AUTH_TOKEN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "fiq-fallback-secret-change-me";
const TOKEN_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function generateAuthToken(userId: string, email: string, tenantId?: string): string {
  const payload = JSON.stringify({ userId, email, tenantId, iat: Date.now() });
  const payloadB64 = Buffer.from(payload).toString("base64url");
  const signature = crypto.createHmac("sha256", AUTH_SECRET).update(payloadB64).digest("base64url");
  return `${payloadB64}.${signature}`;
}

export function parseAuthToken(token: string): { userId: string; email: string; tenantId?: string; iat: number } | null {
  try {
    const [payloadB64, signature] = token.split(".");
    if (!payloadB64 || !signature) return null;

    // Verify HMAC signature
    const expected = crypto.createHmac("sha256", AUTH_SECRET).update(payloadB64).digest("base64url");
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;

    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
    if (!payload.userId || !payload.email) return null;

    // Check expiry
    if (Date.now() - payload.iat > TOKEN_MAX_AGE_MS) return null;

    return payload;
  } catch {
    return null;
  }
}
