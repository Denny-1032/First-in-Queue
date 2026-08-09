import { describe, it, expect, beforeEach, vi } from "vitest";

// Controllable stand-in for the `subscriptions` .maybeSingle() result. Each test
// sets either a resolved value or an error to throw before calling the resolver.
const state = vi.hoisted(() => ({
  result: { data: null as unknown, error: null as unknown },
  throwOnQuery: false,
  rpcResult: { data: null as unknown, error: null as unknown },
  rpc: null as unknown as ReturnType<typeof vi.fn>,
}));

vi.mock("@/lib/supabase/server", () => {
  const chain: Record<string, unknown> = {};
  // Every builder method returns the chain so calls compose fluently.
  for (const m of ["from", "select", "eq", "in", "order", "limit", "update"]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.maybeSingle = vi.fn(async () => {
    if (state.throwOnQuery) throw new Error("boom");
    return state.result;
  });
  state.rpc = vi.fn(async () => state.rpcResult);
  chain.rpc = state.rpc;
  return { getSupabaseAdmin: vi.fn(() => chain) };
});

vi.mock("@/lib/trial-helpers", () => ({
  ensureFreeSubscription: vi.fn(async () => null),
}));

import { getWebReplyCeiling, consumeConversation, CONVERSATION_WINDOW_HOURS } from "./usage";

function subOf(planId: string) {
  return { data: { plan_id: planId }, error: null };
}

describe("getWebReplyCeiling", () => {
  beforeEach(() => {
    state.result = { data: null, error: null };
    state.throwOnQuery = false;
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("free plan → 500", async () => {
    state.result = subOf("free");
    expect(await getWebReplyCeiling("t1")).toBe(500);
  });

  it("basic (Pro) plan → 5000", async () => {
    state.result = subOf("basic");
    expect(await getWebReplyCeiling("t1")).toBe(5000);
  });

  it("business plan → 5000", async () => {
    state.result = subOf("business");
    expect(await getWebReplyCeiling("t1")).toBe(5000);
  });

  it("enterprise plan → 50000 fair-use cap", async () => {
    state.result = subOf("enterprise");
    expect(await getWebReplyCeiling("t1")).toBe(50000);
  });

  it("no active subscription → free ceiling (500)", async () => {
    state.result = { data: null, error: null };
    expect(await getWebReplyCeiling("t1")).toBe(500);
  });

  it("unknown plan_id → free ceiling (500)", async () => {
    state.result = subOf("legacy_gold");
    expect(await getWebReplyCeiling("t1")).toBe(500);
  });

  it("query error → fails safe to free ceiling (500)", async () => {
    state.throwOnQuery = true;
    expect(await getWebReplyCeiling("t1")).toBe(500);
  });
});

describe("consumeConversation", () => {
  // The RPC is a set-returning function, so supabase-js hands back an array.
  function rpcRow(allowed: boolean, used: number, windowOpen: boolean) {
    return { data: [{ allowed, used, window_open: windowOpen }], error: null };
  }

  beforeEach(() => {
    state.result = subOf("basic"); // messagesPerMonth = 1000
    state.throwOnQuery = false;
    state.rpcResult = rpcRow(true, 1, false);
    state.rpc.mockClear();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("charges a new window and reports the plan limit", async () => {
    const r = await consumeConversation("t1", "whatsapp", "260970000000");
    expect(r).toMatchObject({ allowed: true, conversationsUsed: 1, conversationsLimit: 1000, windowOpen: false });
  });

  it("passes the 24h window and the tenant's limit to the RPC", async () => {
    await consumeConversation("t1", "whatsapp", "260970000000");
    expect(state.rpc).toHaveBeenCalledWith("consume_conversation", {
      p_tenant_id: "t1",
      p_channel: "whatsapp",
      p_customer_ref: "260970000000",
      p_limit: 1000,
      p_window_hours: CONVERSATION_WINDOW_HOURS,
    });
  });

  it("keys E.164 and bare-digit refs to the same window", async () => {
    await consumeConversation("t1", "whatsapp", "+260 97-000 0000");
    expect(state.rpc.mock.calls[0][1]).toMatchObject({ p_customer_ref: "260970000000" });
  });

  it("is free inside a live window", async () => {
    state.rpcResult = rpcRow(true, 7, true);
    const r = await consumeConversation("t1", "whatsapp", "260970000000");
    expect(r).toMatchObject({ allowed: true, conversationsUsed: 7, windowOpen: true });
  });

  it("blocks once the allowance is exhausted", async () => {
    state.rpcResult = rpcRow(false, 1000, false);
    const r = await consumeConversation("t1", "whatsapp", "260970000000");
    expect(r.allowed).toBe(false);
  });

  it("fails closed when the RPC errors", async () => {
    state.rpcResult = { data: null, error: { code: "40001", message: "deadlock" } };
    const r = await consumeConversation("t1", "whatsapp", "260970000000");
    expect(r).toMatchObject({ allowed: false, conversationsLimit: 1000 });
  });

  it("fails closed when the RPC returns no row", async () => {
    state.rpcResult = { data: [], error: null };
    const r = await consumeConversation("t1", "whatsapp", "260970000000");
    expect(r.allowed).toBe(false);
  });

  it("falls back to the message meter when migration 018 is not applied", async () => {
    // 42883 = undefined_function. Deliberately NOT fail-closed: this is the
    // window between a deploy and the migration, and taking WhatsApp down there
    // would be worse than one more cycle on the old meter.
    state.rpcResult = { data: null, error: { code: "42883", message: "function does not exist" } };
    state.result = { data: { id: "s1", plan_id: "basic", messages_used: 3 }, error: null };

    const r = await consumeConversation("t1", "whatsapp", "260970000000");
    expect(r).toMatchObject({ allowed: true, conversationsUsed: 3, conversationsLimit: 1000 });
  });

  it("blocks on the fallback path once messages_used hits the limit", async () => {
    state.rpcResult = { data: null, error: { code: "42883", message: "function does not exist" } };
    state.result = { data: { id: "s1", plan_id: "basic", messages_used: 1000 }, error: null };

    const r = await consumeConversation("t1", "whatsapp", "260970000000");
    expect(r.allowed).toBe(false);
  });

  it("fails closed when the tenant has no subscription at all", async () => {
    state.result = { data: null, error: null };
    const r = await consumeConversation("t1", "whatsapp", "260970000000");
    expect(r).toMatchObject({ allowed: false, planId: "none" });
    expect(state.rpc).not.toHaveBeenCalled();
  });
});
