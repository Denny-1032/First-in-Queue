import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getPlanById } from "@/lib/lipila/plans";

export async function GET() {
  try {
    const db = getSupabaseAdmin();

    // Get subscriptions with tenant names
    const { data: subscriptions, error } = await db
      .from("subscriptions")
      .select("*, tenants(name)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Admin API] Error fetching subscriptions:", error);
      return NextResponse.json({ error: "Failed to fetch subscriptions" }, { status: 500 });
    }

    // Calculate stats
    const activePaid = subscriptions?.filter(
      (s) => s.status === "active" || s.status === "trialing"
    ).length || 0;

    // Priced from PLANS rather than hardcoded ids, so legacy subscriptions
    // still inside a paid period are counted at what they actually pay, and a
    // new plan cannot be added without its revenue appearing here.
    const monthlyRecurring = subscriptions?.reduce((sum, s) => {
      if (s.status !== "active") return sum;
      return sum + (getPlanById(s.plan_id)?.priceZMW ?? 0);
    }, 0) || 0;

    return NextResponse.json({
      subscriptions: subscriptions || [],
      stats: {
        total: subscriptions?.length || 0,
        active: activePaid,
        trialing: subscriptions?.filter((s) => s.status === "trialing").length || 0,
        expired: subscriptions?.filter((s) => s.status === "expired").length || 0,
        estimated_monthly_revenue: monthlyRecurring,
      },
    });
  } catch (error) {
    console.error("[Admin API] Error fetching subscriptions:", error);
    return NextResponse.json({ error: "Failed to fetch subscriptions" }, { status: 500 });
  }
}
