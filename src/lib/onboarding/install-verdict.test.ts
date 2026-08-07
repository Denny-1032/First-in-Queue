import { describe, it, expect } from "vitest";
import { decideInstallVerdict, type InstallProperty } from "./install-verdict";

const property = (over: Partial<InstallProperty> = {}): InstallProperty => ({
  install_status: "pending",
  first_seen_at: null,
  last_seen_at: null,
  allowed_domains: ["example.com"],
  ...over,
});

describe("decideInstallVerdict", () => {
  it("reports verified when a good heartbeat has been seen", () => {
    const v = decideInstallVerdict(
      property({
        install_status: "verified",
        first_seen_at: "2026-08-01T00:00:00Z",
        last_seen_at: "2026-08-02T00:00:00Z",
      }),
      undefined
    );
    expect(v).toEqual({ status: "verified", last_seen_at: "2026-08-02T00:00:00Z" });
  });

  it("does not trust a verified status that was never actually seen", () => {
    const v = decideInstallVerdict(
      property({ install_status: "verified", first_seen_at: null }),
      undefined
    );
    expect(v.status).toBe("waiting");
  });

  it("waits when nothing has arrived yet", () => {
    expect(decideInstallVerdict(property(), undefined)).toEqual({ status: "waiting" });
  });

  it("diagnoses a rejected origin and echoes the current allowlist", () => {
    const v = decideInstallVerdict(
      property({ allowed_domains: ["example.com"] }),
      "https://blog.example.com"
    );
    expect(v).toEqual({
      status: "origin_rejected",
      origin: "https://blog.example.com",
      allowed_domains: ["example.com"],
    });
  });

  it("still reports a rejection when the heartbeat carried no Origin header", () => {
    const v = decideInstallVerdict(property(), null);
    expect(v).toEqual({ status: "origin_rejected", origin: null, allowed_domains: ["example.com"] });
  });

  it("prefers a verified heartbeat over an older rejection", () => {
    const v = decideInstallVerdict(
      property({ install_status: "verified", first_seen_at: "2026-08-01T00:00:00Z" }),
      "https://blog.example.com"
    );
    expect(v.status).toBe("verified");
  });

  it("treats a stale install as not-yet-verified so the wizard keeps polling", () => {
    const v = decideInstallVerdict(
      property({ install_status: "stale", first_seen_at: "2026-07-01T00:00:00Z" }),
      undefined
    );
    expect(v.status).toBe("waiting");
  });

  it("tolerates a missing allowlist", () => {
    const v = decideInstallVerdict(
      property({ allowed_domains: undefined as unknown as string[] }),
      "https://x.com"
    );
    expect(v).toMatchObject({ status: "origin_rejected", allowed_domains: [] });
  });
});
