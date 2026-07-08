import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    // Tests run against package sources so they never depend on build order.
    alias: {
      "msvg-schema": r("./packages/schema/src/index.ts"),
      "msvg": r("./packages/core/src/index.ts"),
      "msvg-react": r("./packages/react/src/index.ts"),
    },
  },
  test: {
    environment: "happy-dom",
    include: [
      "packages/*/tests/**/*.test.ts",
      "packages/*/tests/**/*.test.tsx",
      "examples/*/tests/**/*.test.ts",
    ],
  },
});
