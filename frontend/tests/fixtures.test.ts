import { describe, expect, it } from "vitest";
import { cannedResponse } from "@/lib/rwa/fixtures";

describe("canned responses (offline mode)", () => {
  it("returns mode mock_only on happy paths", () => {
    for (const ep of ["health", "wallet", "human-prerequisites", "selection", "generation", "payment", "session-reset"]) {
      const r = cannedResponse(ep, ep === "health" || ep === "human-prerequisites" || ep === "selection" ? "GET" : "POST", {});
      expect(r.status).toBe(200);
      expect(r.body.mode).toBe("mock_only");
    }
  });

  it("blocks live preflight (412)", () => {
    const r = cannedResponse("preflight", "POST", { allow_provider_live: true });
    expect(r.status).toBe(412);
    expect(r.body.error).toBe("missing_required_configuration");
  });

  it("blocks live generation (403)", () => {
    const r = cannedResponse("generation", "POST", { live_call: true });
    expect(r.status).toBe(403);
    expect(r.body.error).toBe("live_provider_call_blocked");
  });

  it("blocks token transfer (403)", () => {
    const r = cannedResponse("payment", "POST", { allow_transfer: true });
    expect(r.status).toBe(403);
    expect(r.body.error).toBe("token_transfer_blocked");
  });

  it("exposes 7 human prerequisites without secrets", () => {
    const r = cannedResponse("human-prerequisites", "GET", {});
    expect((r.body.items as unknown[]).length).toBe(7);
    expect((r.body.safety as Record<string, unknown>).stores_secret_values).toBe(false);
  });
});
