import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/api/rate-limit";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rate limit API routes (except webhook — WhatsApp needs unrestricted access)
  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/webhook")) {
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

    const response = NextResponse.next();
    response.headers.set("X-RateLimit-Remaining", String(remaining));
    return response;
  }

  // Protect dashboard routes — check for auth cookie
  if (pathname.startsWith("/dashboard")) {
    const authToken = request.cookies.get("wavely-auth")?.value;

    // If no auth token, redirect to login
    if (!authToken) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
};
