import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { requireSession, AuthError } from "@/lib/auth/session";

/**
 * GET /api/subscriptions
 * Returns the active subscription for the authenticated tenant.
 * Automatically marks expired subscriptions.
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

    // Check if subscription has expired
    const now = new Date();
    const periodEnd = new Date(subscription.current_period_end);
    const daysRemaining = Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysRemaining <= 0 && subscription.status === "active") {
      // Mark as expired
      await supabase
        .from("subscriptions")
        .update({ status: "expired" })
        .eq("id", subscription.id);
      
      subscription.status = "expired";
      console.log(`[Subscriptions] Marked subscription ${subscription.id} as expired`);
    }

    return NextResponse.json({ 
      subscription,
      daysRemaining: Math.max(0, daysRemaining)
    });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[Subscriptions] Error:", error);
    return NextResponse.json({ error: "Failed to fetch subscription" }, { status: 500 });
  }
}

/**
 * DELETE /api/subscriptions
 * Cancels the active subscription for the authenticated tenant.
 */
export async function DELETE() {
  try {
    const session = await requireSession();
    const tenantId = session.tenantId;
    const supabase = getSupabaseAdmin();

    // Find active subscription
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("id, plan_id")
      .eq("tenant_id", tenantId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!subscription) {
      return NextResponse.json({ error: "No active subscription found" }, { status: 404 });
    }

    // Don't allow cancelling free tier
    if (subscription.plan_id === "free") {
      return NextResponse.json({ error: "Cannot cancel free tier" }, { status: 400 });
    }

    // Cancel subscription
    await supabase
      .from("subscriptions")
      .update({ status: "cancelled" })
      .eq("id", subscription.id);

    console.log(`[Subscriptions] Cancelled subscription ${subscription.id} for tenant ${tenantId}`);

    return NextResponse.json({ 
      success: true,
      message: "Subscription cancelled successfully"
    });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[Subscriptions] Cancel error:", error);
    return NextResponse.json({ error: "Failed to cancel subscription" }, { status: 500 });
  }
}
