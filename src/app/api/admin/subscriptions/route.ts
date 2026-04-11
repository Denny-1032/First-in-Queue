import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

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

    const monthlyRecurring = subscriptions?.reduce((sum, s) => {
      if (s.status === "active" && s.plan_id === "basic") return sum + 499;
      if (s.status === "active" && s.plan_id === "business") return sum + 1699;
      return sum;
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
