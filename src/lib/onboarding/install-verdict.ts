// =============================================
// Install verification verdict (§5, steps 3-5). Pure decision logic, split out
// of the polling route so it can be tested without a database.
//
// Ordering matters: a verified heartbeat always wins. Only when we have NOT seen
// a good one do we surface a rejected-origin diagnosis — "we saw your widget on
// blog.example.com, add it?" — which is the highest-value support deflection in
// the wizard. Everything else is still-waiting.
// =============================================

export interface InstallProperty {
  install_status: "pending" | "verified" | "stale";
  first_seen_at: string | null;
  last_seen_at: string | null;
  allowed_domains: string[];
}

export type InstallVerdict =
  | { status: "verified"; last_seen_at: string | null }
  | { status: "origin_rejected"; origin: string | null; allowed_domains: string[] }
  | { status: "waiting" };

/**
 * @param property     The property being verified.
 * @param rejectedOrigin Origin from the most recent `widget_origin_rejected`
 *   event for THIS property, or null when there is none.
 */
export function decideInstallVerdict(
  property: InstallProperty,
  rejectedOrigin: string | null | undefined
): InstallVerdict {
  // A heartbeat from an allowed origin is conclusive. `first_seen_at` guards
  // against a row marked verified without ever having been seen.
  if (property.install_status === "verified" && property.first_seen_at) {
    return { status: "verified", last_seen_at: property.last_seen_at };
  }

  // `undefined` means no rejected heartbeat exists. An explicit `null` means one
  // arrived but carried no Origin header — still a rejection worth reporting.
  if (rejectedOrigin !== undefined) {
    return {
      status: "origin_rejected",
      origin: rejectedOrigin,
      allowed_domains: property.allowed_domains ?? [],
    };
  }

  return { status: "waiting" };
}
