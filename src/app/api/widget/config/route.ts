import { NextRequest, NextResponse } from "next/server";
import { resolveByKey, widgetJson, corsHeaders, checkBurst } from "@/lib/properties/guard";
import { getTenantById } from "@/lib/db/operations";
import { isOutsideOperatingHours } from "@/lib/engine/handler";
import { resolveWidgetVoice } from "@/lib/voice/widget-voice";
import { resolveShowBranding } from "@/lib/lipila/entitlements";

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
  voice_enabled: false,
  voice_agent_id: null as string | null,
  whatsapp_number: null as string | null,
};

/** Keys resolved into their own blocks below — not echoed inside `branding`. */
const PRIVATE_BRANDING_KEYS = ["voice_agent_id", "whatsapp_number"];

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
    const branding: Record<string, unknown> = {
      ...DEFAULT_BRANDING,
      ...(property.branding || {}),
    };

    // Plan, minutes, toggle and agent are all resolved server-side; the browser
    // only learns whether the call button should render. See widget-voice.ts.
    const voice = await resolveWidgetVoice(property.tenant_id, property.branding);
    branding.voice_enabled = voice.enabled;

    // Branding removal is a paid capability (pricing-model-v2 §4). The stored
    // flag is editable from the dashboard, so a Free tenant could clear it and
    // keep the badge off; the plan decides here, server-side, every request.
    branding.show_branding = await resolveShowBranding(
      property.tenant_id,
      (property.branding || {}).show_branding
    );

    // The number IS public - it is meant to be dialled - but it belongs beside
    // voice as a channel, not inside the styling blob.
    const whatsappNumber =
      typeof branding.whatsapp_number === "string" ? branding.whatsapp_number : null;

    for (const k of PRIVATE_BRANDING_KEYS) delete branding[k];

    // Explicit allowlist. Never spread the tenant or property row — both carry
    // secrets (openai_api_key, whatsapp_access_token).
    return widgetJson(
      {
        property_id: property.id,
        name: property.name,
        branding,
        voice: { enabled: voice.enabled },
        whatsapp: {
          enabled: !!whatsappNumber,
          number: whatsappNumber,
        },
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
