import { NextRequest, NextResponse } from "next/server";
import { getAnalytics } from "@/lib/db/operations";
import { requireSession, AuthError } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const tenantId = session.tenantId;
    const analytics = await getAnalytics(tenantId);
    return NextResponse.json(analytics);
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[API] Error fetching analytics:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
