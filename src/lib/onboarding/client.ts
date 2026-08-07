import type { BusinessConfig, FAQ, KnowledgeEntry, OnboardingState } from "@/types";

// =============================================
// Browser-side helpers for the onboarding wizard. Thin fetch wrappers around
// the authed onboarding/property/crawl routes; the fiq-auth cookie rides along
// automatically. Each throws Error(message) on a non-2xx so callers can toast it.
// =============================================

async function jsonOrThrow(res: Response, fallback: string) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || fallback);
  return data;
}

export interface OnboardingPatch {
  onboarding?: Partial<OnboardingState>;
  config?: Partial<BusinessConfig>;
}

/** Persist wizard progress and/or a config-template merge. Returns fresh state. */
export async function saveOnboarding(patch: OnboardingPatch): Promise<OnboardingState> {
  const res = await fetch("/api/onboarding", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  return (await jsonOrThrow(res, "Failed to save progress")).onboarding;
}

/** Load current wizard state (for resume). */
export async function loadOnboarding(): Promise<OnboardingState> {
  const res = await fetch("/api/onboarding");
  return (await jsonOrThrow(res, "Failed to load progress")).onboarding;
}

/** Fire the background crawl for step 1. Returns immediately (202). */
export async function startCrawl(url: string): Promise<void> {
  const res = await fetch("/api/onboarding/crawl", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  await jsonOrThrow(res, "Failed to start crawl");
}

export interface CreatePropertyBody {
  name: string;
  site_url?: string | null;
  allowed_domains?: string[];
  branding?: Record<string, unknown>;
}

/** Create the property (step 2). Returns the created property's id + key. */
export async function createProperty(
  body: CreatePropertyBody
): Promise<{ id: string; widget_key: string; branding: Record<string, unknown> }> {
  const res = await fetch("/api/properties", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return (await jsonOrThrow(res, "Failed to create property")).property;
}

/** Load a single property owned by the session tenant. */
export async function getProperty(id: string): Promise<{
  id: string;
  name: string;
  widget_key: string;
  branding: Record<string, unknown>;
  allowed_domains: string[];
}> {
  const res = await fetch(`/api/properties/${id}`);
  return (await jsonOrThrow(res, "Failed to load property")).property;
}

/** Commit the reviewed FAQs + KB into the tenant config (step 5). */
export async function commitKnowledge(payload: {
  faqs: FAQ[];
  knowledge_base: KnowledgeEntry[];
}): Promise<{ committed: { faqs: number; knowledge_base: number }; dropped_for_cap: number }> {
  const res = await fetch("/api/onboarding/knowledge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return jsonOrThrow(res, "Failed to save knowledge");
}

export type InstallStatus =
  | { status: "verified"; last_seen_at?: string | null }
  | { status: "waiting" }
  | { status: "origin_rejected"; origin: string | null; allowed_domains: string[] };

/** Poll the install diagnosis for the verify screen. */
export async function getInstallStatus(propertyId?: string): Promise<InstallStatus> {
  const q = propertyId ? `?property_id=${encodeURIComponent(propertyId)}` : "";
  const res = await fetch(`/api/onboarding/install-status${q}`);
  return jsonOrThrow(res, "Failed to check install status");
}

/** Record a client-observed funnel event. Best-effort — never throws. */
export async function trackClientEvent(event: "snippet_copied", propertyId?: string): Promise<void> {
  try {
    await fetch("/api/onboarding/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, property_id: propertyId }),
    });
  } catch {
    // Analytics must not disrupt the wizard.
  }
}

/** Email the install snippet + guide to a developer's address. */
export async function sendInstructions(propertyId: string, toEmail: string): Promise<void> {
  const res = await fetch("/api/onboarding/send-instructions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ property_id: propertyId, to_email: toEmail }),
  });
  await jsonOrThrow(res, "Failed to send instructions");
}

/** Patch an existing property (step 4 branding edits). */
export async function updateProperty(
  id: string,
  body: Record<string, unknown>
): Promise<{ id: string; branding: Record<string, unknown> }> {
  const res = await fetch(`/api/properties/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return (await jsonOrThrow(res, "Failed to save changes")).property;
}
