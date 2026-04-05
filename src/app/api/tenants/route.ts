import { NextRequest, NextResponse } from "next/server";
import { upsertTenant } from "@/lib/db/operations";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { requireSession, AuthError } from "@/lib/auth/session";

export async function GET() {
  try {
    const session = await requireSession();
    const supabase = getSupabaseAdmin();

    // Only return the tenant belonging to the authenticated user
    const { data, error } = await supabase
      .from("tenants")
      .select("*")
      .eq("id", session.tenantId)
      .single();

    if (error || !data) {
      return NextResponse.json([]);
    }

    return NextResponse.json([data]);
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[API] Error fetching tenants:", error);
    return NextResponse.json({ error: "Failed to fetch tenants" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = await request.json();
    // Ensure tenant_id is bound to the authenticated user's tenant
    body.id = session.tenantId;
    const tenant = await upsertTenant(body);
    if (!tenant) {
      return NextResponse.json({ error: "Failed to update tenant" }, { status: 500 });
    }
    return NextResponse.json(tenant, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[API] Error updating tenant:", error);
    return NextResponse.json({ error: "Failed to update tenant" }, { status: 500 });
  }
}
