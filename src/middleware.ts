import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/api/rate-limit";

function getAuthSecret(): string {
  return process.env.AUTH_TOKEN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "fiq-fallback-secret-change-me";
}

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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rate limit API routes (except webhooks — external services need unrestricted access)
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

    // Protect tenant API routes with user auth (validate signature)
    const isPublicApi = pathname.startsWith("/api/auth/") || pathname.startsWith("/api/webhook") || pathname.startsWith("/api/webhooks/") || pathname.startsWith("/api/voice/webhook") || pathname.startsWith("/api/voice/inbound") || pathname.startsWith("/api/voice/twilio-status") || pathname.startsWith("/api/admin") || pathname.startsWith("/api/setup") || pathname === "/api/voice/web-call";
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

  // Protect admin dashboard routes — validate signed admin token
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const adminToken = request.cookies.get("fiq-admin-auth")?.value;
    if (!adminToken || !(await isValidSignedToken(adminToken))) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Protect business dashboard routes — validate signed user token
  if (pathname.startsWith("/dashboard")) {
    const authToken = request.cookies.get("fiq-auth")?.value;
    if (!authToken || !(await isValidSignedToken(authToken))) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/api/:path*"],
};
