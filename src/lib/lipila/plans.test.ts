import { describe, it, expect } from "vitest";
import {
  PLANS,
  SELLABLE_PLANS,
  getPlanById,
  getPlanOrFree,
  resolvePlanFromAmount,
  resolvePlanFromPayment,
} from "./plans";

describe("v2 plan structure", () => {
  it("sells exactly Free, Pro and Institution", () => {
    expect(SELLABLE_PLANS.map((p) => p.id)).toEqual(["free", "pro", "institution"]);
  });

  it("keeps the legacy plans resolvable but never sells them", () => {
    // The subscriptions.plan_id foreign key and one live paid period both
    // depend on these still existing.
    for (const id of ["basic", "business"]) {
      expect(getPlanById(id)?.legacy).toBe(true);
      expect(SELLABLE_PLANS.some((p) => p.id === id)).toBe(false);
    }
  });

  it("bundles no WhatsApp or voice into Pro", () => {
    // The whole v2 thesis: pass-through cost is metered credit, not bundled.
    // If either of these becomes non-zero, K499 carries uncapped liability again.
    const pro = getPlanById("pro")!;
    expect(pro.messagesPerMonth).toBe(0);
    expect(pro.voiceMinutesPerMonth).toBe(0);
  });

  it("locks channels and branding on Free, unlocks them on Pro", () => {
    const free = getPlanById("free")!;
    expect(free.channelsUnlocked).toBe(false);
    expect(free.brandingRemovable).toBe(false);

    const pro = getPlanById("pro")!;
    expect(pro.channelsUnlocked).toBe(true);
    expect(pro.brandingRemovable).toBe(true);
  });

  it("caps Institution rather than advertising unlimited", () => {
    const inst = getPlanById("institution")!;
    expect(inst.messagesPerMonth).toBe(5000);
    expect(inst.voiceMinutesPerMonth).toBe(500);
    expect(inst.features.join(" ")).not.toMatch(/unlimited/i);
  });

  it("falls back to Free for an unknown or missing plan", () => {
    // A gate that cannot read the plan must hand out the least capable one.
    expect(getPlanOrFree("legacy_gold").id).toBe("free");
    expect(getPlanOrFree(null).id).toBe("free");
    expect(getPlanOrFree(undefined).id).toBe("free");
  });

  it("prints no 'unlimited' next to WhatsApp or voice on any plan", () => {
    for (const plan of PLANS) {
      const copy = [plan.messagesLabel, plan.voiceMinutesLabel, ...plan.features].join(" ");
      expect(copy).not.toMatch(/unlimited\s+(whatsapp|voice)/i);
    }
  });
});

describe("resolvePlanFromPayment", () => {
  it("trusts the plan recorded on the payment", () => {
    expect(
      resolvePlanFromPayment({ plan_id: "pro", billing_interval: "yearly", amount: 4990 })
    ).toEqual({ planId: "pro", interval: "yearly" });
  });

  it("ignores a plan_id that no longer exists and falls back to the amount", () => {
    expect(
      resolvePlanFromPayment({ plan_id: "growth", billing_interval: "monthly", amount: 499 })
    ).toEqual({ planId: "pro", interval: "monthly" });
  });

  it("falls back to the amount for pre-020 payment rows", () => {
    expect(resolvePlanFromPayment({ amount: 1699 })).toEqual({
      planId: "business",
      interval: "monthly",
    });
  });
});

describe("resolvePlanFromAmount", () => {
  it("matches monthly and yearly prices exactly", () => {
    expect(resolvePlanFromAmount(499)).toEqual({ planId: "pro", interval: "monthly" });
    expect(resolvePlanFromAmount(4990)).toEqual({ planId: "pro", interval: "yearly" });
  });

  it("still resolves a legacy plan's price", () => {
    expect(resolvePlanFromAmount(1699)).toEqual({ planId: "business", interval: "monthly" });
  });

  it("returns null for an amount that matches nothing", () => {
    // The old implementation used `amount >= price` sorted descending, so K500
    // silently bought Pro and K5,000,000 silently bought Institution. Anything
    // unrecognised must now come back null so the caller decides.
    expect(resolvePlanFromAmount(500)).toBeNull();
    expect(resolvePlanFromAmount(250)).toBeNull();
    expect(resolvePlanFromAmount(0)).toBeNull();
    expect(resolvePlanFromAmount(-499)).toBeNull();
  });

  it("does not resolve a credit top-up amount to a plan", () => {
    // K200/K500/K1,000/K2,000 are the top-up packs. If any collided with a plan
    // price, a top-up could be read as a subscription purchase.
    for (const packKwacha of [200, 500, 1000, 2000]) {
      expect(resolvePlanFromAmount(packKwacha)).toBeNull();
    }
  });
});
