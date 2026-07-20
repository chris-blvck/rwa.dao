import { describe, expect, it } from "vitest";
import { creationFilename, creationPostText } from "@/lib/rwa/library_actions";

describe("creationFilename", () => {
  it("builds a stable, slugified .mp4 name from the style + watch", () => {
    expect(creationFilename({ styleTitle: "Unboxing ASMR", watchTitle: "Encrypto Black Diamond" })).toBe(
      "rwa-dao-unboxing-asmr-encrypto-black-diamond.mp4",
    );
  });

  it("collapses punctuation/accents and trims stray dashes", () => {
    expect(creationFilename({ styleTitle: "Lux — Reveal!!", watchTitle: "  XDC / Rainbow  " })).toBe(
      "rwa-dao-lux-reveal-xdc-rainbow.mp4",
    );
  });

  it("falls back to 'video' when a title has no usable characters", () => {
    expect(creationFilename({ styleTitle: "★★★", watchTitle: "Encrypto" })).toBe("rwa-dao-video-encrypto.mp4");
  });
});

describe("creationPostText", () => {
  const c = { styleTitle: "Luxury Reveal", watchTitle: "Encrypto" };

  it("is on-brand and carries the core hashtags", () => {
    const t = creationPostText(c);
    expect(t).toContain("Luxury Reveal — the Encrypto.");
    expect(t).toContain("#RWADAO");
    expect(t).toContain("#XDC");
  });

  it("appends the mint link only when one is supplied", () => {
    expect(creationPostText(c)).not.toContain("http");
    const withLink = creationPostText(c, "https://rwadao.netlify.app/?ref=CREATOR1");
    expect(withLink.endsWith("https://rwadao.netlify.app/?ref=CREATOR1")).toBe(true);
  });
});
