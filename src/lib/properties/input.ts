import { deriveAllowedDomains, normalizeDomain } from "./keys";

// =============================================
// Property input validation
// ---------------------------------------------
// Pure, no I/O — the dashboard property routes (/api/properties/*) parse every
// request body through here so the rules are testable without a database.
//
// Two things here are security controls, not tidiness:
//   * allowed_domains is normalized to bare hosts, because isOriginAllowed()
//     matches on hosts. A stray "https://x.com/path" entry would never match
//     and the customer's widget would silently 403.
//   * branding is a strict allowlist with typed values. It is echoed to every
//     visitor's browser and fed straight into the loader's inline styles, so an
//     unvalidated colour string is a CSS injection into the customer's page.
// See docs/phase1-spec-widget-and-onboarding.md §3 and §6.
// =============================================

export const MAX_NAME_LENGTH = 80;
export const MAX_ALLOWED_DOMAINS = 20;

/** Branding keys the dashboard may set, with their default values (§3 B2). */
export const BRANDING_DEFAULTS = {
  logo_url: null as string | null,
  primary_color: "#03A84E",
  text_color: "#ffffff",
  position: "bottom-right",
  title: "Chat with us",
  welcome_message: "👋 Hi! How can we help?",
  suggested_messages: ["I have a question", "Tell me more"] as string[],
  show_branding: true,
  response_delay_ms: 600,
  launcher: "bubble",
  offline_message: null as string | null,
  /** Voice calling from the widget. Off by default — it has real per-minute
   *  COGS and is gated again server-side by plan, minutes and agent
   *  (see lib/voice/widget-voice.ts). */
  voice_enabled: false,
  /** Pin one voice agent to this property. Null = the tenant's first active. */
  voice_agent_id: null as string | null,
  /** Digits only, E.164 without the "+". Null = no WhatsApp button. */
  whatsapp_number: null as string | null,
};

/**
 * `normalizeDomain` is deliberately lenient — the WHATWG URL parser accepts
 * hosts like `!!` — but a bogus host silently produces an allowlist that can
 * never match, i.e. a widget that 403s with no explanation. Input validation is
 * where that gets caught, so reject anything that is not a dotted hostname.
 * `localhost` is allowed on purpose: it is how the snippet gets tested locally.
 */
export function isPlausibleHost(host: string): boolean {
  if (host === "localhost") return true;
  return /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(
    host
  );
}

const POSITIONS = ["bottom-right", "bottom-left", "top-right", "top-left"];
const LAUNCHERS = ["bubble", "tab", "custom"];
const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface CreatePropertyInput {
  name: string;
  site_url: string | null;
  allowed_domains: string[];
  branding: Record<string, unknown>;
}

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

export function parseName(raw: unknown): ParseResult<string> {
  if (typeof raw !== "string") return { ok: false, error: "name is required" };
  const name = raw.trim();
  if (!name) return { ok: false, error: "name is required" };
  if (name.length > MAX_NAME_LENGTH) {
    return { ok: false, error: `name must be ${MAX_NAME_LENGTH} characters or fewer` };
  }
  return { ok: true, value: name };
}

/**
 * Normalize an explicit allowlist to bare, deduplicated hosts. Entries that
 * cannot be parsed as a host are rejected rather than dropped — silently
 * discarding a domain the customer typed produces a widget that 403s with no
 * visible cause.
 */
export function parseAllowedDomains(raw: unknown): ParseResult<string[]> {
  if (!Array.isArray(raw)) return { ok: false, error: "allowed_domains must be an array" };
  if (raw.length > MAX_ALLOWED_DOMAINS) {
    return { ok: false, error: `allowed_domains is limited to ${MAX_ALLOWED_DOMAINS} entries` };
  }

  const out: string[] = [];
  for (const entry of raw) {
    if (typeof entry !== "string" || !entry.trim()) {
      return { ok: false, error: "allowed_domains entries must be non-empty strings" };
    }
    const host = normalizeDomain(entry);
    if (!host || !isPlausibleHost(host)) {
      return { ok: false, error: `"${entry}" is not a valid domain` };
    }
    if (!out.includes(host)) out.push(host);
  }
  return { ok: true, value: out };
}

/**
 * Strict allowlist filter. Unknown keys are dropped and badly typed values are
 * ignored in favour of the existing value, so a malformed dashboard request can
 * never push an unrenderable branding blob to live visitors.
 */
