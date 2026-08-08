import { NextRequest, NextResponse } from "next/server";

// Shared authorization for /api/cron/* routes.
//
// Middleware exempts /api/cron/* (cron callers have no session cookie), so this
// bearer check IS the authorization for these routes. Two rules matter:
//
//   1. Fail CLOSED in production. An unset CRON_SECRET must not leave a public
//      endpoint that mutates data and emails customers — return 503, never run.
//      Locally (NODE_ENV !== production) an unset secret is tolerated so the
//      jobs can be invoked by hand.
//
//   2. Be whitespace-immune on BOTH sides. The secret is copied by hand into
//      two systems (Vercel env, GitHub Actions secret); either can pick up a
//      trailing newline or space that the other lacks, which silently breaks
//      every run with a 401. Trim both the stored secret and the presented
//      token before comparing.
//
// The comparison is constant-time to avoid leaking the secret via timing.

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Authorize a cron request. Returns a NextResponse to send back when the
 * request is rejected, or null when it is authorized and the caller should
 * proceed.
 *
 * @param label short route name for the server-side log line, e.g. "stale-installs"
 */
export function rejectUnauthorizedCron(request: NextRequest, label: string): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET?.trim();

  if (!cronSecret) {
    if (process.env.NODE_ENV === "production") {
      console.error(`[Cron/${label}] CRON_SECRET is not set — refusing to run.`);
      return NextResponse.json({ error: "Cron secret not configured" }, { status: 503 });
    }
    return null; // dev tolerance
  }

  const auth = request.headers.get("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();

  if (!timingSafeEqual(token, cronSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
