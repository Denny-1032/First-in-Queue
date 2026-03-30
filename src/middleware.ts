import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/api/rate-limit";

export function middleware(request: NextRequest) {
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

    // Protect admin API routes with admin auth
    if (pathname.startsWith("/api/admin") && !pathname.startsWith("/api/admin/auth")) {
      const adminToken = request.cookies.get("fiq-admin-auth")?.value;
      if (!adminToken) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const response = NextResponse.next();
    response.headers.set("X-RateLimit-Remaining", String(remaining));
    return response;
  }

  // Protect admin dashboard routes — check for admin auth cookie
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const adminToken = request.cookies.get("fiq-admin-auth")?.value;
    if (!adminToken) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Protect business dashboard routes — check for auth cookie
  if (pathname.startsWith("/dashboard")) {
    const authToken = request.cookies.get("fiq-auth")?.value;
    if (!authToken) {
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
