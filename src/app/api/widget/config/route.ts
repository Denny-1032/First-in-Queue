import { NextRequest, NextResponse } from "next/server";
import { resolveByKey, widgetJson, corsHeaders, checkBurst } from "@/lib/properties/guard";
import { getTenantById } from "@/lib/db/operations";
import { isOutsideOperatingHours } from "@/lib/engine/handler";

// Boot configuration for the widget loader.
// Branding lives server-side so a customer can restyle from the dashboard
// without editing their site again.
// See docs/phase1-spec-widget-and-onboarding.md §4.4.

const DEFAULT_BRANDING = {
  primary_color: "#03A84E",
  text_color: "#ffffff",
  position: "bottom-right",
  title: "Chat with us",
  welcome_message: "👋 Hi! How can we help?",
  suggested_messages: ["I have a question", "Tell me more"],
  show_branding: true,
  response_delay_ms: 600,
  launcher: "bubble",
  logo_url: null as string | null,
  offline_message: null as string | null,
};

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request.headers.get("origin")) });
}

export async function GET(request: NextRequest) {
  try {
    const key = new URL(request.url).searchParams.get("key");
    const guard = await resolveByKey(request, key);
    if (!guard.ok) return guard.response;

    const { property, origin } = guard;

    if (!(await checkBurst(`cfg:${property.id}`, 600, 60))) {
      return widgetJson({ error: "Too many requests" }, origin, { status: 429 });
    }

    const tenant = await getTenantById(property.tenant_id);
    const branding = { ...DEFAULT_BRANDING, ...(property.branding || {}) };

    // Explicit allowlist. Never spread the tenant or property row — both carry
    // secrets (openai_api_key, whatsapp_access_token).
    return widgetJson(
      {
        property_id: property.id,
        name: property.name,
        branding,
        online: tenant ? !isOutsideOperatingHours(tenant) : true,
        locale: "en",
      },
      origin
    );
  } catch (error) {
    console.error("[Widget/config] error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
