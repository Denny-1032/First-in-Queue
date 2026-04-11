import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { requireSession, AuthError } from "@/lib/auth/session";
import { generateAuthToken } from "@/lib/auth/password";
import { templates } from "@/lib/config/templates";

/**
 * POST /api/tenants/create
 * Creates a new business (tenant) for the currently logged-in user.
 * Links the user to it via user_tenants, creates a default agent + free subscription,
 * and switches the session to the new workspace.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const { businessName } = await request.json();

    if (!businessName || typeof businessName !== "string" || businessName.trim().length < 2) {
      return NextResponse.json({ error: "Business name is required (min 2 characters)" }, { status: 400 });
    }

    const db = getSupabaseAdmin();
    const name = businessName.trim();

    // Fetch user info for the agent record
    const { data: user } = await db
      .from("users")
      .select("name, email")
      .eq("id", session.userId)
      .single();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Create the new tenant
    const template = templates.ecommerce;
    const slug = name.replace(/[^a-z0-9]/gi, "-").toLowerCase() + "-" + Date.now().toString(36);

    const { data: tenant, error: tenantError } = await db
      .from("tenants")
      .insert({
        name,
        slug,
        whatsapp_phone_number_id: "",
        whatsapp_access_token: "",
        whatsapp_business_account_id: "",
        openai_api_key: "",
        config: { ...template, business_name: name },
        is_active: true,
      })
      .select()
      .single();

    if (tenantError || !tenant) {
      console.error("[Tenants] Create error:", tenantError);
      return NextResponse.json({ error: "Failed to create business" }, { status: 500 });
    }

    // Link user to new tenant as owner
    const { error: junctionError } = await db.from("user_tenants").insert({
      user_id: session.userId,
      tenant_id: tenant.id,
      role: "owner",
    });
    if (junctionError) {
      console.error("[Tenants] user_tenants insert error:", junctionError);
      // Clean up tenant
      await db.from("tenants").delete().eq("id", tenant.id);
      return NextResponse.json({ error: "Failed to link workspace" }, { status: 500 });
    }

    // Create default agent for this tenant
    await db.from("agents").insert({
      tenant_id: tenant.id,
      name: user.name,
      email: user.email,
      role: "admin",
      is_online: true,
      max_concurrent_chats: 10,
      user_id: session.userId,
    });

    // Create free tier subscription
    const now = new Date();
    const freePeriodEnd = new Date(now);
    freePeriodEnd.setFullYear(freePeriodEnd.getFullYear() + 10);
    await db.from("subscriptions").insert({
      tenant_id: tenant.id,
      plan_id: "free",
      status: "active",
      current_period_start: now.toISOString(),
      current_period_end: freePeriodEnd.toISOString(),
      messages_used: 0,
      voice_minutes_used: 0,
    });

    // Update users.tenant_id to the new workspace and switch session
    await db.from("users").update({ tenant_id: tenant.id }).eq("id", session.userId);

    const token = generateAuthToken(session.userId, session.email, tenant.id);
    const response = NextResponse.json({
      success: true,
      tenant_id: tenant.id,
      tenant_name: tenant.name,
    }, { status: 201 });

    response.cookies.set("fiq-auth", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });

    return response;
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[Tenants] Create error:", error);
    return NextResponse.json({ error: "Failed to create business" }, { status: 500 });
  }
}
