import type { SupabaseClient } from "@supabase/supabase-js";
import type { BusinessConfig, OnboardingState } from "@/types";

// =============================================
// Onboarding wizard state (§7).
// ---------------------------------------------
// The wizard's progress lives inside the tenant's `config` JSON, under an
// `onboarding` key, so a closed tab resumes where it left off with no extra
// table. Every function here is tenant-scoped by an explicit `.eq("tenant_id")`
// / `.eq("id", tenantId)` — that filter IS the authorization boundary, exactly
// like the property routes. Callers pass a tenantId that came from the SESSION,
// never the request body.
//
// Reads/merges are last-write-wins on the whole `config` blob. The wizard is a
// single linear flow driven by one user, so there is no concurrent-writer
// problem to guard against here.
// =============================================

const TOTAL_STEPS = 8; // steps 0-7

/** Total number of wizard screens (0-7). Exposed for the progress indicator. */
export function onboardingTotalSteps(): number {
  return TOTAL_STEPS;
}

/** Fetch the tenant's full config blob. Returns null if the tenant is missing. */
export async function getTenantConfig(
  db: SupabaseClient,
  tenantId: string
): Promise<BusinessConfig | null> {
  const { data, error } = await db
    .from("tenants")
    .select("config")
    .eq("id", tenantId)
    .maybeSingle();
  if (error) throw new Error(`Failed to load tenant config: ${error.message}`);
  return (data?.config as BusinessConfig) ?? null;
}

/** Current onboarding state, defaulting to step 0 when the key is absent. */
export function readOnboarding(config: BusinessConfig | null): OnboardingState {
  return config?.onboarding ?? { step: 0 };
}

/**
 * Merge a partial onboarding patch into the tenant's config and persist. The
 * merge is shallow on `onboarding` and one level deep on `onboarding.crawl` so
 * a caller can update crawl status without clobbering entries already stored.
 */
export async function patchOnboarding(
  db: SupabaseClient,
  tenantId: string,
  patch: Partial<OnboardingState>
): Promise<OnboardingState> {
  const config = await getTenantConfig(db, tenantId);
  if (!config) throw new Error("Tenant not found");

  const current = readOnboarding(config);
  const next: OnboardingState = {
    ...current,
    ...patch,
    crawl: patch.crawl ? { ...current.crawl, ...patch.crawl } : current.crawl,
  };

  const nextConfig: BusinessConfig = { ...config, onboarding: next };
  const { error } = await db
    .from("tenants")
    .update({ config: nextConfig })
    .eq("id", tenantId);
  if (error) throw new Error(`Failed to save onboarding state: ${error.message}`);

  return next;
}

/**
 * Merge a partial BusinessConfig patch (e.g. the industry template applied at
 * step 3) into the tenant config, preserving the existing `onboarding` key.
 * Only whitelisted top-level keys are allowed through so a wizard request can
 * never rewrite unrelated behaviour like booking_settings.
 */
const MERGEABLE_CONFIG_KEYS: ReadonlyArray<keyof BusinessConfig> = [
  "business_name",
  "industry",
  "description",
  "personality",
  "welcome_message",
  "languages",
  "default_language",
  "knowledge_base",
  "faqs",
  "quick_replies",
  "custom_instructions",
];

export async function mergeTenantConfig(
  db: SupabaseClient,
  tenantId: string,
  patch: Partial<BusinessConfig>
): Promise<BusinessConfig> {
  const config = await getTenantConfig(db, tenantId);
  if (!config) throw new Error("Tenant not found");

  const next: BusinessConfig = { ...config };
  for (const key of MERGEABLE_CONFIG_KEYS) {
    if (key in patch && patch[key] !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (next as any)[key] = patch[key];
    }
  }

  const { error } = await db.from("tenants").update({ config: next }).eq("id", tenantId);
  if (error) throw new Error(`Failed to save config: ${error.message}`);
  return next;
}
