import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getAuthSecret } from "./secret";

// NODE_ENV is read at call time, so each test can set it. Saved and restored so
// the surrounding suite is unaffected.
const ENV_KEYS = ["AUTH_TOKEN_SECRET", "SUPABASE_SERVICE_ROLE_KEY", "NODE_ENV"] as const;
const saved: Record<string, string | undefined> = {};

function setEnv(key: string, value: string | undefined) {
  if (value === undefined) delete (process.env as Record<string, string | undefined>)[key];
  else (process.env as Record<string, string | undefined>)[key] = value;
}

describe("getAuthSecret", () => {
  beforeEach(() => {
    for (const k of ENV_KEYS) saved[k] = process.env[k];
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    for (const k of ENV_KEYS) setEnv(k, saved[k]);
    vi.restoreAllMocks();
  });

  it("prefers AUTH_TOKEN_SECRET", () => {
    setEnv("AUTH_TOKEN_SECRET", "primary");
    setEnv("SUPABASE_SERVICE_ROLE_KEY", "service");
    expect(getAuthSecret()).toBe("primary");
  });

  it("falls back to the service role key", () => {
    setEnv("AUTH_TOKEN_SECRET", undefined);
    setEnv("SUPABASE_SERVICE_ROLE_KEY", "service");
    expect(getAuthSecret()).toBe("service");
  });

  it("prefers an explicit channel override over both env vars", () => {
    setEnv("AUTH_TOKEN_SECRET", "primary");
    expect(getAuthSecret("widget-specific")).toBe("widget-specific");
  });

  it("ignores an empty override and falls through", () => {
    setEnv("AUTH_TOKEN_SECRET", "primary");
    expect(getAuthSecret("")).toBe("primary");
    expect(getAuthSecret(undefined)).toBe("primary");
  });

  it("THROWS in production when no secret is configured", () => {
    setEnv("AUTH_TOKEN_SECRET", undefined);
    setEnv("SUPABASE_SERVICE_ROLE_KEY", undefined);
    setEnv("NODE_ENV", "production");
    // Signing with the public repo constant would make session cookies forgeable.
    expect(() => getAuthSecret()).toThrow(/No signing secret configured/);
  });

  it("returns the dev fallback outside production", () => {
    setEnv("AUTH_TOKEN_SECRET", undefined);
    setEnv("SUPABASE_SERVICE_ROLE_KEY", undefined);
    setEnv("NODE_ENV", "development");
    expect(getAuthSecret()).toBe("fiq-fallback-secret-change-me");
  });

  it("still resolves a real secret in production when one is set", () => {
    setEnv("NODE_ENV", "production");
    setEnv("AUTH_TOKEN_SECRET", "real-production-secret");
    expect(getAuthSecret()).toBe("real-production-secret");
  });
});
