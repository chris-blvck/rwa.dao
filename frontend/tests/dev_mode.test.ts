import { describe, expect, it } from "vitest";
import { canUseDevLiveMode, modeCookie, normalizeUiMode } from "@/lib/rwa/dev_mode";

describe("dev/admin live mode gate", () => {
  it("only enables the live switch when explicitly flagged", () => {
    expect(canUseDevLiveMode()).toBe(false);
    expect(canUseDevLiveMode("")).toBe(false);
    expect(canUseDevLiveMode("0")).toBe(false);
    expect(canUseDevLiveMode("1")).toBe(true);
  });

  it("forces public UI back to canned even when a live cookie exists", () => {
    expect(normalizeUiMode("live", false)).toBe("canned");
    expect(normalizeUiMode("canned", false)).toBe("canned");
    expect(normalizeUiMode("unexpected", false)).toBe("canned");
  });

  it("honors canned/live cookies only for dev/admin mode", () => {
    expect(normalizeUiMode("live", true)).toBe("live");
    expect(normalizeUiMode("canned", true)).toBe("canned");
    expect(normalizeUiMode("unexpected", true)).toBe("canned");
  });

  it("writes the same cookie shape used by the server proxy", () => {
    expect(modeCookie("canned")).toBe("rwa-mode=canned; path=/; max-age=2592000");
    expect(modeCookie("live")).toBe("rwa-mode=live; path=/; max-age=2592000");
  });
});
