import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

// Unit tests (Vitest). Target: the pure logic of the Tier 1 portal — catalog integrity
// (unique ids, compliance disclaimers) and error/UX-state mapping.
// No React rendering here (node environment).
export default defineConfig({
  test: { environment: "node", include: ["tests/**/*.test.ts"] },
  resolve: { alias: { "@": root } },
});
