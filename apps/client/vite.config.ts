import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

function reloadOnGameplayRuntimeChange(): Plugin {
  const gameplaySourceMarker = "/packages/gameplay/src/";

  return {
    name: "reload-on-gameplay-runtime-change",
    handleHotUpdate({ file, server }) {
      const normalizedFile = file.replaceAll("\\", "/");
      if (!normalizedFile.includes(gameplaySourceMarker)) return;

      // Gameplay classes are instantiated once inside GameProvider. React Fast
      // Refresh can otherwise keep an instance created from the previous class
      // prototype while UI modules already consume the new API surface.
      server.ws.send({ type: "full-reload" });
      return [];
    },
  };
}

export default defineConfig({
  plugins: [react(), reloadOnGameplayRuntimeChange()],
  resolve: {
    alias: {
      // Consume internal workspace packages directly from source in dev/build so
      // the client never depends on stale prebuilt workspace artifacts.
      "node:fs/promises": fileURLToPath(new URL("./src/utils/emptyMock.ts", import.meta.url)),
      "node:fs": fileURLToPath(new URL("./src/utils/emptyMock.ts", import.meta.url)),
      "@game/shared": fileURLToPath(new URL("../../packages/shared/src/index.ts", import.meta.url)),
      "@game/core": fileURLToPath(new URL("../../packages/core/src/index.ts", import.meta.url)),
      "@game/data": fileURLToPath(new URL("../../packages/data/src/index.ts", import.meta.url)),
      "@game/gameplay": fileURLToPath(new URL("../../packages/gameplay/src/index.ts", import.meta.url)),
      "@game/persistence": fileURLToPath(new URL("../../packages/persistence/src/index.ts", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/auth": "http://127.0.0.1:3000",
      "/saves": "http://127.0.0.1:3000",
    },
  },
});
