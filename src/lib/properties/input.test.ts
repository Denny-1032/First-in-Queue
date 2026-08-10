import { describe, it, expect } from "vitest";
import {
  parseName,
  parseAllowedDomains,
  sanitizeBranding,
  parseCreateProperty,
  parseUpdateProperty,
  buildEmbedSnippet,
  BRANDING_DEFAULTS,
  MAX_ALLOWED_DOMAINS,
  MAX_NAME_LENGTH,
} from "./input";

describe("parseName", () => {
  it("trims and accepts a normal name", () => {
    const r = parseName("  Acme Ltd  ");
    expect(r).toEqual({ ok: true, value: "Acme Ltd" });
  });

  it("rejects empty, whitespace and non-strings", () => {
    expect(parseName("").ok).toBe(false);
    expect(parseName("   ").ok).toBe(false);
    expect(parseName(undefined).ok).toBe(false);
    expect(parseName(42).ok).toBe(false);
  });

  it("rejects an over-long name", () => {
    expect(parseName("a".repeat(MAX_NAME_LENGTH + 1)).ok).toBe(false);
    expect(parseName("a".repeat(MAX_NAME_LENGTH)).ok).toBe(true);
  });
});

describe("parseAllowedDomains", () => {
  it("normalizes to bare hosts and deduplicates", () => {
    const r = parseAllowedDomains(["https://www.example.com/pricing", "EXAMPLE.com", "shop.example.com"]);
    expect(r).toEqual({ ok: true, value: ["example.com", "shop.example.com"] });
  });

  it("accepts an empty list — that means deny all, not allow all", () => {
    expect(parseAllowedDomains([])).toEqual({ ok: true, value: [] });
  });

  it("rejects junk entries rather than silently dropping them", () => {
    // Silently dropping produces a widget that 403s with no visible cause.
    expect(parseAllowedDomains(["   "]).ok).toBe(false);
    expect(parseAllowedDomains([123]).ok).toBe(false);
    expect(parseAllowedDomains("example.com").ok).toBe(false);
    // normalizeDomain is lenient enough to return these as "hosts".
    expect(parseAllowedDomains(["!!"]).ok).toBe(false);
    expect(parseAllowedDomains(["example"]).ok).toBe(false);
    expect(parseAllowedDomains(["-bad.com"]).ok).toBe(false);
  });

  it("allows localhost, so the snippet can be tested locally", () => {
    expect(parseAllowedDomains(["http://localhost:3000"])).toEqual({
      ok: true,
      value: ["localhost"],
    });
  });

  it("caps the list length", () => {
    const many = Array.from({ length: MAX_ALLOWED_DOMAINS + 1 }, (_, i) => `d${i}.com`);
    expect(parseAllowedDomains(many).ok).toBe(false);
  });
});

