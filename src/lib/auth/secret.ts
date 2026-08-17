// =============================================
// One resolver for every HMAC signing secret (session cookies, visitor tokens,
// admin tokens).
//
// Previously each call site ended in `|| "fiq-fallback-secret-change-me"`. That
// constant is public in the repo, so a deployment missing both AUTH_TOKEN_SECRET
// and SUPABASE_SERVICE_ROLE_KEY would sign real session and visitor tokens with a
// value anyone can read — i.e. forgeable auth, failing silently.
//
// In production that is now a hard error. Outside production we keep the shared
// dev constant (so local setup stays frictionless) but warn loudly.
//
// Edge-safe: reads process.env only, no node builtins — the proxy imports this.
// =============================================

const DEV_FALLBACK = "fiq-fallback-secret-change-me";

let warned = false;

/**
 * Resolve the signing secret.
 *
 * @param preferred A channel-specific override checked first (e.g.
 *   `WIDGET_TOKEN_SECRET` for visitor tokens). Falsy values are ignored.
 * @throws In production when no real secret is configured.
 */
export function getAuthSecret(preferred?: string): string {
  const resolved =
    preferred || process.env.AUTH_TOKEN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (resolved) return resolved;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "No signing secret configured. Set AUTH_TOKEN_SECRET (or SUPABASE_SERVICE_ROLE_KEY). " +
        "Refusing to sign tokens with the public development fallback."
    );
  }

  if (!warned) {
    warned = true;
    console.warn(
      "[auth] AUTH_TOKEN_SECRET is not set — signing with the public development fallback. " +
        "This MUST NOT happen in production."
    );
  }
  return DEV_FALLBACK;
}
