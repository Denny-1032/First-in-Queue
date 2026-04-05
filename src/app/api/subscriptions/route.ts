import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { requireSession, AuthError } from "@/lib/auth/session";

/**
 * GET /api/subscriptions
 * Returns the active subscription for the authenticated tenant.
 */
export async function GET() {
  try {
    const session = await requireSession();
    const tenantId = session.tenantId;
    const supabase = getSupabaseAdmin();

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("tenant_id", tenantId)
      .in("status", ["active", "trialing"])
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!subscription) {
      return NextResponse.json({ subscription: null, plan: null });
    }

    return NextResponse.json({ subscription });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[Subscriptions] Error:", error);
    return NextResponse.json({ error: "Failed to fetch subscription" }, { status: 500 });
  }
}
