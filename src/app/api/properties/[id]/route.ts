import { NextRequest, NextResponse } from "next/server";
import { requireSession, AuthError } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { parseUpdateProperty, sanitizeBranding } from "@/lib/properties/input";

// Edit / read / delete a single property owned by the signed-in tenant.
//
// Every query is scoped by `.eq("tenant_id", session.tenantId)` — that filter
// IS the authorization check. Without it a signed-in user could edit or delete
// another business's live widget config. See §3 / §6.

const PROPERTY_FIELDS =
  "id, tenant_id, name, widget_key, site_url, allowed_domains, branding, install_status, first_seen_at, last_seen_at, is_active, created_at, updated_at";

export async function GET(_request: NextRequest, ctx: RouteContext<"/api/properties/[id]">) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;

    const { data, error } = await getSupabaseAdmin()
      .from("properties")
      .select(PROPERTY_FIELDS)
      .eq("id", id)
      .eq("tenant_id", session.tenantId)
      .maybeSingle();

    if (error) {
      console.error("[API/properties] get failed:", error.message);
      return NextResponse.json({ error: "Failed to load property" }, { status: 500 });
    }
    if (!data) return NextResponse.json({ error: "Property not found" }, { status: 404 });

    return NextResponse.json({ property: data });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[API/properties] get error:", error);
    return NextResponse.json({ error: "Failed to load property" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/properties/[id]">) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;

    const raw = await request.json().catch(() => null);
    const parsed = parseUpdateProperty(raw);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const db = getSupabaseAdmin();

    // A branding patch merges onto the property's CURRENT branding, so an edit
    // to one key can't wipe the rest. Load it first — scoped to the tenant, so
    // this doubles as an existence + ownership check.
    let brandingUpdate: Record<string, unknown> | undefined;
    if (parsed.value.brandingPatch) {
      const { data: current } = await db
        .from("properties")
        .select("branding")
        .eq("id", id)
        .eq("tenant_id", session.tenantId)
        .maybeSingle();
      if (!current) return NextResponse.json({ error: "Property not found" }, { status: 404 });
      brandingUpdate = sanitizeBranding(
        parsed.value.brandingPatch,
        (current.branding as Record<string, unknown>) || {}
      );
    }

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (parsed.value.name !== undefined) update.name = parsed.value.name;
    if (parsed.value.site_url !== undefined) update.site_url = parsed.value.site_url;
    if (parsed.value.allowed_domains !== undefined) update.allowed_domains = parsed.value.allowed_domains;
    if (parsed.value.is_active !== undefined) update.is_active = parsed.value.is_active;
    if (brandingUpdate !== undefined) update.branding = brandingUpdate;

    const { data, error } = await db
      .from("properties")
      .update(update)
      .eq("id", id)
      .eq("tenant_id", session.tenantId)
      .select(PROPERTY_FIELDS)
      .maybeSingle();

    if (error) {
      console.error("[API/properties] update failed:", error.message);
      return NextResponse.json({ error: "Failed to update property" }, { status: 500 });
    }
    if (!data) return NextResponse.json({ error: "Property not found" }, { status: 404 });

    return NextResponse.json({ property: data });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[API/properties] update error:", error);
    return NextResponse.json({ error: "Failed to update property" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/properties/[id]">) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;

    // conversations.property_id is ON DELETE SET NULL (migration 014), so past
    // web conversations survive with a null property — the history is not lost.
    const { data, error } = await getSupabaseAdmin()
      .from("properties")
      .delete()
      .eq("id", id)
      .eq("tenant_id", session.tenantId)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("[API/properties] delete failed:", error.message);
      return NextResponse.json({ error: "Failed to delete property" }, { status: 500 });
    }
    if (!data) return NextResponse.json({ error: "Property not found" }, { status: 404 });

    return NextResponse.json({ ok: true, id: data.id });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[API/properties] delete error:", error);
    return NextResponse.json({ error: "Failed to delete property" }, { status: 500 });
  }
}
