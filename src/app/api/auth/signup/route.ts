import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { hashPassword, generateAuthToken } from "@/lib/auth/password";
import { templates } from "@/lib/config/templates";

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    const db = getSupabaseAdmin();

    // Check if email already exists
    const { data: existing } = await db
      .from("users")
      .select("id")
      .eq("email", email.toLowerCase())
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Create tenant for this business owner
    const template = templates.ecommerce;
    const { data: tenant, error: tenantError } = await db
      .from("tenants")
      .insert({
        name: name + "'s Business",
        slug: email.split("@")[0].replace(/[^a-z0-9]/gi, "-").toLowerCase(),
        whatsapp_phone_number_id: "",
        whatsapp_access_token: "",
        whatsapp_business_account_id: "",
        openai_api_key: "",
        config: { ...template, business_name: name + "'s Business" },
        is_active: true,
      })
      .select()
      .single();

    if (tenantError) {
      console.error("[Auth] Tenant creation error:", tenantError);
      return NextResponse.json({ error: "Failed to create business account" }, { status: 500 });
    }

    // Create user record linked to tenant
    const hashedPw = hashPassword(password);
    const { data: user, error: userError } = await db
      .from("users")
      .insert({
        name,
        email: email.toLowerCase(),
        password_hash: hashedPw,
        tenant_id: tenant.id,
        role: "owner",
      })
      .select()
      .single();

    if (userError) {
      console.error("[Auth] User creation error:", userError);
      // Clean up tenant if user creation fails
      await db.from("tenants").delete().eq("id", tenant.id);
      return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
    }

    // Create default agent for this tenant
    await db.from("agents").insert({
      tenant_id: tenant.id,
      name,
      email: email.toLowerCase(),
      role: "admin",
      is_online: true,
      max_concurrent_chats: 10,
    });

    // Create free tier subscription with 2 voice minutes and 5 messages
    // Users get limited free credits to test, then must upgrade to paid plan
    await db.from("subscriptions").insert({
      tenant_id: tenant.id,
      plan_id: "free",
      status: "active",
      messages_used: 0,
      voice_minutes_used: 0,
    });

    const token = generateAuthToken(user.id, email.toLowerCase());
    const response = NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, tenant_id: tenant.id },
      message: "Account created successfully",
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
    console.error("[Auth] Signup error:", error);
    return NextResponse.json({ error: "Signup failed" }, { status: 500 });
  }
}
