import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { verifyPassword, generateAuthToken } from "@/lib/auth/password";

export async function POST(request: NextRequest) {
  try {
    const { email, password, tenantId } = await request.json();

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

    // Fetch all tenants this user belongs to
    const { data: memberships } = await db
      .from("user_tenants")
      .select("tenant_id, role, tenants(id, name)")
      .eq("user_id", user.id);

    // Fall back to users.tenant_id for users not yet migrated to user_tenants
    const tenants = (memberships || []).map((m) => ({
      id: (m.tenants as unknown as { id: string; name: string })?.id || m.tenant_id,
      name: (m.tenants as unknown as { id: string; name: string })?.name || "Business",
      role: m.role,
    }));

    // If no user_tenants rows, use legacy users.tenant_id
    if (tenants.length === 0 && user.tenant_id) {
      const { data: legacyTenant } = await db
        .from("tenants")
        .select("id, name")
        .eq("id", user.tenant_id)
        .single();
      if (legacyTenant) {
        tenants.push({ id: legacyTenant.id, name: legacyTenant.name, role: user.role || "owner" });
        // Back-fill junction table
        await db.from("user_tenants").upsert({
          user_id: user.id,
          tenant_id: legacyTenant.id,
          role: user.role || "owner",
        }, { onConflict: "user_id,tenant_id" });
      }
    }

    // Multiple tenants and caller didn't specify which one → ask them to pick
    if (tenants.length > 1 && !tenantId) {
      return NextResponse.json({
        requires_tenant_selection: true,
        tenants: tenants.map((t) => ({ id: t.id, name: t.name, role: t.role })),
        user: { id: user.id, email: user.email, name: user.name },
      });
    }

    // Resolve which tenant to log into
    const selectedTenantId = tenantId || tenants[0]?.id || user.tenant_id;
    if (!selectedTenantId) {
      return NextResponse.json({ error: "No business associated with this account" }, { status: 400 });
    }

    // Verify user actually belongs to the selected tenant
    if (tenantId && !tenants.some((t) => t.id === tenantId)) {
      return NextResponse.json({ error: "You do not have access to this workspace" }, { status: 403 });
    }

    // Update users.tenant_id to track last-used tenant
    await db.from("users").update({ tenant_id: selectedTenantId }).eq("id", user.id);

    const token = generateAuthToken(user.id, user.email, selectedTenantId);
    const response = NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, tenant_id: selectedTenantId },
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
