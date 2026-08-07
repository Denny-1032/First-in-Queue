import { NextRequest, NextResponse } from "next/server";
import { requireSession, AuthError } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getTenantConfig, readOnboarding } from "@/lib/onboarding/state";
import { decideInstallVerdict, type InstallProperty } from "@/lib/onboarding/install-verdict";

// =============================================
// Install diagnosis for the verify screen (§5 step 3/5). Polled every 2s.
// Turns the property's heartbeat state into an actionable verdict:
//   verified        — heartbeat seen from an allowed origin; we're done
//   origin_rejected — heartbeat seen from a NON-allowlisted domain (the single
//                     highest-value diagnostic: "we saw it on X, add it?")
//   waiting         — no heartbeat recorded yet
// Session-scoped: the property is read by id AND tenant_id.
// =============================================

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const db = getSupabaseAdmin();

    const override = request.nextUrl.searchParams.get("property_id");
    let propertyId = override;
    if (!propertyId) {
      const config = await getTenantConfig(db, session.tenantId);
      propertyId = readOnboarding(config).property_id ?? null;
    }
    if (!propertyId) {
      return NextResponse.json({ error: "No property to verify" }, { status: 400 });
    }

    const { data: property } = await db
      .from("properties")
      .select("id, install_status, first_seen_at, last_seen_at, allowed_domains")
      .eq("id", propertyId)
      .eq("tenant_id", session.tenantId)
      .maybeSingle();

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    // Look for a rejected-origin heartbeat we could diagnose. Only consulted
    // when there is no good heartbeat — see decideInstallVerdict.
    const { data: events } = await db
      .from("analytics_events")
      .select("event_data, created_at")
      .eq("tenant_id", session.tenantId)
      .eq("event_type", "widget_origin_rejected")
      .order("created_at", { ascending: false })
      .limit(20);

    const rejected = (events ?? []).find(
      (e) => (e.event_data as { property_id?: string } | null)?.property_id === propertyId
    );
    const rejectedOrigin = rejected
      ? ((rejected.event_data as { origin?: string | null }).origin ?? null)
      : undefined;

    return NextResponse.json(
      decideInstallVerdict(property as InstallProperty, rejectedOrigin)
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[API/onboarding/install-status] error:", error);
    return NextResponse.json({ error: "Failed to check install status" }, { status: 500 });
  }
}
