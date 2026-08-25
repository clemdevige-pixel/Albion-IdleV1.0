import { defineWorkspace } from "vitest/config";

// Each package/app that owns tests declares its own vitest config.
// This workspace lets `pnpm test` run the entire suite from the root.
export default defineWorkspace([
  "packages/shared",
  "packages/core",
  "packages/data",
  "packages/tooling",
  "packages/persistence",
  "packages/gameplay",
  "apps/server",
  "apps/client",
]);
