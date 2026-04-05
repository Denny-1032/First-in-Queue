import { cookies } from "next/headers";
import { parseAuthToken } from "./password";

export interface AuthSession {
  userId: string;
  email: string;
  tenantId: string;
}

/**
 * Extract and validate the authenticated user session from the fiq-auth cookie.
 * Returns null if not authenticated or token is invalid/expired.
 */
export async function getSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("fiq-auth")?.value;
  if (!token) return null;

  const parsed = parseAuthToken(token);
  if (!parsed || !parsed.tenantId) return null;

  return {
    userId: parsed.userId,
    email: parsed.email,
    tenantId: parsed.tenantId,
  };
}

/**
 * Require an authenticated session. Throws a structured error if not authenticated.
 * Use in API routes: const session = await requireSession();
 */
export async function requireSession(): Promise<AuthSession> {
  const session = await getSession();
  if (!session) {
    throw new AuthError("Authentication required", 401);
  }
  return session;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}
