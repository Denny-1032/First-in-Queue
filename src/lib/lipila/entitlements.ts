import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getPlanOrFree, type PlanDefinition } from "./plans";

// =============================================
// Plan entitlements
// ---------------------------------------------
// v2 gates on CAPABILITY, not volume (pricing-model-v2 §4): what separates Free
// from Pro is branding removal and whether WhatsApp/voice/actions exist at all,
// not a message quota.
//
// Every function here fails SAFE to Free. A gate that cannot read the plan must
// hand out the LEAST capable one - the failure mode of guessing Pro is giving
// away paid capability to everyone the moment the database hiccups.
// =============================================

/** The plan a tenant is currently entitled under. Falls back to Free. */
export async function getTenantPlan(tenantId: string): Promise<PlanDefinition> {
  try {
    const { data: sub } = await getSupabaseAdmin()
      .from("subscriptions")
      .select("plan_id")
      .eq("tenant_id", tenantId)
      .in("status", ["active", "trialing"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return getPlanOrFree(sub?.plan_id);
  } catch (e) {
    console.error("[Entitlements] getTenantPlan failed, defaulting to Free:", e);
    return getPlanOrFree(null);
  }
}

/**
 * Should the widget show "Powered by First in Queue"?
 *
 * Free cannot remove it. The property's own `show_branding` flag is only
 * allowed to turn branding ON, never off, unless the plan permits it - the flag
 * is editable from the dashboard, so a Free tenant could otherwise clear it and
 * keep the badge off. This is the server's answer and it overrides the stored
 * value.
 */
export async function resolveShowBranding(
  tenantId: string,
  propertyShowBranding: unknown
): Promise<boolean> {
  const plan = await getTenantPlan(tenantId);
  if (!plan.brandingRemovable) return true;
  return propertyShowBranding !== false;
}
