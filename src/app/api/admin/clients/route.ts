import { NextResponse } from "next/server";
import { getAllTenantsAdmin, getTenantMessageCounts } from "@/lib/db/admin-operations";

export async function GET() {
  try {
    const [tenants, messageCounts] = await Promise.all([
      getAllTenantsAdmin(),
      getTenantMessageCounts(),
    ]);

    // Enrich tenants with message counts
    const enriched = tenants.map((t) => ({
      ...t,
      messages_this_month: messageCounts[t.id] || 0,
      setup_complete: !!(t.whatsapp_phone_number_id && t.whatsapp_access_token),
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("[Admin API] Error fetching clients:", error);
    return NextResponse.json({ error: "Failed to fetch clients" }, { status: 500 });
  }
}
