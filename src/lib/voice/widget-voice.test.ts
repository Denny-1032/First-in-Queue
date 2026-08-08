import { describe, it, expect, beforeEach, vi } from "vitest";

// Voice is the only widget feature with real per-minute COGS, so these pin the
// gates that stand between a visitor's click and a Retell bill.

const state = vi.hoisted(() => ({
  /** `subscriptions` lookup result. */
  sub: null as unknown,
  /** `voice_agents` lookup result. */
  agent: null as unknown,
  throwOnQuery: false,
  minutes: { allowed: true, used: 0, limit: 30, remaining: 30 },
}));

vi.mock("@/lib/supabase/server", () => {
  const chain: Record<string, unknown> = {};
  let table = "";
  chain.from = vi.fn((t: string) => {
    table = t;
    return chain;
  });
  for (const m of ["select", "eq", "in", "order", "limit"]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.maybeSingle = vi.fn(async () => {
    if (state.throwOnQuery) throw new Error("boom");
    return { data: table === "voice_agents" ? state.agent : state.sub, error: null };
  });
  return { getSupabaseAdmin: vi.fn(() => chain) };
});

vi.mock("./usage", () => ({
  checkVoiceMinutes: vi.fn(async () => state.minutes),
}));

import { resolveWidgetVoice } from "./widget-voice";

const ON = { voice_enabled: true };
const AGENT = { id: "a-1", retell_agent_id: "retell-1" };

describe("resolveWidgetVoice", () => {
  beforeEach(() => {
    state.sub = { plan_id: "basic" };
    state.agent = AGENT;
    state.throwOnQuery = false;
    state.minutes = { allowed: true, used: 0, limit: 30, remaining: 30 };
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("paid plan + toggle on + minutes + agent → enabled", async () => {
    const v = await resolveWidgetVoice("t1", ON);
    expect(v.enabled).toBe(true);
    expect(v.retellAgentId).toBe("retell-1");
    expect(v.remainingMinutes).toBe(30);
  });

  it("off by default — branding must opt in", async () => {
    expect((await resolveWidgetVoice("t1", {})).reason).toBe("disabled");
    expect((await resolveWidgetVoice("t1", null)).reason).toBe("disabled");
  });

  it("free plan cannot enable voice however the toggle is set", async () => {
    state.sub = { plan_id: "free" };
    const v = await resolveWidgetVoice("t1", ON);
    expect(v.enabled).toBe(false);
    expect(v.reason).toBe("plan");
  });

  it("no subscription at all → blocked", async () => {
    state.sub = null;
    expect((await resolveWidgetVoice("t1", ON)).reason).toBe("plan");
  });

  it("monthly minutes exhausted → blocked", async () => {
    state.minutes = { allowed: false, used: 30, limit: 30, remaining: 0 };
    expect((await resolveWidgetVoice("t1", ON)).reason).toBe("no_minutes");
  });

  it("no active voice agent → blocked", async () => {
    state.agent = null;
    expect((await resolveWidgetVoice("t1", ON)).reason).toBe("no_agent");
  });

  it("an agent row without a Retell id is not usable", async () => {
    state.agent = { id: "a-1", retell_agent_id: null };
    expect((await resolveWidgetVoice("t1", ON)).reason).toBe("no_agent");
  });

  it("fails closed when the lookup throws", async () => {
    state.throwOnQuery = true;
    const v = await resolveWidgetVoice("t1", ON);
    expect(v.enabled).toBe(false);
    expect(v.retellAgentId).toBeNull();
  });

  it("a blocked result never leaks the Retell agent id", async () => {
    state.sub = { plan_id: "free" };
    expect((await resolveWidgetVoice("t1", ON)).retellAgentId).toBeNull();
  });
});
