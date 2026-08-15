import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@game/shared": fileURLToPath(new URL("../../packages/shared/src/index.ts", import.meta.url)),
      "@game/core": fileURLToPath(new URL("../../packages/core/src/index.ts", import.meta.url)),
      "@game/data": fileURLToPath(new URL("../../packages/data/src/index.ts", import.meta.url)),
      "@game/gameplay": fileURLToPath(new URL("../../packages/gameplay/src/index.ts", import.meta.url)),
      "@game/persistence": fileURLToPath(new URL("../../packages/persistence/src/index.ts", import.meta.url)),
    },
  },
  test: {
    name: "client",
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
