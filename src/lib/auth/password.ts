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

export function generateAuthToken(userId: string, email: string): string {
  const payload = JSON.stringify({ userId, email, iat: Date.now() });
  return Buffer.from(payload).toString("base64url");
}

export function parseAuthToken(token: string): { userId: string; email: string; iat: number } | null {
  try {
    const payload = JSON.parse(Buffer.from(token, "base64url").toString());
    if (!payload.userId || !payload.email) return null;
    return payload;
  } catch {
    return null;
  }
}
