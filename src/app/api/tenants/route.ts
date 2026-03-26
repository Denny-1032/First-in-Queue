import { NextRequest, NextResponse } from "next/server";
import { getAllTenants, upsertTenant } from "@/lib/db/operations";

export async function GET() {
  try {
    const tenants = await getAllTenants();
    return NextResponse.json(tenants);
  } catch (error) {
    console.error("[API] Error fetching tenants:", error);
    return NextResponse.json({ error: "Failed to fetch tenants" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const tenant = await upsertTenant(body);
    if (!tenant) {
      return NextResponse.json({ error: "Failed to create tenant" }, { status: 500 });
    }
    return NextResponse.json(tenant, { status: 201 });
  } catch (error) {
    console.error("[API] Error creating tenant:", error);
    return NextResponse.json({ error: "Failed to create tenant" }, { status: 500 });
  }
}
