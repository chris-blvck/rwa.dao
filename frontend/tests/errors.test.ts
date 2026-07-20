import { describe, expect, it } from "vitest";
import { describeError, FRONTEND_ERROR_CATALOG } from "@/lib/rwa/errors";

describe("frontend error catalog", () => {
  it("covers the 6 contract errors, all without live effect", () => {
    const keys = Object.keys(FRONTEND_ERROR_CATALOG);
    expect(keys).toEqual(
      expect.arrayContaining([
        "session_sequence_blocked",
        "session_not_found",
        "missing_required_configuration",
        "wallet_signature_blocked",
        "live_provider_call_blocked",
        "token_transfer_blocked",
      ]),
    );
    for (const k of keys) expect(FRONTEND_ERROR_CATALOG[k].live_effect).toBe(false);
  });

  it("maps the expected HTTP codes", () => {
    expect(FRONTEND_ERROR_CATALOG.session_sequence_blocked.status_code).toBe(409);
    expect(FRONTEND_ERROR_CATALOG.session_not_found.status_code).toBe(404);
    expect(FRONTEND_ERROR_CATALOG.missing_required_configuration.status_code).toBe(412);
    expect(FRONTEND_ERROR_CATALOG.live_provider_call_blocked.status_code).toBe(403);
  });

  it("describeError returns the known message or a fallback", () => {
    expect(describeError("token_transfer_blocked")).toContain("Token transfers");
    expect(describeError("unknown", "fallback")).toBe("fallback");
  });
});
