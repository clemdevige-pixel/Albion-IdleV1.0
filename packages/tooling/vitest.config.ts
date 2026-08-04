import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@game/shared": new URL("../shared/src/index.ts", import.meta.url).pathname,
      "@game/data": new URL("../data/src/index.ts", import.meta.url).pathname,
    },
  },
  test: {
    name: "tooling",
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
