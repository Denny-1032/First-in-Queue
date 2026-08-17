import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

// RETIRED (§9 block 15). This was an open single-tenant bootstrap that created a
// tenant from env WhatsApp creds — a "setup", not a signup, and a standing risk
// (§1.3). Real multi-tenant signup now lives at /signup → /api/auth/signup, and
// this route is no longer in the proxy's public allow-list (it requires a
// signed-in session). POST is gone; GET remains only as the dashboard's authed
// "is my tenant set up?" status check, scoped to the caller's own tenant.

export async function POST() {
  return NextResponse.json(
    {
      error: "This endpoint has been retired. Create an account at /signup.",
      code: "SETUP_RETIRED",
    },
    { status: 410 }
  );
}

export async function GET(request: NextRequest) {
  try {
    const db = getSupabaseAdmin();

    // Resolve the caller's own tenant from the session token. Middleware already
    // requires a valid fiq-auth cookie to reach this route.
    const authToken = request.cookies.get("fiq-auth")?.value;
    if (authToken) {
      try {
        const [payloadB64] = authToken.split(".");
        if (payloadB64) {
          const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
          const resolvedTenantId =
            payload.tenantId ||
            (payload.userId
              ? (await db.from("users").select("tenant_id").eq("id", payload.userId).single()).data
                  ?.tenant_id
              : null);

          if (resolvedTenantId) {
            const { data: tenant } = await db
              .from("tenants")
              .select("id, name, config, is_active")
              .eq("id", resolvedTenantId)
              .single();

            if (tenant) {
              const hasCompletedSetup = !!(
                tenant.config?.business_name && tenant.config.business_name !== "Your Business"
              );
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
        // Fall through to the not-set-up response.
      }
    }

    // No resolvable tenant for this session — never leak another tenant's row.
    return NextResponse.json({ setup: false });
  } catch (error) {
    console.error("[Setup] Error checking setup:", error);
    return NextResponse.json({ setup: false, error: "Failed to check setup" }, { status: 500 });
  }
}