export function sanitizeBranding(
  raw: unknown,
  base: Record<string, unknown> = {}
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  const input = raw as Record<string, unknown>;

  const str = (v: unknown, max: number) =>
    typeof v === "string" && v.trim().length > 0 ? v.trim().slice(0, max) : undefined;

  if (HEX_COLOR.test(String(input.primary_color))) out.primary_color = input.primary_color;
  if (HEX_COLOR.test(String(input.text_color))) out.text_color = input.text_color;

  if (typeof input.position === "string" && POSITIONS.includes(input.position)) {
    out.position = input.position;
  }
  if (typeof input.launcher === "string" && LAUNCHERS.includes(input.launcher)) {
    out.launcher = input.launcher;
  }

  const title = str(input.title, 60);
  if (title) out.title = title;
  const welcome = str(input.welcome_message, 300);
  if (welcome) out.welcome_message = welcome;

  // Explicitly clearable — null is a meaningful value for both of these.
  if (input.offline_message === null) out.offline_message = null;
  else {
    const offline = str(input.offline_message, 300);
    if (offline) out.offline_message = offline;
  }
  if (input.logo_url === null) out.logo_url = null;
  else {
    const logo = str(input.logo_url, 500);
    if (logo && /^https:\/\//i.test(logo)) out.logo_url = logo;
  }

  if (Array.isArray(input.suggested_messages)) {
    out.suggested_messages = input.suggested_messages
      .filter((m): m is string => typeof m === "string" && m.trim().length > 0)
      .slice(0, 6)
      .map((m) => m.trim().slice(0, 80));
  }

  if (typeof input.show_branding === "boolean") out.show_branding = input.show_branding;
  if (typeof input.voice_enabled === "boolean") out.voice_enabled = input.voice_enabled;

  // The number the widget's "Continue on WhatsApp" button dials. Stored
  // separately from the tenant's `whatsapp_phone_number_id`, which is Meta's
  // internal id and cannot be dialled. Explicitly clearable.
  if (input.whatsapp_number === null || input.whatsapp_number === "") {
    out.whatsapp_number = null;
  } else if (typeof input.whatsapp_number === "string") {
    const digits = input.whatsapp_number.replace(/\D/g, "");
    // E.164 without the +: country code plus subscriber number.
    if (digits.length >= 8 && digits.length <= 15) out.whatsapp_number = digits;
  }

  // Turning voice on here only makes the offer; plan, remaining minutes and an
  // active agent are still checked on every call.
  if (input.voice_agent_id === null) out.voice_agent_id = null;
  else if (UUID_RE.test(String(input.voice_agent_id))) out.voice_agent_id = input.voice_agent_id;

  if (typeof input.response_delay_ms === "number" && Number.isFinite(input.response_delay_ms)) {
    out.response_delay_ms = Math.min(5000, Math.max(0, Math.round(input.response_delay_ms)));
  }

  return out;
}

/**
 * Validate a `POST /api/properties` body.
 *
 * `allowed_domains` defaults to the hosts derived from `site_url`. An empty
 * result is allowed and means DENY ALL — the widget will refuse every origin
 * until the owner fixes it, which is the correct failure direction.
 */
export function parseCreateProperty(raw: unknown): ParseResult<CreatePropertyInput> {
  const body = (raw ?? {}) as Record<string, unknown>;

  const name = parseName(body.name);
  if (!name.ok) return name;

  let siteUrl: string | null = null;
  if (typeof body.site_url === "string" && body.site_url.trim()) {
    const host = normalizeDomain(body.site_url);
    if (!host || !isPlausibleHost(host)) {
      return { ok: false, error: `"${body.site_url}" is not a valid site URL` };
    }
    siteUrl = body.site_url.trim().slice(0, 500);
  }

  let allowedDomains: string[];
  if (body.allowed_domains === undefined) {
    allowedDomains = siteUrl ? deriveAllowedDomains(siteUrl) : [];
  } else {
    const parsed = parseAllowedDomains(body.allowed_domains);
    if (!parsed.ok) return parsed;
    allowedDomains = parsed.value;
  }

  return {
    ok: true,
    value: {
      name: name.value,
      site_url: siteUrl,
      allowed_domains: allowedDomains,
      branding: sanitizeBranding(body.branding, { ...BRANDING_DEFAULTS }),
    },
  };
}

export interface UpdatePropertyInput {
  name?: string;
  site_url?: string | null;
  allowed_domains?: string[];
  is_active?: boolean;
  /** Raw branding patch — the route merges it onto the property's CURRENT
   *  branding, never onto the defaults, so a partial edit can't reset unrelated
   *  keys. Validation still runs at merge time via {@link sanitizeBranding}. */
  brandingPatch?: Record<string, unknown>;
}

/**
 * Validate a `PATCH /api/properties/[id]` body. Only the keys actually present
 * are returned, so the route can build a partial update. An empty patch is an
 * error rather than a no-op success, so a malformed body surfaces instead of
 * silently doing nothing.
 *
 * `widget_key`, `tenant_id`, `install_status` and the seen-at timestamps are
 * deliberately NOT updatable here — the key rotates through its own route and
 * the rest are server-owned.
 */
export function parseUpdateProperty(raw: unknown): ParseResult<UpdatePropertyInput> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "Invalid request body" };
  }
  const body = raw as Record<string, unknown>;
  const out: UpdatePropertyInput = {};

  if ("name" in body) {
    const name = parseName(body.name);
    if (!name.ok) return name;
    out.name = name.value;
  }

  if ("site_url" in body) {
    if (body.site_url === null || body.site_url === "") {
      out.site_url = null;
    } else if (typeof body.site_url === "string") {
      const host = normalizeDomain(body.site_url);
      if (!host || !isPlausibleHost(host)) {
        return { ok: false, error: `"${body.site_url}" is not a valid site URL` };
      }
      out.site_url = body.site_url.trim().slice(0, 500);
    } else {
      return { ok: false, error: "site_url must be a string or null" };
    }
  }

  if ("allowed_domains" in body) {
    const parsed = parseAllowedDomains(body.allowed_domains);
    if (!parsed.ok) return parsed;
    out.allowed_domains = parsed.value;
  }

  if ("is_active" in body) {
    if (typeof body.is_active !== "boolean") {
      return { ok: false, error: "is_active must be a boolean" };
    }
    out.is_active = body.is_active;
  }

  if ("branding" in body) {
    if (!body.branding || typeof body.branding !== "object" || Array.isArray(body.branding)) {
      return { ok: false, error: "branding must be an object" };
    }
    out.brandingPatch = body.branding as Record<string, unknown>;
  }

  if (Object.keys(out).length === 0) {
    return { ok: false, error: "No updatable fields provided" };
  }

  return { ok: true, value: out };
}

/** The one-line snippet the customer pastes before `</body>` (§4 C1). */
export function buildEmbedSnippet(baseUrl: string, widgetKey: string): string {
  const origin = baseUrl.replace(/\/+$/, "");
  return `<script src="${origin}/widget.js" data-key="${widgetKey}" async></script>`;
}