describe("sanitizeBranding", () => {
  it("drops unknown keys", () => {
    const out = sanitizeBranding({ evil_key: "x", title: "Hi" }, {});
    expect(out).toEqual({ title: "Hi" });
  });

  it("accepts the voice toggle and a uuid agent id, rejects a bogus one", () => {
    const on = sanitizeBranding({ voice_enabled: true }, {});
    expect(on.voice_enabled).toBe(true);

    const uuid = "3f1b2c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
    expect(sanitizeBranding({ voice_agent_id: uuid }, {}).voice_agent_id).toBe(uuid);
    // A non-uuid would be fed straight into an `.eq()` filter — keep the old value.
    expect(
      sanitizeBranding({ voice_agent_id: "' or 1=1--" }, { voice_agent_id: uuid }).voice_agent_id
    ).toBe(uuid);
    expect(sanitizeBranding({ voice_agent_id: null }, { voice_agent_id: uuid }).voice_agent_id).toBe(
      null
    );
  });

  it("keeps a WhatsApp number as digits and lets it be cleared", () => {
    // Whatever the customer types, wa.me needs bare digits.
    expect(sanitizeBranding({ whatsapp_number: "+260 97 123 4567" }, {}).whatsapp_number).toBe(
      "260971234567"
    );
    expect(sanitizeBranding({ whatsapp_number: null }, { whatsapp_number: "260971234567" }).whatsapp_number).toBe(null);
    expect(sanitizeBranding({ whatsapp_number: "" }, { whatsapp_number: "260971234567" }).whatsapp_number).toBe(null);
  });

  it("ignores a WhatsApp number that could not be dialled, keeping the old one", () => {
    const kept = { whatsapp_number: "260971234567" };
    // Too short to be an international number, and a link built from it would
    // open an empty WhatsApp chat on every visitor's phone.
    expect(sanitizeBranding({ whatsapp_number: "0971" }, kept).whatsapp_number).toBe("260971234567");
    expect(sanitizeBranding({ whatsapp_number: "1234567890123456" }, kept).whatsapp_number).toBe(
      "260971234567"
    );
    expect(sanitizeBranding({ whatsapp_number: 260971234567 }, kept).whatsapp_number).toBe(
      "260971234567"
    );
  });

  it("rejects non-hex colours — these land in inline styles on the customer's page", () => {
    const out = sanitizeBranding(
      { primary_color: "red; background: url(//evil)", text_color: "#fff" },
      { primary_color: "#03A84E" }
    );
    expect(out.primary_color).toBe("#03A84E");
    expect(out.text_color).toBe("#fff");
  });

  it("constrains position and launcher to known values", () => {
    expect(sanitizeBranding({ position: "middle" }, { position: "bottom-right" }).position).toBe(
      "bottom-right"
    );
    expect(sanitizeBranding({ position: "top-left" }, {}).position).toBe("top-left");
    expect(sanitizeBranding({ launcher: "iframe" }, {}).launcher).toBeUndefined();
    expect(sanitizeBranding({ launcher: "tab" }, {}).launcher).toBe("tab");
  });

  it("allows explicit null to clear offline_message and logo_url", () => {
    const out = sanitizeBranding(
      { offline_message: null, logo_url: null },
      { offline_message: "Back at 9", logo_url: "https://cdn.example.com/l.png" }
    );
    expect(out.offline_message).toBeNull();
    expect(out.logo_url).toBeNull();
  });

  it("requires https for logo_url", () => {
    expect(sanitizeBranding({ logo_url: "http://cdn.example.com/l.png" }, {}).logo_url).toBeUndefined();
    expect(sanitizeBranding({ logo_url: "javascript:alert(1)" }, {}).logo_url).toBeUndefined();
    expect(sanitizeBranding({ logo_url: "https://cdn.example.com/l.png" }, {}).logo_url).toBe(
      "https://cdn.example.com/l.png"
    );
  });

  it("trims suggested_messages to strings and caps the count", () => {
    const out = sanitizeBranding(
      { suggested_messages: ["  a  ", "", 5, "b", "c", "d", "e", "f", "g"] },
      {}
    );
    expect(out.suggested_messages).toEqual(["a", "b", "c", "d", "e", "f"]);
  });

  it("clamps response_delay_ms into range", () => {
    expect(sanitizeBranding({ response_delay_ms: -100 }, {}).response_delay_ms).toBe(0);
    expect(sanitizeBranding({ response_delay_ms: 99999 }, {}).response_delay_ms).toBe(5000);
    expect(sanitizeBranding({ response_delay_ms: "600" }, {}).response_delay_ms).toBeUndefined();
  });

  it("keeps the base untouched when input is not an object", () => {
    expect(sanitizeBranding(null, { title: "Hi" })).toEqual({ title: "Hi" });
    expect(sanitizeBranding(["x"], { title: "Hi" })).toEqual({ title: "Hi" });
  });
});

