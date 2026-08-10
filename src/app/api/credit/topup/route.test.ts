import { describe, it, expect, beforeEach, vi } from "vitest";
import type { NextRequest } from "next/server";

// The card path is only safe because the payment row carries
// purpose='credit_topup' and payment_method='card': settlePayment and the
// /api/payments/confirm redirect both branch on `purpose` and need no changes.
// These tests pin that contract down.

const state = vi.hoisted(() => ({
  insert: null as unknown as ReturnType<typeof vi.fn>,
  collectCard: null as unknown as ReturnType<typeof vi.fn>,
  collectMoMo: null as unknown as ReturnType<typeof vi.fn>,
  cardRedirectionUrl: "https://checkout.lipila.test/pay/abc" as string | null,
}));

vi.mock("@/lib/supabase/server", () => {
  const chain: Record<string, unknown> = {};
  chain.from = vi.fn(() => chain);
  state.insert = vi.fn(() => chain);
  chain.insert = state.insert;
  chain.update = vi.fn(() => chain);
  chain.eq = vi.fn(async () => ({ data: null, error: null }));
  chain.select = vi.fn(() => chain);
  chain.single = vi.fn(async () => ({ data: { id: "pay-1" }, error: null }));
  return { getSupabaseAdmin: vi.fn(() => chain) };
});

vi.mock("@/lib/auth/session", () => ({
  requireSession: vi.fn(async () => ({ tenantId: "tenant-1", email: "owner@shop.zm" })),
  AuthError: class AuthError extends Error {
    status = 401;
  },
}));

vi.mock("@/lib/lipila/client", () => {
  state.collectCard = vi.fn(async () => ({
    status: "Pending",
    paymentType: "Card",
    identifier: "lip-card-1",
    cardRedirectionUrl: state.cardRedirectionUrl,
  }));
  state.collectMoMo = vi.fn(async () => ({
    status: "Pending",
    paymentType: "AirtelMoney",
    identifier: "lip-momo-1",
    cardRedirectionUrl: null,
  }));
  return {
    collectCard: state.collectCard,
    collectMobileMoney: state.collectMoMo,
    generateReferenceId: () => "REF-TEST-1",
    formatZambianPhone: (p: string) => `260${p.replace(/\D/g, "").slice(-9)}`,
  };
});

import { POST } from "./route";

function post(body: Record<string, unknown>) {
  return POST({ json: async () => body } as unknown as NextRequest);
}

beforeEach(() => {
  state.cardRedirectionUrl = "https://checkout.lipila.test/pay/abc";
  state.insert.mockClear();
  state.collectCard.mockClear();
  state.collectMoMo.mockClear();
});

describe("POST /api/credit/topup", () => {
  it("routes a card top-up to Lipila's card collection and returns the checkout URL", async () => {
    const res = await post({
      packId: "k200",
      paymentMethod: "card",
      phoneNumber: "0971234567",
      email: "owner@shop.zm",
      firstName: "Ada",
      lastName: "Mwale",
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.cardRedirectionUrl).toBe("https://checkout.lipila.test/pay/abc");
    expect(state.collectCard).toHaveBeenCalledTimes(1);
    expect(state.collectMoMo).not.toHaveBeenCalled();

    // The two fields the settlement path keys off.
    const row = state.insert.mock.calls[0][0];
    expect(row.purpose).toBe("credit_topup");
    expect(row.payment_method).toBe("card");
    expect(row.amount).toBe(200);
  });

  it("sends the customer back through confirm, which re-checks before crediting", async () => {
    await post({
      packId: "k200",
      paymentMethod: "card",
      phoneNumber: "0971234567",
      email: "owner@shop.zm",
    });
    const { collectionRequest } = state.collectCard.mock.calls[0][0];
    expect(collectionRequest.backUrl).toContain("/api/payments/confirm?ref=REF-TEST-1");
  });

  it("still defaults to mobile money when no method is given", async () => {
    const res = await post({ packId: "k500", phoneNumber: "0971234567" });
    const body = await res.json();

    expect(body.paymentMethod).toBe("mobile_money");
    expect(state.collectMoMo).toHaveBeenCalledTimes(1);
    expect(state.insert.mock.calls[0][0].payment_method).toBe("mobile_money");
  });

  it("fails loudly rather than silently when Lipila returns no checkout URL", async () => {
    state.cardRedirectionUrl = null;
    const res = await post({
      packId: "k200",
      paymentMethod: "card",
      phoneNumber: "0971234567",
      email: "owner@shop.zm",
    });
    expect(res.status).toBe(502);
  });

  it("rejects an unknown method instead of falling through to mobile money", async () => {
    const res = await post({
      packId: "k200",
      paymentMethod: "bitcoin",
      phoneNumber: "0971234567",
    });
    expect(res.status).toBe(400);
    expect(state.collectMoMo).not.toHaveBeenCalled();
    expect(state.collectCard).not.toHaveBeenCalled();
  });
});
