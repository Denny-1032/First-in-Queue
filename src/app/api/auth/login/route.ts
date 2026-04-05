import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { verifyPassword, generateAuthToken } from "@/lib/auth/password";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const db = getSupabaseAdmin();

    // Look up user by email
    const { data: user, error } = await db
      .from("users")
      .select("id, name, email, password_hash, tenant_id, role")
      .eq("email", email.toLowerCase())
      .single();

    if (error || !user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // Verify password
    if (!verifyPassword(password, user.password_hash)) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const token = generateAuthToken(user.id, user.email, user.tenant_id);
    const response = NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, tenant_id: user.tenant_id },
      message: "Login successful",
    });

    response.cookies.set("fiq-auth", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[Auth] Login error:", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
