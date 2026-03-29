import { NextRequest, NextResponse } from "next/server";
import { createScheduledMessage, getScheduledMessages } from "@/lib/db/operations";
import { getDefaultTenantId } from "@/lib/db/get-default-tenant";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tenantId = searchParams.get("tenant_id") || await getDefaultTenantId();
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");

    const messages = await getScheduledMessages(tenantId, status || undefined, limit);
    return NextResponse.json(messages);
  } catch (error) {
    console.error("[API] Error fetching scheduled messages:", error);
    return NextResponse.json({ error: "Failed to fetch scheduled messages" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const tenantId = body.tenant_id || await getDefaultTenantId();

    if (!body.customer_phone || !body.scheduled_at) {
      return NextResponse.json(
        { error: "customer_phone and scheduled_at are required" },
        { status: 400 }
      );
    }

    const message = await createScheduledMessage({
      tenant_id: tenantId,
      conversation_id: body.conversation_id || null,
      customer_phone: body.customer_phone,
      message_type: body.message_type || "text",
      content: body.content || { text: body.text || "" },
      scheduled_at: body.scheduled_at,
      status: "pending",
      max_retries: body.max_retries ?? 3,
      category: body.category || "custom",
      metadata: body.metadata || {},
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error("[API] Error creating scheduled message:", error);
    return NextResponse.json({ error: "Failed to create scheduled message" }, { status: 500 });
  }
}
