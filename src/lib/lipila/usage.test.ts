import { describe, it, expect, beforeEach, vi } from "vitest";

// Controllable stand-in for the `subscriptions` .maybeSingle() result. Each test
// sets either a resolved value or an error to throw before calling the resolver.
const state = vi.hoisted(() => ({
  result: { data: null as unknown, error: null as unknown },
  throwOnQuery: false,
}));

vi.mock("@/lib/supabase/server", () => {
  const chain: Record<string, unknown> = {};
  // Every builder method returns the chain so calls compose fluently.
  for (const m of ["from", "select", "eq", "in", "order", "limit"]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.maybeSingle = vi.fn(async () => {
    if (state.throwOnQuery) throw new Error("boom");
    return state.result;
  });
  return { getSupabaseAdmin: vi.fn(() => chain) };
});

import { getWebReplyCeiling } from "./usage";

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
