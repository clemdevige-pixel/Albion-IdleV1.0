import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Consume the shared package directly from source in dev and build so the
      // client never needs a prebuilt artifact of an internal workspace package.
      "@game/shared": fileURLToPath(new URL("../../packages/shared/src/index.ts", import.meta.url)),
      "@game/core": fileURLToPath(new URL("../../packages/core/src/index.ts", import.meta.url)),
      "@game/gameplay": fileURLToPath(new URL("../../packages/gameplay/src/index.ts", import.meta.url)),
    },
  },
  server: {
    port: 5173,
  },
});
