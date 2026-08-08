import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { isOriginAllowed, isWidgetKeyShaped } from "./keys";
import { verifyVisitorToken, type VisitorTokenPayload } from "./visitor-token";

// =============================================
// Widget request guard
// ---------------------------------------------
// Every /api/widget/* route is public (src/middleware.ts exempts the prefix),
// so authorization lives here. Two entry points:
//
//   resolveByKey()   — widget key + Origin check (config, session, heartbeat)
//   resolveByToken() — signed visitor token       (message, history, transcript)
//
// See docs/phase1-spec-widget-and-onboarding.md §6.
// =============================================

/** Fields safe to expose to a browser. NEVER select('*') on properties or
 *  tenants — both hold secrets (openai_api_key, whatsapp_access_token). */
const PROPERTY_PUBLIC_FIELDS =
  "id, tenant_id, name, widget_key, allowed_domains, branding, install_status, is_active, first_seen_at, last_seen_at";

export interface PropertyRecord {
  id: string;
  tenant_id: string;
  name: string;
  widget_key: string;
  allowed_domains: string[];
  branding: Record<string, unknown>;
  install_status: "pending" | "verified" | "stale";
  is_active: boolean;
  first_seen_at: string | null;
  last_seen_at: string | null;
}

export type GuardFailure = { ok: false; response: NextResponse };
export type KeyGuardSuccess = { ok: true; property: PropertyRecord; origin: string | null };
export type TokenGuardSuccess = KeyGuardSuccess & { token: VisitorTokenPayload };

/** CORS headers echoing only the caller's own origin — never `*`. */
export function corsHeaders(origin: string | null): Record<string, string> {
  if (!origin) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function widgetError(
  status: number,
  message: string,
  origin: string | null = null
): NextResponse {
  return NextResponse.json({ error: message }, { status, headers: corsHeaders(origin) });
}

export function widgetJson(
  body: unknown,
  origin: string | null,
  init?: { status?: number; headers?: Record<string, string> }
): NextResponse {
  return NextResponse.json(body, {
    status: init?.status ?? 200,
    headers: { ...corsHeaders(origin), ...(init?.headers ?? {}) },
  });
}

/**
 * Is this request coming from our OWN widget document, rather than a customer's
 * page?
 *
 * The widget iframe is served from our origin, so its calls to /api/widget/* are
 * first-party: a same-origin GET omits the Origin header entirely, and a
 * same-origin POST sends OUR host — neither of which can ever appear in a
 * customer's allowed_domains. Without this branch the iframe can never authorize
 * itself, so the panel renders and then immediately fails to boot.
 *
 * Compare against the host actually serving the request, not a configured
 * constant: the app answers on both the apex and the app subdomain, and the
 * snippet may point at either.
 *
 * Safe because framing is the real control here — `frame-ancestors` (set in
 * middleware.ts from allowed_domains) means only an allowlisted parent can embed
 * the widget document at all. Note the Origin check was never a defence against
 * non-browser clients, which can set any Origin they like; per §6 the cost
 * boundary is the per-property AI ceiling plus the rate limits.
 */
export function isFirstPartyWidgetRequest(
  request: NextRequest,
  origin: string | null
): boolean {
  if (origin) {
    const hosts = [request.headers.get("host"), process.env.NEXT_PUBLIC_APP_URL]
      .filter((h): h is string => !!h)
      .map((h) => {
        try {
          return new URL(h.includes("://") ? h : `https://${h}`).host;
        } catch {
          return null;
        }
      });
    try {
      return hosts.includes(new URL(origin).host);
    } catch {
      return false;
    }
  }

  // A same-origin fetch sends no Origin at all. Sec-Fetch-Site is set by the
  // browser and cannot be overridden by page JavaScript.
  return request.headers.get("sec-fetch-site") === "same-origin";
}

/** Origin check for widget routes: the customer's allowlist, or our own iframe. */
function originPermitted(
  request: NextRequest,
  origin: string | null,
  allowedDomains: string[]
): boolean {
  return isOriginAllowed(origin, allowedDomains) || isFirstPartyWidgetRequest(request, origin);
}

async function loadPropertyByKey(widgetKey: string): Promise<PropertyRecord | null> {
  const { data } = await getSupabaseAdmin()
    .from("properties")
    .select(PROPERTY_PUBLIC_FIELDS)
    .eq("widget_key", widgetKey)
    .maybeSingle();
  return (data as PropertyRecord | null) ?? null;
}

/**
 * Authorize a request carrying only the public widget key.
 *
 * SECURITY: the Origin header is set by the browser and cannot be forged by
 * page JavaScript. A domain supplied in the body is never consulted.
 */
export async function resolveByKey(
  request: NextRequest,
  widgetKey: string | null
): Promise<KeyGuardSuccess | GuardFailure> {
  const origin = request.headers.get("origin");

  if (!widgetKey || !isWidgetKeyShaped(widgetKey)) {
    return { ok: false, response: widgetError(400, "Missing or malformed widget key") };
  }

  const property = await loadPropertyByKey(widgetKey);
  // Same response for unknown vs inactive: don't let probing enumerate keys.
  if (!property || !property.is_active) {
    return { ok: false, response: widgetError(404, "Unknown widget key") };
  }

  if (!originPermitted(request, origin, property.allowed_domains)) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "Origin not allowed for this property",
          // Echoed so the onboarding verify step can render the precise
          // "we saw your widget on X, add it?" diagnostic (§5).
          origin: origin ?? null,
        },
        { status: 403 }
      ),
    };
  }

  return { ok: true, property, origin };
}

