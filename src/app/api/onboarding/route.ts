import { NextRequest, NextResponse } from "next/server";
import { requireSession, AuthError } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import {
  getTenantConfig,
  readOnboarding,
  patchOnboarding,
  mergeTenantConfig,
} from "@/lib/onboarding/state";
import { trackEvent } from "@/lib/analytics/track";
import type { OnboardingState, BusinessConfig } from "@/types";

// =============================================
// Onboarding wizard state (§7).
// ---------------------------------------------
// Dashboard-authenticated (middleware requires the fiq-auth cookie). tenant_id
// always comes from the session — the wizard can only ever read and write its
// OWN tenant's onboarding progress. See src/lib/onboarding/state.ts.
// =============================================

export async function GET() {
  try {
    const session = await requireSession();
    const config = await getTenantConfig(getSupabaseAdmin(), session.tenantId);
    return NextResponse.json({ onboarding: readOnboarding(config) });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[API/onboarding] get error:", error);
    return NextResponse.json({ error: "Failed to load onboarding state" }, { status: 500 });
  }
}

/**
 * Body: `{ onboarding?: Partial<OnboardingState>, config?: Partial<BusinessConfig> }`.
 * Either or both may be present. `config` is filtered to a whitelist of chat
 * behaviour keys by mergeTenantConfig, so the wizard can seed an industry
 * template but never touch server-owned fields.
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = (await request.json().catch(() => null)) as {
      onboarding?: Partial<OnboardingState>;
      config?: Partial<BusinessConfig>;
    } | null;

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const db = getSupabaseAdmin();

    // Apply the config merge first so a later onboarding patch (which reloads
    // the config) sees it, and neither write clobbers the other's key.
    if (body.config) {
      await mergeTenantConfig(db, session.tenantId, body.config);
    }

    // Capture the step we're leaving before the patch overwrites it, so the
    // funnel records completions rather than arrivals (§10).
    const previousStep = body.onboarding?.step
      ? readOnboarding(await getTenantConfig(db, session.tenantId)).step
      : null;

    const onboarding = body.onboarding
      ? await patchOnboarding(db, session.tenantId, body.onboarding)
      : readOnboarding(await getTenantConfig(db, session.tenantId));

    if (
      body.onboarding?.step !== undefined &&
      previousStep !== null &&
      body.onboarding.step > previousStep
    ) {
      await trackEvent(session.tenantId, "wizard_step_completed", {
        step: previousStep,
        next_step: body.onboarding.step,
      });
    }

    return NextResponse.json({ onboarding });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[API/onboarding] patch error:", error);
    return NextResponse.json({ error: "Failed to save onboarding state" }, { status: 500 });
  }
}
