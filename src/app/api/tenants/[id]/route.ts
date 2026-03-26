import { NextRequest, NextResponse } from "next/server";
import { getTenantById } from "@/lib/db/operations";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenant = await getTenantById(id);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }
    return NextResponse.json(tenant);
  } catch (error) {
    console.error("[API] Error fetching tenant:", error);
    return NextResponse.json({ error: "Failed to fetch tenant" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Fetch existing tenant to merge config
    const existing = await getTenantById(id);
    if (!existing) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Deep merge config: existing config + incoming config fields
    const mergedConfig = body.config
      ? { ...existing.config, ...body.config }
      : existing.config;

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      config: mergedConfig,
    };
    if (body.name) updatePayload.name = body.name;
    if (body.slug) updatePayload.slug = body.slug;

    const { data, error } = await getSupabaseAdmin()
      .from("tenants")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[API] Error updating tenant:", error);
      return NextResponse.json({ error: "Failed to update tenant" }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error("[API] Error updating tenant:", error);
    return NextResponse.json({ error: "Failed to update tenant" }, { status: 500 });
  }
}
