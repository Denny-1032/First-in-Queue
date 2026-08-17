// =============================================
// Domain allowlisting for widget properties
// ---------------------------------------------
// Split out of keys.ts so it stays free of node built-ins: proxy.ts runs
// on the Edge runtime and imports frameAncestorsFor from here. keys.ts (which
// needs node `crypto` to mint keys) re-exports everything below, so existing
// import sites are unaffected.
//
// See docs/phase1-spec-widget-and-onboarding.md §3.3 and §6.
// =============================================

/** Strip protocol, port, path and a leading `www.`; lowercase. */
export function normalizeDomain(input: string): string | null {
  if (!input) return null;
  let host = input.trim().toLowerCase();
  try {
    if (!/^https?:\/\//.test(host)) host = "https://" + host;
    host = new URL(host).hostname;
  } catch {
    return null;
  }
  return host.replace(/^www\./, "") || null;
}

/**
 * Derive the initial allowlist from the site URL captured in wizard step 1:
 * the registrable host plus its `www.` form. Subdomain coverage is handled at
 * match time by {@link isOriginAllowed}, not by enumerating here.
 */
export function deriveAllowedDomains(siteUrl: string): string[] {
  const host = normalizeDomain(siteUrl);
  if (!host) return [];
  return [host, `www.${host}`];
}

/**
 * Decide whether a request's Origin may use this property.
 *
 * SECURITY: `origin` must come from the Origin header, which the browser sets
 * and page JavaScript cannot forge. Never pass a value taken from the request
 * body. An empty allowlist denies everything — it is never "allow all".
 *
 * A listed domain also authorises its subdomains, so `example.com` covers
 * `shop.example.com`, but never a suffix collision like `notexample.com`.
 */
export function isOriginAllowed(origin: string | null, allowedDomains: string[]): boolean {
  if (!origin) return false;
  if (!allowedDomains || allowedDomains.length === 0) return false;

  const host = normalizeDomain(origin);
  if (!host) return false;

  return allowedDomains.some((entry) => {
    const allowed = normalizeDomain(entry);
    if (!allowed) return false;
    return host === allowed || host.endsWith(`.${allowed}`);
  });
}

/**
 * CORS origin to echo back. Returns the caller's exact origin only when it is
 * allowed — never `*`, which would let any site read conversation data.
 */
export function corsOriginFor(origin: string | null, allowedDomains: string[]): string | null {
  return isOriginAllowed(origin, allowedDomains) ? origin : null;
}

/**
 * Build the CSP `frame-ancestors` value for a widget document.
 *
 * The widget iframe is MEANT to be framed by customer sites, so it cannot use
 * `X-Frame-Options: DENY` (spec §6). This is the replacement control: only the
 * property's own domains may frame it.
 *
 * Mirrors {@link isOriginAllowed}: each allowed host is emitted as both the
 * exact origin and a `*.` wildcard, matching that function's subdomain rule.
 *
 * `'self'` is always included so first-party surfaces (the onboarding dogfood
 * panel, dashboard previews) can frame the widget on our own origin. An empty
 * allowlist therefore yields `'self'` alone — every third party denied, which
 * is the "empty = deny all" invariant applied to framing.
 *
 * Loopback hosts additionally get an `http://` form with a port wildcard. Dev
 * and staging pages are served over plain http on an arbitrary port, and a
 * https-only source can never match them — which left `isOriginAllowed` (which
 * ignores scheme and port, so CORS passed) disagreeing with this function, so a
 * developer who allowlisted localhost got a permanently empty widget panel.
 * This stays opt-in: it applies only when localhost is explicitly allowlisted,
 * and browsers already treat loopback as a secure context.
 */
function isLoopback(host: string): boolean {
  // normalizeDomain returns URL.hostname, so IPv6 arrives bracketed.
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
}

export function frameAncestorsFor(allowedDomains: string[]): string {
  const hosts = (allowedDomains || [])
    .map((d) => normalizeDomain(d))
    .filter((h): h is string => h !== null);

  const unique = Array.from(new Set(hosts));
  const sources = unique.flatMap((h) =>
    isLoopback(h)
      ? [`http://${h}:*`, `https://${h}:*`]
      : [`https://${h}`, `https://*.${h}`]
  );

  return ["'self'", ...sources].join(" ");
}
