import { NextRequest, NextResponse } from "next/server";
import { getAnalytics } from "@/lib/db/operations";
import { getDefaultTenantId } from "@/lib/db/get-default-tenant";

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.nextUrl.searchParams.get("tenant_id") || await getDefaultTenantId();
    const analytics = await getAnalytics(tenantId);
    return NextResponse.json(analytics);
  } catch (error) {
    console.error("[API] Error fetching analytics:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
