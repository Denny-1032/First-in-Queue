import { describe, it, expect, beforeEach, vi } from "vitest";
import type { NextRequest } from "next/server";

// This endpoint is unauthenticated and every success costs real Retell minutes,
// so the limiter is the only thing standing between a stranger and our bill.

const state = vi.hoisted(() => ({
  burst: null as unknown as ReturnType<typeof vi.fn>,
  createWebCall: null as unknown as ReturnType<typeof vi.fn>,
  allowedKeys: new Map<string, number>(),
}));

vi.mock("@/lib/properties/guard", () => {
  // Mirrors widget_bump_rate: count per key, allow while count <= limit.
  state.burst = vi.fn(async (key: string, limit: number) => {
    const next = (state.allowedKeys.get(key) || 0) + 1;
    state.allowedKeys.set(key, next);
    return next <= limit;
  });
  return { checkBurst: state.burst };
});

vi.mock("@/lib/supabase/server", () => {
  const chain: Record<string, unknown> = {};
  chain.from = vi.fn(() => chain);
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.insert = vi.fn(async () => ({ data: null, error: null }));
  chain.single = vi.fn(async () => ({
    data: {
      voice_agent_id: "va-1",
      id: "va-1",
      retell_agent_id: "retell-1",
      name: "FiQ Support",
      greeting_message: "Hi",
      tenant_id: "tenant-1",
    },
    error: null,
  }));
  return { getSupabaseAdmin: vi.fn(() => chain) };
});

vi.mock("retell-sdk", () => {
  state.createWebCall = vi.fn(async () => ({ call_id: "call-1", access_token: "tok-1" }));
  return {
    default: class Retell {
      call = { createWebCall: state.createWebCall };
    },
  };
});

import { POST } from "./route";

function post(ip = "41.63.0.1") {
  return POST({
    headers: new Headers({ "x-forwarded-for": ip }),
  } as unknown as NextRequest);
}

beforeEach(() => {
  state.allowedKeys.clear();
  state.burst.mockClear();
  state.createWebCall.mockClear();
  process.env.RETELL_API_KEY = "test-key";
});

describe("POST /api/voice/fiq-support/web-call", () => {
  it("starts a call for a first-time visitor", async () => {
    const res = await post();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.access_token).toBe("tok-1");
    expect(state.createWebCall).toHaveBeenCalledTimes(1);
  });

  it("cuts one visitor off after their hourly allowance", async () => {
    await post();
    await post();
    await post();
    const fourth = await post();

    expect(fourth.status).toBe(429);
    // The billed call is never created once the limit is hit.
    expect(state.createWebCall).toHaveBeenCalledTimes(3);
  });

  it("limits each visitor separately", async () => {
    await post("41.63.0.1");
    await post("41.63.0.1");
    await post("41.63.0.1");
    const other = await post("41.63.0.2");
    expect(other.status).toBe(200);
  });

  it("keys the per-visitor bucket on the caller's IP", async () => {
    await post("41.63.0.9");
    expect(state.burst).toHaveBeenCalledWith("fiqcall:ip:41.63.0.9", 3, 3600);
  });

  it("also holds a global ceiling, so spread-out IPs cannot run up the bill", async () => {
    // 60 calls from 60 different addresses exhausts the global bucket.
    for (let i = 0; i < 60; i++) await post(`10.0.0.${i}`);
    const overflow = await post("10.0.1.1");
    expect(overflow.status).toBe(429);
    expect(state.createWebCall).toHaveBeenCalledTimes(60);
  });
});
