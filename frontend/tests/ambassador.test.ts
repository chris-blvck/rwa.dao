import { describe, expect, it } from "vitest";
import { captureReferral, localAmbassador, stableSeed } from "@/lib/rwa/ambassador";

describe("ambassador identity", () => {
  it("uses the wallet address as the seed when present (deterministic)", () => {
    expect(stableSeed("0xAbC123")).toBe("0xAbC123");
  });

  it("localAmbassador returns a local-mode state without throwing", () => {
    const s = localAmbassador();
    expect(s.mode).toBe("local");
    expect(s).toHaveProperty("code");
    expect(s).toHaveProperty("referredBy");
  });

  it("captureReferral is safe to call", () => {
    expect(() => captureReferral("ABC123")).not.toThrow();
  });
});
