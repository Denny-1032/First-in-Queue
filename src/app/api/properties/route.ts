import { NextRequest, NextResponse } from "next/server";
import { requireSession, AuthError } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { generateWidgetKey } from "@/lib/properties/keys";
import { parseCreateProperty } from "@/lib/properties/input";

// =============================================
// Property CRUD for the signed-in tenant.
// ---------------------------------------------
// UNLIKE /api/widget/*, these routes are dashboard-authenticated: middleware.ts
// does not exempt /api/properties, so the fiq-auth cookie is already required
// by the time a handler runs. tenant_id comes from the session — never the
// body, which would let any signed-in user mint keys against another tenant.
// See docs/phase1-spec-widget-and-onboarding.md §3.
// =============================================

/** Explicit column list. Never select('*') on properties. */
const PROPERTY_FIELDS =
  "id, tenant_id, name, widget_key, site_url, allowed_domains, branding, install_status, first_seen_at, last_seen_at, is_active, created_at, updated_at";

const UNIQUE_VIOLATION = "23505";

export async function GET() {
  try {
    const session = await requireSession();

    const { data, error } = await getSupabaseAdmin()
      .from("properties")
      .select(PROPERTY_FIELDS)
      .eq("tenant_id", session.tenantId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[API/properties] list failed:", error.message);
      return NextResponse.json({ error: "Failed to load properties" }, { status: 500 });
    }

    return NextResponse.json({ properties: data ?? [] });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[API/properties] list error:", error);
    return NextResponse.json({ error: "Failed to load properties" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();

    const raw = await request.json().catch(() => null);
    const parsed = parseCreateProperty(raw);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const db = getSupabaseAdmin();

    // widget_key is UNIQUE. A collision at 32 base62 characters is not a real
    // event, but retrying once costs nothing and turns a 500 into a success.
    for (let attempt = 0; attempt < 2; attempt++) {
      const { data, error } = await db
        .from("properties")
        .insert({
          tenant_id: session.tenantId,
          name: parsed.value.name,
          widget_key: generateWidgetKey(),
          site_url: parsed.value.site_url,
          allowed_domains: parsed.value.allowed_domains,
          branding: parsed.value.branding,
        })
        .select(PROPERTY_FIELDS)
        .single();

      if (!error) return NextResponse.json({ property: data }, { status: 201 });
      if (error.code !== UNIQUE_VIOLATION) {
        console.error("[API/properties] create failed:", error.message);
        return NextResponse.json({ error: "Failed to create property" }, { status: 500 });
      }
    }

    console.error("[API/properties] widget key collided twice");
    return NextResponse.json({ error: "Failed to create property" }, { status: 500 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[API/properties] create error:", error);
    return NextResponse.json({ error: "Failed to create property" }, { status: 500 });
  }
}
