import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@game/shared": new URL("../shared/src/index.ts", import.meta.url).pathname,
    },
  },
  test: {
    name: "data",
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
