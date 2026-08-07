import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  readOnboarding,
  patchOnboarding,
  mergeTenantConfig,
  getTenantConfig,
  onboardingTotalSteps,
} from "./state";
import type { BusinessConfig } from "@/types";

// Minimal stand-in for the two query shapes state.ts uses:
//   .from("tenants").select("config").eq("id", x).maybeSingle()
//   .from("tenants").update({ config }).eq("id", x)
// `captured` records what an update would have written.
function fakeDb(config: BusinessConfig | null) {
  const captured: { config?: BusinessConfig } = {};
  const db = {
    from() {
      return {
        select() {
          return {
            eq() {
              return { maybeSingle: async () => ({ data: config ? { config } : null, error: null }) };
            },
          };
        },
        update(values: { config: BusinessConfig }) {
          captured.config = values.config;
          return { eq: async () => ({ error: null }) };
        },
      };
    },
  } as unknown as SupabaseClient;
  return { db, captured };
}

const baseConfig = (over: Partial<BusinessConfig> = {}): BusinessConfig =>
  ({
    business_name: "Acme",
    industry: "ecommerce",
    description: "desc",
    personality: { name: "Bot", tone: "friendly", emoji_usage: "minimal", response_style: "concise" },
    welcome_message: "hi",
    fallback_message: "oops",
    languages: ["English"],
    default_language: "English",
    knowledge_base: [],
    faqs: [],
    quick_replies: [],
    flows: [],
    escalation_rules: [],
    custom_instructions: "",
    ...over,
  }) as BusinessConfig;

describe("onboardingTotalSteps", () => {
  it("covers steps 0-7", () => {
    expect(onboardingTotalSteps()).toBe(8);
  });
});

describe("readOnboarding", () => {
  it("defaults to step 0 when absent or config is null", () => {
    expect(readOnboarding(null)).toEqual({ step: 0 });
    expect(readOnboarding(baseConfig())).toEqual({ step: 0 });
  });

  it("returns the stored state when present", () => {
    const config = baseConfig({ onboarding: { step: 4, property_id: "p1" } });
    expect(readOnboarding(config)).toEqual({ step: 4, property_id: "p1" });
  });
});

describe("getTenantConfig", () => {
  it("returns null for a missing tenant", async () => {
    const { db } = fakeDb(null);
    await expect(getTenantConfig(db, "nope")).resolves.toBeNull();
  });
});

describe("patchOnboarding", () => {
  it("merges into existing state without dropping untouched keys", async () => {
    const { db, captured } = fakeDb(
      baseConfig({ onboarding: { step: 2, property_id: "p1", site_url: "https://x.com" } })
    );
    const next = await patchOnboarding(db, "t1", { step: 3 });
    expect(next).toEqual({ step: 3, property_id: "p1", site_url: "https://x.com" });
    expect(captured.config?.onboarding?.step).toBe(3);
  });

  it("merges crawl one level deep so a status update keeps stored entries", async () => {
    const entries = [{ id: "k1", topic: "T", content: "C", keywords: [] }];
    const { db } = fakeDb(
      baseConfig({ onboarding: { step: 5, crawl: { status: "done", entries, source: "x.com" } } })
    );
    const next = await patchOnboarding(db, "t1", { crawl: { status: "failed", error: "boom" } });
    expect(next.crawl?.status).toBe("failed");
    expect(next.crawl?.error).toBe("boom");
    // The expensive crawl output survives a status-only patch.
    expect(next.crawl?.entries).toEqual(entries);
    expect(next.crawl?.source).toBe("x.com");
  });

  it("preserves the rest of the tenant config", async () => {
    const { db, captured } = fakeDb(baseConfig({ business_name: "Keep Me" }));
    await patchOnboarding(db, "t1", { step: 1 });
    expect(captured.config?.business_name).toBe("Keep Me");
  });

  it("throws when the tenant does not exist", async () => {
    const { db } = fakeDb(null);
    await expect(patchOnboarding(db, "missing", { step: 1 })).rejects.toThrow("Tenant not found");
  });
});

describe("mergeTenantConfig", () => {
  it("applies whitelisted keys", async () => {
    const { db, captured } = fakeDb(baseConfig());
    const next = await mergeTenantConfig(db, "t1", {
      business_name: "New Name",
      industry: "restaurant",
    });
    expect(next.business_name).toBe("New Name");
    expect(next.industry).toBe("restaurant");
    expect(captured.config?.business_name).toBe("New Name");
  });

  it("ignores keys outside the whitelist", async () => {
    const { db } = fakeDb(baseConfig());
    const next = await mergeTenantConfig(db, "t1", {
      booking_settings: {
        enabled: true,
        slot_minutes: 30,
        capacity_per_slot: 1,
        min_notice_hours: 1,
        max_days_ahead: 30,
      },
    });
    // A wizard request must not be able to switch booking on.
    expect(next.booking_settings).toBeUndefined();
  });

  it("does not disturb existing onboarding progress", async () => {
    const { db } = fakeDb(baseConfig({ onboarding: { step: 3, property_id: "p9" } }));
    const next = await mergeTenantConfig(db, "t1", { business_name: "X" });
    expect(next.onboarding).toEqual({ step: 3, property_id: "p9" });
  });

  it("skips undefined values rather than writing them", async () => {
    const { db } = fakeDb(baseConfig({ business_name: "Original" }));
    const next = await mergeTenantConfig(db, "t1", { business_name: undefined });
    expect(next.business_name).toBe("Original");
  });
});
