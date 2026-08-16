import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { getAuthSecret } from "@/lib/auth/secret";
import { frameAncestorsFor } from "@/lib/properties/allowlist";
import { canonicalDeckPath } from "@/lib/demo/decks";

// Edge-compatible base64url helpers
function base64urlEncode(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmacSign(secret: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return base64urlEncode(sig);
}

// Constant-time comparison safe for Edge Runtime
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

async function isValidSignedToken(token: string): Promise<boolean> {
  try {
    const [payloadB64, signature] = token.split(".");
    if (!payloadB64 || !signature) return false;
    const expected = await hmacSign(getAuthSecret(), payloadB64);
    return safeEqual(signature, expected);
  } catch {
    return false;
  }
}

/**
 * Look up a property's allowed_domains by widget key, for the frame-ancestors
 * header. Uses a direct REST fetch rather than the supabase-js client so the
 * Edge bundle stays small.
 *
 * The key is not shape-checked first: the query is parameterised and a bad key
 * simply returns no rows. Duplicating `isWidgetKeyShaped`'s regex here (it
 * lives in keys.ts, which pulls in node `crypto`) would be a third copy to keep
 * in sync for no security gain.
 *
 * Fails CLOSED (returns []) so a lookup failure denies third-party framing
 * rather than opening it, matching the "empty allowlist = deny all" invariant.
 */
async function lookupAllowedDomains(key: string): Promise<string[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return [];

  try {
    const res = await fetch(
      `${url}/rest/v1/properties?select=allowed_domains&is_active=eq.true` +
        `&widget_key=eq.${encodeURIComponent(key)}&limit=1`,
      {
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
        cache: "no-store",
      }
    );
    if (!res.ok) return [];
    const rows = (await res.json()) as Array<{ allowed_domains?: string[] }>;
    return rows[0]?.allowed_domains ?? [];
  } catch {
    return [];
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- Demo decks: one canonical casing ---
  //
  // /ZRA and /Pacra 404 without this: the route is prerendered from an exact
  // list with dynamicParams disabled. Falls through for everything else, so a
  // bare "/dashboard" still reaches its auth check below.
  const rootSegment = pathname.slice(1);
  if (rootSegment && !rootSegment.includes("/")) {
    const canonical = canonicalDeckPath(rootSegment);
    if (canonical && canonical !== rootSegment) {
      const url = request.nextUrl.clone();
      url.pathname = `/${canonical}`;
      return NextResponse.redirect(url, 308);
    }
  }

  // --- Widget documents: framable, but only by the property's own domains ---
  //
  // next.config.ts deliberately withholds X-Frame-Options: DENY from /widget/*
  // (DENY blocks ALL framing, including same-origin, which made the widget
  // impossible to embed anywhere). CSP frame-ancestors is the replacement.
  if (pathname.startsWith("/widget/")) {
    const response = NextResponse.next();
    const key = request.nextUrl.searchParams.get("key");

    // The legacy voice embed (/widget/iframe?tenantId=…&agentId=…) carries no
    // widget key, so there is no property to resolve an allowlist from. Leave
    // it unrestricted — that is its pre-existing behaviour, and tightening it
    // here would break voice installs already live on customer sites.
    if (!key) return response;

    const domains = await lookupAllowedDomains(key);
    response.headers.set(
      "Content-Security-Policy",
      `frame-ancestors ${frameAncestorsFor(domains)}`
    );
    return response;
  }

  // Rate limit API routes (except webhooks - external services need unrestricted access)
  const isWebhook =
    pathname.startsWith("/api/webhook") ||
    pathname.startsWith("/api/webhooks/") ||
    pathname === "/api/voice/twilio-status";
  if (pathname.startsWith("/api/") && !isWebhook) {
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const { allowed, remaining, resetIn } = checkRateLimit(ip, 120);

    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests", code: "RATE_LIMITED" },
        {
          status: 429,
          headers: {
            "X-RateLimit-Remaining": "0",
            "Retry-After": String(Math.ceil(resetIn / 1000)),
          },
        }
      );
    }

    // Protect admin API routes with admin auth (validate signature)
    if (pathname.startsWith("/api/admin") && !pathname.startsWith("/api/admin/auth")) {
      const adminToken = request.cookies.get("fiq-admin-auth")?.value;
      if (!adminToken || !(await isValidSignedToken(adminToken))) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    // Protect tenant API routes with user auth (validate signature).
    //
    // /api/cron/* is exempt because cron callers (Vercel cron, GitHub Actions)
    // have no session cookie — they authenticate with a CRON_SECRET bearer token
    // that each cron route checks itself. Without this exemption every cron
    // returned 401 and the jobs silently never ran.
    const isPublicApi = pathname.startsWith("/api/auth/") || pathname.startsWith("/api/webhook") || pathname.startsWith("/api/webhooks/") || pathname.startsWith("/api/voice/webhook") || pathname.startsWith("/api/voice/inbound") || pathname.startsWith("/api/voice/twilio-status") || pathname.startsWith("/api/voice/telnyx-status") || pathname.startsWith("/api/admin") || pathname.startsWith("/api/cron/") || pathname.startsWith("/api/voice/web-call") || pathname.startsWith("/api/voice/fiq-support") || pathname.startsWith("/api/widget/") || pathname.startsWith("/api/debug/") || pathname.startsWith("/api/team/invite/accept");
    if (!isPublicApi) {
      const authToken = request.cookies.get("fiq-auth")?.value;
      if (!authToken || !(await isValidSignedToken(authToken))) {
        return NextResponse.json({ error: "Authentication required" }, { status: 401 });
      }
    }

    const response = NextResponse.next();
    response.headers.set("X-RateLimit-Remaining", String(remaining));
    return response;
  }

  // Protect admin dashboard routes - validate signed admin token
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const adminToken = request.cookies.get("fiq-admin-auth")?.value;
    if (!adminToken || !(await isValidSignedToken(adminToken))) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Protect business dashboard routes - validate signed user token
  if (pathname.startsWith("/dashboard")) {
    const authToken = request.cookies.get("fiq-auth")?.value;
    if (!authToken || !(await isValidSignedToken(authToken))) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Protect the onboarding wizard - it needs the signup session to call the
  // authed onboarding/property/crawl APIs. Bounce a signed-out visitor to /signup.
  if (pathname.startsWith("/onboarding")) {
    const authToken = request.cookies.get("fiq-auth")?.value;
    if (!authToken || !(await isValidSignedToken(authToken))) {
      return NextResponse.redirect(new URL("/signup", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Root-level single segment, so a miscased deck path reaches the redirect
    // above. Anything that is not a deck falls straight through.
    "/:segment",
    "/dashboard/:path*",
    "/admin/:path*",
    "/onboarding/:path*",
    "/api/:path*",
    "/widget/:path*",
  ],
};
