import { NextRequest, NextResponse } from "next/server";
import { requireSession, AuthError } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { generateWidgetKey } from "@/lib/properties/keys";
import { KEY_ROTATION_GRACE_MS } from "@/lib/properties/visitor-token";

// Reissue a property's public widget key.
//
// Rotation is stateless: visitor tokens carry a fingerprint of the key they
// were issued under (`kf`), and verifyVisitorToken() rejects a stale
// fingerprint once KEY_ROTATION_GRACE_MS has elapsed since the token was
// issued. So there is nothing to store for the old key — open chats drain, new
// ones need the new snippet.
//
// The customer MUST update their site's snippet: after the grace window the old
// key is simply unknown, and /api/widget/config 404s.

const UNIQUE_VIOLATION = "23505";

export async function POST(_request: NextRequest, ctx: RouteContext<"/api/properties/[id]/rotate-key">) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;

    const db = getSupabaseAdmin();

    for (let attempt = 0; attempt < 2; attempt++) {
      const { data, error } = await db
        .from("properties")
        .update({ widget_key: generateWidgetKey(), updated_at: new Date().toISOString() })
        // The tenant_id filter is the authorization check: without it any
        // signed-in user could rotate any other business's key and break
        // their live widget.
        .eq("id", id)
        .eq("tenant_id", session.tenantId)
        .select("id, name, widget_key, updated_at")
        .maybeSingle();

      if (!error) {
        if (!data) return NextResponse.json({ error: "Property not found" }, { status: 404 });
        return NextResponse.json({
          property: data,
          grace_period_ms: KEY_ROTATION_GRACE_MS,
        });
      }
      if (error.code !== UNIQUE_VIOLATION) {
        console.error("[API/properties] rotate failed:", error.message);
        return NextResponse.json({ error: "Failed to rotate key" }, { status: 500 });
      }
    }

    console.error("[API/properties] widget key collided twice on rotate");
    return NextResponse.json({ error: "Failed to rotate key" }, { status: 500 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[API/properties] rotate error:", error);
    return NextResponse.json({ error: "Failed to rotate key" }, { status: 500 });
  }
}
