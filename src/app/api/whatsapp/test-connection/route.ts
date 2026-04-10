import { NextResponse } from "next/server";
import { requireSession, AuthError } from "@/lib/auth/session";
import { getTenantById } from "@/lib/db/operations";

export async function GET() {
  try {
    const session = await requireSession();
    const tenant = await getTenantById(session.tenantId);

    if (!tenant) {
      return NextResponse.json({ status: "error", message: "Tenant not found" }, { status: 404 });
    }

    const hasToken = !!tenant.whatsapp_access_token;
    const hasPhoneId = !!tenant.whatsapp_phone_number_id;

    if (!hasToken || !hasPhoneId) {
      return NextResponse.json({
        status: "not_configured",
        message: "WhatsApp credentials are not set for this business.",
        details: {
          has_token: hasToken,
          has_phone_id: hasPhoneId,
          tenant_id: tenant.id,
          tenant_name: tenant.name,
        },
      });
    }

    // Test the token by calling WhatsApp Business Account API
    const tokenPrefix = tenant.whatsapp_access_token.slice(0, 10) + "...";
    try {
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${tenant.whatsapp_phone_number_id}`,
        {
          headers: { Authorization: `Bearer ${tenant.whatsapp_access_token}` },
        }
      );

      if (res.ok) {
        const data = await res.json();
        return NextResponse.json({
          status: "connected",
          message: "WhatsApp connection is working.",
          details: {
            tenant_id: tenant.id,
            tenant_name: tenant.name,
            phone_number_id: tenant.whatsapp_phone_number_id,
            display_phone: data.display_phone_number || "unknown",
            verified_name: data.verified_name || "unknown",
            token_prefix: tokenPrefix,
          },
        });
      } else {
        const errBody = await res.json().catch(() => ({}));
        return NextResponse.json({
          status: "token_invalid",
          message: `WhatsApp API returned ${res.status}. The access token may be expired or invalid.`,
          details: {
            tenant_id: tenant.id,
            tenant_name: tenant.name,
            http_status: res.status,
            token_prefix: tokenPrefix,
            error: errBody?.error?.message || "Unknown error",
          },
        });
      }
    } catch (fetchErr) {
      return NextResponse.json({
        status: "network_error",
        message: "Could not reach WhatsApp API.",
        details: {
          tenant_id: tenant.id,
          error: fetchErr instanceof Error ? fetchErr.message : "Unknown",
        },
      });
    }
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[API] WhatsApp test-connection error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
