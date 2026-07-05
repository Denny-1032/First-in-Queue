import { NextResponse } from "next/server";
import { requireSession, AuthError } from "@/lib/auth/session";
import { getTenantById } from "@/lib/db/operations";

/**
 * Returns the tenant's shareable WhatsApp deep link (wa.me).
 * The display phone number is fetched from the Graph API using the tenant's
 * phone_number_id, since only the ID is stored locally.
 */
export async function GET() {
  try {
    const session = await requireSession();
    const tenant = await getTenantById(session.tenantId);

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }
    if (!tenant.whatsapp_access_token || !tenant.whatsapp_phone_number_id) {
      return NextResponse.json({
        status: "not_configured",
        message: "WhatsApp is not connected for this business yet.",
      });
    }

    const res = await fetch(
      `https://graph.facebook.com/v21.0/${tenant.whatsapp_phone_number_id}?fields=display_phone_number,verified_name`,
      { headers: { Authorization: `Bearer ${tenant.whatsapp_access_token}` } }
    );

    if (!res.ok) {
      return NextResponse.json({
        status: "error",
        message: "Could not fetch your WhatsApp number. The access token may be expired.",
      });
    }

    const data = await res.json();
    const displayPhone: string = data.display_phone_number || "";
    // wa.me links require digits only (no +, spaces, or dashes)
    const phoneDigits = displayPhone.replace(/\D/g, "");

    if (!phoneDigits) {
      return NextResponse.json({
        status: "error",
        message: "WhatsApp did not return a phone number for this account.",
      });
    }

    return NextResponse.json({
      status: "ok",
      phone: displayPhone,
      verified_name: data.verified_name || tenant.name,
      wa_link: `https://wa.me/${phoneDigits}`,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[API] WhatsApp link error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
