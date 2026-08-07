import { getSupabaseAdmin } from "@/lib/supabase/server";

// =============================================
// Activation funnel instrumentation (§10).
// ---------------------------------------------
// Every event lands in `analytics_events` (tenant_id, event_type, event_data).
//
// Two rules:
//   1. Tracking NEVER throws. A analytics write must not be able to fail a
//      signup, a crawl, or a customer's message. Errors are logged and swallowed.
//   2. `snippet_copied` and `widget_installed` both carry `property_id`, because
//      the drop-off between them is the number that says whether Phase 1 worked.
//
// Activation = `widget_installed`; time-to-activation is measured from
// `signup_completed`.
// =============================================

export type FunnelEvent =
  | "signup_started"
  | "signup_completed"
  | "wizard_step_completed"
  | "crawl_completed"
  | "snippet_copied"
  | "instructions_emailed"
  | "widget_installed"
  | "widget_origin_rejected"
  | "first_conversation"
  | "first_ai_resolution";

/** Best-effort analytics write. Never throws, never blocks a user flow. */
export async function trackEvent(
  tenantId: string,
  eventType: FunnelEvent,
  eventData: Record<string, unknown> = {}
): Promise<void> {
  try {
    const { error } = await getSupabaseAdmin()
      .from("analytics_events")
      .insert({ tenant_id: tenantId, event_type: eventType, event_data: eventData });
    if (error) console.warn(`[analytics] ${eventType} failed:`, error.message);
  } catch (e) {
    console.warn(`[analytics] ${eventType} threw:`, e instanceof Error ? e.message : e);
  }
}

/**
 * Fire an event only the first time it ever happens for a tenant (used by
 * `first_conversation` / `first_ai_resolution`). Racy by nature — two concurrent
 * first messages could both write — which is acceptable for a funnel metric and
 * cheaper than a unique index.
 */
export async function trackOnce(
  tenantId: string,
  eventType: FunnelEvent,
  eventData: Record<string, unknown> = {}
): Promise<void> {
  try {
    const { count, error } = await getSupabaseAdmin()
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("event_type", eventType);
    if (error) return; // Can't confirm it's the first — skip rather than double-count.
    if ((count ?? 0) > 0) return;
  } catch {
    return;
  }
  await trackEvent(tenantId, eventType, eventData);
}