/**
 * Authorize a request carrying a signed visitor token.
 *
 * SECURITY: tenantId / conversationId come from the token's claims only.
 * Reading either from the request body would be a direct IDOR into another
 * business's conversations.
 */
export async function resolveByToken(
  request: NextRequest
): Promise<TokenGuardSuccess | GuardFailure> {
  const origin = request.headers.get("origin");
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;

  // Decode without key-binding first so we can look the property up.
  const unverified = verifyVisitorToken(bearer);
  if (!unverified) {
    return { ok: false, response: widgetError(401, "Invalid or expired session", origin) };
  }

  const { data } = await getSupabaseAdmin()
    .from("properties")
    .select(PROPERTY_PUBLIC_FIELDS)
    .eq("id", unverified.propertyId)
    .maybeSingle();
  const property = (data as PropertyRecord | null) ?? null;

  if (!property || !property.is_active) {
    return { ok: false, response: widgetError(404, "Unknown property", origin) };
  }

  // Re-verify bound to the CURRENT widget key, so rotation invalidates old
  // tokens once the grace window lapses.
  const token = verifyVisitorToken(bearer, property.widget_key);
  if (!token) {
    return { ok: false, response: widgetError(401, "Session no longer valid", origin) };
  }

  if (!originPermitted(request, origin, property.allowed_domains)) {
    return { ok: false, response: widgetError(403, "Origin not allowed for this property") };
  }

  // Defence in depth: the token's tenant must still match the property's.
  if (token.tenantId !== property.tenant_id) {
    return { ok: false, response: widgetError(401, "Session no longer valid", origin) };
  }

  return { ok: true, property, origin, token };
}

// --- Durable rate limiting (migration 015) -------------------------------

/**
 * Atomically bump a burst bucket. Fails OPEN on infrastructure error so a
 * database blip cannot take every customer's widget offline — the per-property
 * AI ceiling below is the hard cost stop, and it fails closed.
 */
export async function checkBurst(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  try {
    const { data, error } = await getSupabaseAdmin().rpc("widget_bump_rate", {
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error) {
      console.error("[Widget] rate bucket error:", error.message);
      return true;
    }
    return data !== false;
  } catch (e) {
    console.error("[Widget] rate bucket threw:", e);
    return true;
  }
}

/**
 * Consume one AI reply against the property's monthly ceiling. MUST be called
 * BEFORE the model request.
 *
 * Fails CLOSED: if the counter cannot be read, no model call is made. An
 * unbounded OpenAI bill is worse than a temporarily unavailable widget.
 */
export async function consumeAiReply(propertyId: string, monthlyLimit: number): Promise<boolean> {
  try {
    const { data, error } = await getSupabaseAdmin().rpc("widget_consume_ai_reply", {
      p_property_id: propertyId,
      p_limit: monthlyLimit,
    });
    if (error) {
      console.error("[Widget] AI ceiling error:", error.message);
      return false;
    }
    return data === true;
  } catch (e) {
    console.error("[Widget] AI ceiling threw:", e);
    return false;
  }
}
