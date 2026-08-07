import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getAuthSecret } from "@/lib/auth/secret";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    // Support multiple admin emails via comma-separated env var or fallback to single
    const adminEmailsEnv = process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "admin@firstinqueue.com";
    const adminEmails = adminEmailsEnv.split(",").map(e => e.trim().toLowerCase());

    // The admin panel administers EVERY tenant, so it must never fall back to a
    // credential that is published in this repo. Missing config is a hard stop in
    // production; locally we keep the dev default but say so loudly.
    const configuredPassword = process.env.ADMIN_PASSWORD;
    if (!configuredPassword && process.env.NODE_ENV === "production") {
      console.error("[Admin] ADMIN_PASSWORD is not set — refusing all admin logins.");
      return NextResponse.json(
        { error: "Admin access is not configured on this deployment" },
        { status: 503 }
      );
    }
    if (!configuredPassword) {
      console.warn("[Admin] ADMIN_PASSWORD not set — using the development default.");
    }
    const adminPassword = configuredPassword || "FiQ@dmin2024!";

    // Check if email is in admin list and password matches
    if (!adminEmails.includes(email.toLowerCase()) || password !== adminPassword) {
      return NextResponse.json({ error: "Invalid admin credentials" }, { status: 401 });
    }

    // Generate a real signed admin token
    const adminSecret = getAuthSecret();
    const payload = Buffer.from(JSON.stringify({ email, role: "superadmin", iat: Date.now() })).toString("base64url");
    const sig = crypto.createHmac("sha256", adminSecret).update(payload).digest("base64url");
    const adminToken = `${payload}.${sig}`;

    const response = NextResponse.json({
      user: { email, name: "FiQ Admin", role: "superadmin" },
      message: "Admin login successful",
    });

    response.cookies.set("fiq-admin-auth", adminToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 12, // 12 hours
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[Admin Auth] Login error:", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
