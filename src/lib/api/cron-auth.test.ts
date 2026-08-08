import { describe, it, expect, afterEach, vi } from "vitest";
import type { NextRequest } from "next/server";
import { rejectUnauthorizedCron } from "./cron-auth";

// The helper only touches request.headers.get("authorization"), so a minimal
// stub stands in for NextRequest.
function req(authHeader?: string): NextRequest {
  return {
    headers: { get: (k: string) => (k.toLowerCase() === "authorization" ? authHeader ?? null : null) },
  } as unknown as NextRequest;
}

async function statusOf(res: ReturnType<typeof rejectUnauthorizedCron>): Promise<number | null> {
  return res ? res.status : null;
}

describe("rejectUnauthorizedCron", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("unset secret outside production → allowed (null)", () => {
    vi.stubEnv("CRON_SECRET", "");
    vi.stubEnv("NODE_ENV", "test");
    expect(rejectUnauthorizedCron(req("Bearer whatever"), "x")).toBeNull();
  });

  it("unset secret in production → 503, fails closed", async () => {
    vi.stubEnv("CRON_SECRET", "");
    vi.stubEnv("NODE_ENV", "production");
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await statusOf(rejectUnauthorizedCron(req("Bearer whatever"), "x"))).toBe(503);
  });

  it("matching bearer token → allowed", () => {
    vi.stubEnv("CRON_SECRET", "s3cret-value");
    vi.stubEnv("NODE_ENV", "production");
    expect(rejectUnauthorizedCron(req("Bearer s3cret-value"), "x")).toBeNull();
  });

  it("trailing newline on the STORED secret is tolerated", () => {
    vi.stubEnv("CRON_SECRET", "s3cret-value\n");
    vi.stubEnv("NODE_ENV", "production");
    expect(rejectUnauthorizedCron(req("Bearer s3cret-value"), "x")).toBeNull();
  });

  it("trailing space on the PRESENTED token is tolerated", () => {
    vi.stubEnv("CRON_SECRET", "s3cret-value");
    vi.stubEnv("NODE_ENV", "production");
    expect(rejectUnauthorizedCron(req("Bearer s3cret-value  "), "x")).toBeNull();
  });

  it("wrong token → 401", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret-value");
    vi.stubEnv("NODE_ENV", "production");
    expect(await statusOf(rejectUnauthorizedCron(req("Bearer nope"), "x"))).toBe(401);
  });

  it("missing Authorization header → 401", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret-value");
    vi.stubEnv("NODE_ENV", "production");
    expect(await statusOf(rejectUnauthorizedCron(req(undefined), "x"))).toBe(401);
  });

  it("case-insensitive Bearer scheme is accepted", () => {
    vi.stubEnv("CRON_SECRET", "s3cret-value");
    vi.stubEnv("NODE_ENV", "production");
    expect(rejectUnauthorizedCron(req("bearer s3cret-value"), "x")).toBeNull();
  });
});
