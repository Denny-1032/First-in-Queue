import { NextRequest, NextResponse } from "next/server";
import { getConversations } from "@/lib/db/operations";
import { requireSession, AuthError } from "@/lib/auth/session";
import type { ConversationStatus } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const session = await requireSession();
    const tenantId = session.tenantId;
    const status = searchParams.get("status") as ConversationStatus | null;
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const result = await getConversations(tenantId, status || undefined, limit, offset);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[API] Error fetching conversations:", error);
    return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 });
  }
}
