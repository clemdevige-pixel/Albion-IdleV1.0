import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@game/shared": fileURLToPath(new URL("../shared/src/index.ts", import.meta.url)),
      "@game/data": fileURLToPath(new URL("../data/src/index.ts", import.meta.url)),
    },
  },
  test: {
    name: "tooling",
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
