import { describe, it, expect, beforeEach, vi } from "vitest";

const state = vi.hoisted(() => ({
  update: null as unknown as ReturnType<typeof vi.fn>,
  addCredit: null as unknown as ReturnType<typeof vi.fn>,
  activate: null as unknown as ReturnType<typeof vi.fn>,
  creditResult: null as unknown,
}));

vi.mock("@/lib/supabase/server", () => {
  const chain: Record<string, unknown> = {};
  state.update = vi.fn(() => chain);
  chain.from = vi.fn(() => chain);
  chain.update = state.update;
  chain.eq = vi.fn(async () => ({ data: null, error: null }));
  return { getSupabaseAdmin: vi.fn(() => chain) };
});

vi.mock("@/lib/credit/credit", () => {
  state.addCredit = vi.fn(async () => state.creditResult);
  return { addCredit: state.addCredit };
});

vi.mock("@/lib/trial-helpers", () => {
  state.activate = vi.fn(async () => ({ ok: true }));
  return { activatePaidSubscription: state.activate };
});

import { settlePayment } from "./settle";

const TOPUP = {
  id: "pay-1",
  tenant_id: "tenant-1",
  amount: 500,
  status: "pending",
  purpose: "credit_topup",
};

const SUBSCRIPTION = {
  id: "pay-2",
  tenant_id: "tenant-1",
  amount: 499,
  status: "pending",
  purpose: "subscription",
};

beforeEach(() => {
  state.creditResult = { balanceNgwee: 50_000, alreadyCredited: false };
  state.update.mockClear();
  state.addCredit.mockClear();
  state.activate.mockClear();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("settlePayment", () => {
  it("credits a top-up and never touches the subscription", async () => {
    // The bug this pins: the webhook and status-poll paths used to run every
    // successful payment through activatePaidSubscription, so a K500 top-up
    // was read as a plan purchase and rewrote the tenant's plan.
    const result = await settlePayment(TOPUP, "successful");

    expect(result).toEqual({ outcome: "credited", balanceNgwee: 50_000 });
    expect(state.addCredit).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      amountNgwee: 50_000,
      referenceType: "payment",
      referenceId: "pay-1",
    });
    expect(state.activate).not.toHaveBeenCalled();
  });

  it("activates the subscription for a plan purchase and adds no credit", async () => {
    const result = await settlePayment(SUBSCRIPTION, "successful");

    expect(result).toEqual({ outcome: "activated" });
    expect(state.activate).toHaveBeenCalledWith("tenant-1", "pay-2", 499);
    expect(state.addCredit).not.toHaveBeenCalled();
  });

  it("treats a missing purpose as a plan purchase", async () => {
    const result = await settlePayment({ ...SUBSCRIPTION, purpose: null }, "successful");
    expect(result).toEqual({ outcome: "activated" });
  });

  it("reports credit_failed rather than silently swallowing a paid top-up", async () => {
    state.creditResult = null;
    const result = await settlePayment(TOPUP, "successful");
    expect(result).toEqual({ outcome: "credit_failed" });
  });

  it("is a no-op on a payment that already settled", async () => {
    // Lipila retries callbacks and the browser can replay the return URL.
    const result = await settlePayment({ ...TOPUP, status: "successful" }, "successful");

    expect(result).toEqual({ outcome: "already_settled" });
    expect(state.update).not.toHaveBeenCalled();
    expect(state.addCredit).not.toHaveBeenCalled();
    expect(state.activate).not.toHaveBeenCalled();
  });

  it("grants nothing on a failed payment", async () => {
    const result = await settlePayment(SUBSCRIPTION, "failed");

    expect(result).toEqual({ outcome: "failed" });
    expect(state.activate).not.toHaveBeenCalled();
    expect(state.addCredit).not.toHaveBeenCalled();
  });

  it("stamps completed_at on success without overwriting a supplied one", async () => {
    await settlePayment(SUBSCRIPTION, "successful");
    expect(state.update.mock.calls[0][0].completed_at).toEqual(expect.any(String));

    state.update.mockClear();
    await settlePayment(SUBSCRIPTION, "successful", { completed_at: "2026-01-01T00:00:00Z" });
    expect(state.update.mock.calls[0][0].completed_at).toBe("2026-01-01T00:00:00Z");
  });

  it("drops undefined fields so they do not null out existing columns", async () => {
    await settlePayment(SUBSCRIPTION, "successful", {
      payment_type: "Card",
      lipila_identifier: undefined,
    });
    const patch = state.update.mock.calls[0][0];
    expect(patch.payment_type).toBe("Card");
    expect("lipila_identifier" in patch).toBe(false);
  });
});
