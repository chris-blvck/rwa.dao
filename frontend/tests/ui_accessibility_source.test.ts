import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("frontend accessibility source guards", () => {
  it("gives gallery modals dialog semantics, labelled search and category state", () => {
    const source = read("components/rwa/GalleryModal.tsx");

    expect(source).toContain('role="dialog"');
    expect(source).toContain('aria-modal="true"');
    expect(source).toContain("aria-labelledby");
    expect(source).toContain("aria-describedby");
    expect(source).toContain('name="gallery-search"');
    expect(source).toContain("htmlFor={searchId}");
    expect(source).toContain('role="tablist"');
    expect(source).toContain("aria-pressed={cat === c}");
  });

  it("exposes segmented controls and repeated library actions with unique accessible labels", () => {
    const ui = read("components/rwa/studio-ui.tsx");
    expect(ui).toContain("aria-pressed={value === o}");
    expect(ui).toContain("aria-label={`Remove ${creation.styleTitle} for ${creation.watchTitle}`}");

    const ctx = read("lib/rwa/studio-context.tsx");
    expect(ctx).toContain('aria-live="polite"');

    const studio = read("components/rwa/screens/StudioScreen.tsx");
    expect(studio).toContain('aria-modal="true"');
  });
});
