import { NextRequest, NextResponse } from "next/server";
import { requireSession, AuthError } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/server";

// Remove or re-default one saved payment method.
//
// `.eq("tenant_id", session.tenantId)` on every query IS the authorization
// check — without it, a signed-in user could delete another tenant's details.

export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<"/api/payments/methods/[id]">
) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;

    const { error } = await getSupabaseAdmin()
      .from("saved_payment_methods")
      .delete()
      .eq("id", id)
      .eq("tenant_id", session.tenantId);

    if (error) {
      console.error("[API/payments/methods] delete failed:", error.message);
      return NextResponse.json({ error: "Failed to remove payment method" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[API/payments/methods] delete error:", error);
    return NextResponse.json({ error: "Failed to remove payment method" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/payments/methods/[id]">
) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;
    const body = await request.json().catch(() => null);

    if (body?.is_default !== true) {
      return NextResponse.json({ error: "Only is_default: true is supported" }, { status: 400 });
    }

    const db = getSupabaseAdmin();

    // A partial unique index enforces one default per tenant, so the old one
    // has to be cleared before the new one is set or the update collides.
    const { error: clearError } = await db
      .from("saved_payment_methods")
      .update({ is_default: false })
      .eq("tenant_id", session.tenantId)
      .eq("is_default", true);

    if (clearError) {
      console.error("[API/payments/methods] clear default failed:", clearError.message);
      return NextResponse.json({ error: "Failed to update payment method" }, { status: 500 });
    }

    const { data, error } = await db
      .from("saved_payment_methods")
      .update({ is_default: true })
      .eq("id", id)
      .eq("tenant_id", session.tenantId)
      .select("id, method, phone_number, email, first_name, last_name, is_default")
      .maybeSingle();

    if (error) {
      console.error("[API/payments/methods] set default failed:", error.message);
      return NextResponse.json({ error: "Failed to update payment method" }, { status: 500 });
    }
    if (!data) return NextResponse.json({ error: "Payment method not found" }, { status: 404 });

    return NextResponse.json({ method: data });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[API/payments/methods] update error:", error);
    return NextResponse.json({ error: "Failed to update payment method" }, { status: 500 });
  }
}
