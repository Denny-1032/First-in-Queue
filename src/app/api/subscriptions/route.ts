import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { requireSession, AuthError } from "@/lib/auth/session";
import { ensureFreeSubscription } from "@/lib/trial-helpers";

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

    const fetchActive = async () =>
      (
        await supabase
          .from("subscriptions")
          .select("*")
          .eq("tenant_id", tenantId)
          .in("status", ["active", "trialing"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      ).data;

    const daysLeft = (periodEnd: string) => {
      const now = new Date();
      return Math.max(
        0,
        Math.ceil((new Date(periodEnd).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      );
    };

    let subscription = await fetchActive();

    // No active plan (paid plan expired/cancelled and none replaced it) ->
    // provision Free so the tenant always has a working, limited plan instead
    // of being left with nothing.
    if (!subscription) {
      await ensureFreeSubscription(tenantId);
      subscription = await fetchActive();
      if (!subscription) {
        return NextResponse.json({ subscription: null, plan: null });
      }
      return NextResponse.json({ subscription, daysRemaining: daysLeft(subscription.current_period_end) });
    }

    // Paid plan lapsed -> mark expired and drop to Free.
    if (new Date(subscription.current_period_end) <= new Date() && subscription.status === "active") {
      await supabase.from("subscriptions").update({ status: "expired" }).eq("id", subscription.id);
      console.log(`[Subscriptions] Marked subscription ${subscription.id} as expired`);
      await ensureFreeSubscription(tenantId);
      subscription = (await fetchActive()) ?? subscription;
    }

    return NextResponse.json({
      subscription,
      daysRemaining: daysLeft(subscription.current_period_end),
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
