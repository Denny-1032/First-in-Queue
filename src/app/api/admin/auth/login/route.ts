import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    // Support multiple admin emails via comma-separated env var or fallback to single
    const adminEmailsEnv = process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "admin@firstinqueue.com";
    const adminEmails = adminEmailsEnv.split(",").map(e => e.trim().toLowerCase());
    
    // Default admin password
    const adminPassword = process.env.ADMIN_PASSWORD || "FiQ@dmin2024!";

    // Check if email is in admin list and password matches
    if (!adminEmails.includes(email.toLowerCase()) || password !== adminPassword) {
      return NextResponse.json({ error: "Invalid admin credentials" }, { status: 401 });
    }

    // Generate a real signed admin token
    const adminSecret = process.env.AUTH_TOKEN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "fiq-fallback-secret-change-me";
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
