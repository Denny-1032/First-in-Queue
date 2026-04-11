import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { templates } from "@/lib/config/templates";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const industry = body.industry || "ecommerce";
    const template = templates[industry] || templates.ecommerce;
    const db = getSupabaseAdmin();

    // Check if a tenant already exists
    const { data: existing } = await db
      .from("tenants")
      .select("id")
      .limit(1)
      .single();

    if (existing) {
      return NextResponse.json({
        message: "Tenant already exists",
        tenant_id: existing.id,
      });
    }

    // Create default tenant using env vars
    const { data: tenant, error: tenantError } = await db
      .from("tenants")
      .insert({
        name: template.business_name,
        slug: "default",
        whatsapp_phone_number_id: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
        whatsapp_access_token: process.env.WHATSAPP_ACCESS_TOKEN || "",
        whatsapp_business_account_id: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "",
        openai_api_key: process.env.OPENAI_API_KEY || "",
        config: template,
        is_active: true,
      })
      .select()
      .single();

    if (tenantError) {
      console.error("[Setup] Tenant creation error:", tenantError);
      return NextResponse.json({ error: tenantError.message }, { status: 500 });
    }

    // Create a default admin agent
    const { error: agentError } = await db.from("agents").insert({
      tenant_id: tenant.id,
      name: "Admin",
      email: "admin@firstinq.com",
      role: "admin",
      is_online: true,
      max_concurrent_chats: 10,
    });

    if (agentError) {
      console.error("[Setup] Agent creation error:", agentError);
    }

    return NextResponse.json({
      message: "Setup complete",
      tenant_id: tenant.id,
      tenant_name: tenant.name,
      industry,
    }, { status: 201 });
  } catch (error) {
    console.error("[Setup] Error:", error);
    return NextResponse.json({ error: "Setup failed" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const db = getSupabaseAdmin();

    // If user is logged in, check their specific tenant
    const authToken = request.cookies.get("fiq-auth")?.value;
    if (authToken) {
      try {
        // Token format is "payloadB64.signature" — split to decode only the payload
        const [payloadB64] = authToken.split(".");
        if (payloadB64) {
          const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
          // Use tenantId from token (set at login/switch); fall back to users.tenant_id for legacy tokens
          const tenantIdFromToken = payload.tenantId;
          const resolvedTenantId = tenantIdFromToken || (payload.userId ? (await db.from("users").select("tenant_id").eq("id", payload.userId).single()).data?.tenant_id : null);

          if (resolvedTenantId) {
            const { data: tenant } = await db
              .from("tenants")
              .select("id, name, config, is_active")
              .eq("id", resolvedTenantId)
              .single();

            if (tenant) {
              const hasCompletedSetup = !!(tenant.config?.business_name && tenant.config.business_name !== "Your Business");
              return NextResponse.json({
                setup: hasCompletedSetup || tenant.is_active,
                tenant_id: tenant.id,
                tenant_name: tenant.name,
                industry: tenant.config?.industry,
              });
            }
          }
        }
      } catch {
        // Token parse error — fall through to global check
      }
    }

    // Fallback: global tenant check (for first-time /api/setup usage)
    const { data: tenants } = await db
      .from("tenants")
      .select("id, name, config, is_active")
      .limit(1);

    const tenant = tenants?.[0];
    if (!tenant) {
      return NextResponse.json({ setup: false, message: "No tenant configured. POST to /api/setup to create one." });
    }

    return NextResponse.json({
      setup: true,
      tenant_id: tenant.id,
      tenant_name: tenant.name,
      industry: tenant.config?.industry,
    });
  } catch (error) {
    console.error("[Setup] Error checking setup:", error);
    return NextResponse.json({ setup: false, error: "Failed to check setup" }, { status: 500 });
  }
}
