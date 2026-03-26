import { NextRequest, NextResponse } from "next/server";
import { getConversations } from "@/lib/db/operations";
import { getDefaultTenantId } from "@/lib/db/get-default-tenant";
import type { ConversationStatus } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tenantId = searchParams.get("tenant_id") || await getDefaultTenantId();
    const status = searchParams.get("status") as ConversationStatus | null;
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const result = await getConversations(tenantId, status || undefined, limit, offset);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[API] Error fetching conversations:", error);
    return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 });
  }
}
