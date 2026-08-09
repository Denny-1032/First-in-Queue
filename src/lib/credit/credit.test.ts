import { describe, it, expect, beforeEach, vi } from "vitest";

// Stand-in for the supabase client. `rpcResult` drives the RPC calls;
// `selectResult` drives the balance/ledger reads.
const state = vi.hoisted(() => ({
  rpcResult: { data: null as unknown, error: null as unknown },
  selectResult: { data: null as unknown, error: null as unknown },
  rpc: null as unknown as ReturnType<typeof vi.fn>,
  throwOnRpc: false,
}));

vi.mock("@/lib/supabase/server", () => {
  const chain: Record<string, unknown> = {};
  for (const m of ["from", "select", "eq", "lt", "gte", "order"]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.maybeSingle = vi.fn(async () => state.selectResult);
  // Terminal await on a query builder (no .maybeSingle()) resolves the chain.
  chain.then = (resolve: (v: unknown) => unknown) => resolve(state.selectResult);
  state.rpc = vi.fn(async () => {
    if (state.throwOnRpc) throw new Error("connection lost");
    return state.rpcResult;
  });
  chain.rpc = state.rpc;
  return { getSupabaseAdmin: vi.fn(() => chain) };
});

import {
  consumeCredit,
  addCredit,
  getCreditBalance,
  getCreditForecast,
  chargeVoiceOverage,
  chargeWhatsAppOverage,
} from "./credit";
import { CREDIT_RATES, formatNgwee, kwachaToNgwee } from "./rates";

function consumeRow(allowed: boolean, balance: number, already = false) {
  return { data: [{ allowed, balance_ngwee: balance, already_charged: already }], error: null };
}

beforeEach(() => {
  state.throwOnRpc = false;
  state.rpcResult = consumeRow(true, 19_830);
  state.selectResult = { data: null, error: null };
  state.rpc.mockClear();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("ngwee arithmetic", () => {
  it("converts kwacha to integer ngwee without float drift", () => {
    expect(kwachaToNgwee(1.7)).toBe(170);
    expect(kwachaToNgwee(200)).toBe(20_000);
    // 0.1 + 0.2 territory: this must not land on 1004.9999999999999
    expect(kwachaToNgwee(10.05)).toBe(1005);
  });

  it("formats ngwee back to kwacha for display", () => {
    expect(formatNgwee(170)).toBe("K1.70");
    expect(formatNgwee(0)).toBe("K0.00");
  });

  it("prices match the published overage rates", () => {
    // /pricing and the FiQ knowledge base both advertise K1.70/message and
    // K7.00/minute. If these drift apart, a customer catches us charging
    // something other than what we published.
    expect(formatNgwee(CREDIT_RATES.WHATSAPP_REPLY_NGWEE)).toBe("K1.70");
    expect(formatNgwee(CREDIT_RATES.VOICE_MINUTE_NGWEE)).toBe("K7.00");
  });
});

describe("consumeCredit", () => {
  it("spends and reports the new balance", async () => {
    const r = await consumeCredit({ tenantId: "t1", source: "whatsapp_reply", amountNgwee: 170 });
    expect(r).toEqual({ allowed: true, balanceNgwee: 19_830, alreadyCharged: false });
  });

  it("refuses when the balance will not cover it", async () => {
    state.rpcResult = consumeRow(false, 40);
    const r = await consumeCredit({ tenantId: "t1", source: "whatsapp_reply", amountNgwee: 170 });
    expect(r.allowed).toBe(false);
    expect(r.balanceNgwee).toBe(40);
  });

  it("reports an earlier charge for the same reference without spending again", async () => {
    state.rpcResult = consumeRow(true, 19_830, true);
    const r = await consumeCredit({
      tenantId: "t1",
      source: "voice_minute",
      amountNgwee: 700,
      referenceId: "call_abc",
    });
    expect(r).toMatchObject({ allowed: true, alreadyCharged: true });
  });

  it("fails closed on an RPC error", async () => {
    state.rpcResult = { data: null, error: { code: "42883", message: "no function" } };
    const r = await consumeCredit({ tenantId: "t1", source: "whatsapp_reply", amountNgwee: 170 });
    expect(r.allowed).toBe(false);
  });

  it("fails closed when the connection throws", async () => {
    state.throwOnRpc = true;
    const r = await consumeCredit({ tenantId: "t1", source: "whatsapp_reply", amountNgwee: 170 });
    expect(r.allowed).toBe(false);
  });

  it("fails closed when the RPC returns no row", async () => {
    state.rpcResult = { data: [], error: null };
    const r = await consumeCredit({ tenantId: "t1", source: "whatsapp_reply", amountNgwee: 170 });
    expect(r.allowed).toBe(false);
  });
});

describe("overage charges", () => {
  it("charges one WhatsApp reply at the published rate, keyed for idempotency", async () => {
    await chargeWhatsAppOverage("t1", "wamid.123");
    expect(state.rpc).toHaveBeenCalledWith(
      "consume_credit",
      expect.objectContaining({
        p_source: "whatsapp_reply",
        p_amount_ngwee: 170,
        p_reference_id: "wamid.123",
        p_quantity: 1,
      })
    );
  });

  it("multiplies voice minutes by the per-minute rate", async () => {
    await chargeVoiceOverage("t1", 3, "call_abc");
    expect(state.rpc).toHaveBeenCalledWith(
      "consume_credit",
      expect.objectContaining({
        p_source: "voice_minute",
        p_amount_ngwee: 2100, // 3 x K7.00
        p_reference_id: "call_abc",
        p_quantity: 3,
      })
    );
  });
});

describe("addCredit", () => {
  it("returns the new balance", async () => {
    state.rpcResult = { data: [{ balance_ngwee: 20_000, already_credited: false }], error: null };
    const r = await addCredit({ tenantId: "t1", amountNgwee: 20_000, referenceId: "pay-1" });
    expect(r).toEqual({ balanceNgwee: 20_000, alreadyCredited: false });
  });

  it("does not double-credit a replayed payment", async () => {
    state.rpcResult = { data: [{ balance_ngwee: 20_000, already_credited: true }], error: null };
    const r = await addCredit({ tenantId: "t1", amountNgwee: 20_000, referenceId: "pay-1" });
    expect(r?.alreadyCredited).toBe(true);
  });

  it("returns null on error rather than pretending the credit landed", async () => {
    state.rpcResult = { data: null, error: { message: "boom" } };
    expect(await addCredit({ tenantId: "t1", amountNgwee: 20_000 })).toBeNull();
  });
});

describe("getCreditBalance", () => {
  it("returns 0 for a tenant that has never topped up", async () => {
    state.selectResult = { data: null, error: null };
    expect(await getCreditBalance("t1")).toBe(0);
  });

  it("returns the stored balance", async () => {
    state.selectResult = { data: { balance_ngwee: 12_345 }, error: null };
    expect(await getCreditBalance("t1")).toBe(12_345);
  });
});

describe("getCreditForecast", () => {
  const day = 24 * 60 * 60 * 1000;

  it("reports no estimate when there is no draw-down history", async () => {
    state.selectResult = { data: [], error: null };
    const f = await getCreditForecast("t1");
    expect(f.daysRemaining).toBeNull();
    expect(f.sampleSize).toBe(0);
  });

  it("derives days remaining from the tenant's own observed burn", async () => {
    // Both the balance read and the ledger read draw from selectResult in this
    // mock, so this asserts the burn rate only - the balance itself is covered
    // by the getCreditBalance tests above.
    state.selectResult = {
      data: [
        { amount_ngwee: -700, created_at: new Date(Date.now() - 4 * day).toISOString() },
        { amount_ngwee: -700, created_at: new Date(Date.now() - 2 * day).toISOString() },
      ],
      error: null,
    };
    const f = await getCreditForecast("t1");
    // 1,400 ngwee spent over the 4 days since the first draw-down = 350/day.
    expect(Math.round(f.burnRateNgweePerDay)).toBe(350);
    expect(f.sampleSize).toBe(2);
  });

  it("measures from the first draw-down, not the whole window", async () => {
    // A tenant one day into using credit must not have its rate divided by 14
    // and be told the balance lasts fourteen times as long as it will.
    state.selectResult = {
      data: [{ amount_ngwee: -7000, created_at: new Date(Date.now() - 1 * day).toISOString() }],
      error: null,
    };
    const f = await getCreditForecast("t1", 14);
    expect(Math.round(f.burnRateNgweePerDay)).toBe(7000);
  });
});
