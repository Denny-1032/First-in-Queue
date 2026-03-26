import { NextRequest, NextResponse } from "next/server";
import { getTenantById, upsertTenant } from "@/lib/db/operations";
import { setTenantActive, updateTenantCredentials } from "@/lib/db/admin-operations";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const tenant = await getTenantById(id);
    if (!tenant) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }
    return NextResponse.json(tenant);
  } catch (error) {
    console.error("[Admin API] Error fetching client:", error);
    return NextResponse.json({ error: "Failed to fetch client" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Handle activation/deactivation
    if (typeof body.is_active === "boolean") {
      const result = await setTenantActive(id, body.is_active);
      if (!result) {
        return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
      }
      return NextResponse.json(result);
    }

    // Handle credential updates
    if (body.whatsapp_phone_number_id || body.whatsapp_access_token || body.whatsapp_business_account_id || body.openai_api_key) {
      const creds: Record<string, string> = {};
      if (body.whatsapp_phone_number_id) creds.whatsapp_phone_number_id = body.whatsapp_phone_number_id;
      if (body.whatsapp_access_token) creds.whatsapp_access_token = body.whatsapp_access_token;
      if (body.whatsapp_business_account_id) creds.whatsapp_business_account_id = body.whatsapp_business_account_id;
      if (body.openai_api_key) creds.openai_api_key = body.openai_api_key;
      const result = await updateTenantCredentials(id, creds);
      if (!result) {
        return NextResponse.json({ error: "Failed to update credentials" }, { status: 500 });
      }
      return NextResponse.json(result);
    }

    // Handle general config updates
    const result = await upsertTenant({ id, ...body });
    if (!result) {
      return NextResponse.json({ error: "Failed to update client" }, { status: 500 });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("[Admin API] Error updating client:", error);
    return NextResponse.json({ error: "Failed to update client" }, { status: 500 });
  }
}
