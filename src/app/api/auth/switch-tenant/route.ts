import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { requireSession, AuthError } from "@/lib/auth/session";
import { generateAuthToken } from "@/lib/auth/password";

/**
 * POST /api/auth/switch-tenant
 * Switches the user's active workspace by reissuing the auth cookie
 * with a different tenantId. Verifies the user belongs to that tenant.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const { tenantId } = await request.json();

    if (!tenantId) {
      return NextResponse.json({ error: "tenantId is required" }, { status: 400 });
    }

    const db = getSupabaseAdmin();

    // Verify the user has access to the requested tenant
    const { data: membership } = await db
      .from("user_tenants")
      .select("tenant_id, role")
      .eq("user_id", session.userId)
      .eq("tenant_id", tenantId)
      .single();

    if (!membership) {
      return NextResponse.json({ error: "You do not have access to this workspace" }, { status: 403 });
    }

    // Update users.tenant_id to track last-used tenant
    await db.from("users").update({ tenant_id: tenantId }).eq("id", session.userId);

    // Reissue cookie with new tenantId
    const token = generateAuthToken(session.userId, session.email, tenantId);
    const response = NextResponse.json({ success: true, tenant_id: tenantId });

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
    console.error("[Auth] Switch tenant error:", error);
    return NextResponse.json({ error: "Failed to switch workspace" }, { status: 500 });
  }
}

/**
 * GET /api/auth/switch-tenant
 * Returns the list of tenants the current user belongs to.
 */
export async function GET() {
  try {
    const session = await requireSession();
    const db = getSupabaseAdmin();

    const { data: memberships } = await db
      .from("user_tenants")
      .select("tenant_id, role, tenants(id, name)")
      .eq("user_id", session.userId);

    const tenants = (memberships || []).map((m) => ({
      id: (m.tenants as unknown as { id: string; name: string })?.id || m.tenant_id,
      name: (m.tenants as unknown as { id: string; name: string })?.name || "Business",
      role: m.role,
    }));

    return NextResponse.json({
      tenants,
      current_tenant_id: session.tenantId,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[Auth] List tenants error:", error);
    return NextResponse.json({ error: "Failed to list workspaces" }, { status: 500 });
  }
}
