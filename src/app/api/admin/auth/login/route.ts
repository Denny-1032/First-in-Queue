import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    // Admin credentials — in production use env vars or a proper auth system
    const adminEmail = process.env.ADMIN_EMAIL || "admin@firstinqueue.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "FiQ@dmin2024!";

    if (email !== adminEmail || password !== adminPassword) {
      return NextResponse.json({ error: "Invalid admin credentials" }, { status: 401 });
    }

    const response = NextResponse.json({
      user: { email, name: "FiQ Admin", role: "superadmin" },
      message: "Admin login successful",
    });

    response.cookies.set("fiq-admin-auth", "admin-token-secure", {
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