describe("parseCreateProperty", () => {
  it("derives the allowlist from site_url when none is given", () => {
    const r = parseCreateProperty({ name: "Acme", site_url: "https://acme.co.zm/contact" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.allowed_domains).toEqual(["acme.co.zm", "www.acme.co.zm"]);
    expect(r.value.branding.primary_color).toBe(BRANDING_DEFAULTS.primary_color);
  });

  it("uses an explicit allowlist over the derived one", () => {
    const r = parseCreateProperty({
      name: "Acme",
      site_url: "https://acme.co.zm",
      allowed_domains: ["shop.acme.co.zm"],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.allowed_domains).toEqual(["shop.acme.co.zm"]);
  });

  it("defaults to an empty (deny-all) allowlist with no site_url", () => {
    const r = parseCreateProperty({ name: "Acme" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.allowed_domains).toEqual([]);
    expect(r.value.site_url).toBeNull();
  });

  it("rejects a missing name and an unparseable site_url", () => {
    expect(parseCreateProperty({}).ok).toBe(false);
    expect(parseCreateProperty({ name: "Acme", site_url: "!!" }).ok).toBe(false);
  });

  it("ignores tenant_id, widget_key and install_status in the body", () => {
    const r = parseCreateProperty({
      name: "Acme",
      tenant_id: "other-tenant",
      widget_key: "fiq_live_" + "a".repeat(32),
      install_status: "verified",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(Object.keys(r.value).sort()).toEqual(
      ["allowed_domains", "branding", "name", "site_url"].sort()
    );
  });
});

describe("parseUpdateProperty", () => {
  it("returns only the fields present in the body", () => {
    const r = parseUpdateProperty({ name: "New Name" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toEqual({ name: "New Name" });
  });

  it("rejects an empty patch rather than silently no-op'ing", () => {
    expect(parseUpdateProperty({}).ok).toBe(false);
    expect(parseUpdateProperty(null).ok).toBe(false);
    expect(parseUpdateProperty([]).ok).toBe(false);
  });

  it("allows clearing site_url with null or empty string", () => {
    expect(parseUpdateProperty({ site_url: null })).toEqual({ ok: true, value: { site_url: null } });
    expect(parseUpdateProperty({ site_url: "" })).toEqual({ ok: true, value: { site_url: null } });
  });

  it("normalizes an updated allowed_domains list", () => {
    const r = parseUpdateProperty({ allowed_domains: ["https://www.acme.com/x", "ACME.com"] });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.allowed_domains).toEqual(["acme.com"]);
  });

  it("accepts emptying the allowlist — deny all is a valid state", () => {
    expect(parseUpdateProperty({ allowed_domains: [] })).toEqual({
      ok: true,
      value: { allowed_domains: [] },
    });
  });

  it("passes branding through as a raw patch for the route to merge", () => {
    const r = parseUpdateProperty({ branding: { title: "Hi" } });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.brandingPatch).toEqual({ title: "Hi" });
  });

  it("rejects a badly typed branding, site_url or is_active", () => {
    expect(parseUpdateProperty({ branding: "nope" }).ok).toBe(false);
    expect(parseUpdateProperty({ branding: [] }).ok).toBe(false);
    expect(parseUpdateProperty({ site_url: 42 }).ok).toBe(false);
    expect(parseUpdateProperty({ is_active: "yes" }).ok).toBe(false);
  });

  it("validates name and domains the same way create does", () => {
    expect(parseUpdateProperty({ name: "   " }).ok).toBe(false);
    expect(parseUpdateProperty({ allowed_domains: ["!!"] }).ok).toBe(false);
  });

  it("does not surface widget_key, tenant_id or install_status as updatable", () => {
    const r = parseUpdateProperty({
      name: "Keep",
      widget_key: "fiq_live_" + "a".repeat(32),
      tenant_id: "other",
      install_status: "verified",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(Object.keys(r.value)).toEqual(["name"]);
  });
});

describe("buildEmbedSnippet", () => {
  it("emits the one-attribute snippet and strips a trailing slash", () => {
    expect(buildEmbedSnippet("https://app.firstinqueue.com/", "fiq_live_abc")).toBe(
      '<script src="https://app.firstinqueue.com/widget.js" data-key="fiq_live_abc" async></script>'
    );
  });
});
