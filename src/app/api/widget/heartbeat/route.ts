import { NextRequest, NextResponse } from "next/server";
import { corsHeaders, checkBurst, widgetJson } from "@/lib/properties/guard";
import { isOriginAllowed, isWidgetKeyShaped } from "@/lib/properties/keys";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { trackEvent } from "@/lib/analytics/track";

// Install verification ping (§5). Fired by the loader on first load.
//
// This route deliberately does NOT use resolveByKey: a heartbeat arriving from
// a NON-allowlisted origin is the single most valuable diagnostic in the whole
// wizard ("we saw your widget on blog.example.com — add it?"), so it must be
// recorded rather than rejected.

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request.headers.get("origin")) });
}

export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get("origin");
    const body = (await request.json().catch(() => ({}))) as {
      key?: string;
      page_url?: string;
    };

    if (!body.key || !isWidgetKeyShaped(body.key)) {
      return NextResponse.json({ error: "Missing or malformed widget key" }, { status: 400 });
    }

    const db = getSupabaseAdmin();
    const { data: property } = await db
      .from("properties")
      .select("id, tenant_id, allowed_domains, first_seen_at, install_status")
      .eq("widget_key", body.key)
      .maybeSingle();

    if (!property) {
      return NextResponse.json({ error: "Unknown widget key" }, { status: 404 });
    }

    if (!(await checkBurst(`hb:${property.id}`, 120, 300))) {
      return NextResponse.json({ ok: true, throttled: true }, { status: 200 });
    }

    const allowed = isOriginAllowed(origin, property.allowed_domains as string[]);
    const now = new Date().toISOString();

    if (allowed) {
      await db
        .from("properties")
        .update({
          last_seen_at: now,
          install_status: "verified",
          ...(property.first_seen_at ? {} : { first_seen_at: now }),
          updated_at: now,
        })
        .eq("id", property.id);
    }

    // Recorded either way — this is what powers the verify screen's diagnosis.
    await trackEvent(
      property.tenant_id as string,
      allowed ? "widget_installed" : "widget_origin_rejected",
      {
        property_id: property.id,
        origin: origin ?? null,
        page_url: typeof body.page_url === "string" ? body.page_url.slice(0, 500) : null,
        first_install: !property.first_seen_at,
      }
    );

    if (!allowed) {
      return NextResponse.json(
        { ok: false, reason: "origin_not_allowed", origin: origin ?? null },
        { status: 200 }
      );
    }

    return widgetJson({ ok: true, install_status: "verified" }, origin);
  } catch (error) {
    console.error("[Widget/heartbeat] error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
