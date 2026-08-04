import { existsSync } from "node:fs";
import { dirname, join, parse } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Walks up from a starting directory until it finds the monorepo root,
 * identified by the presence of `pnpm-workspace.yaml`.
 *
 * Throws if no root is found so callers fail loudly rather than reading from an
 * unexpected location.
 */
export function findRepoRoot(startDir: string = dirname(fileURLToPath(import.meta.url))): string {
  let current = startDir;
  const { root } = parse(current);

  while (true) {
    if (existsSync(join(current, "pnpm-workspace.yaml"))) {
      return current;
    }
    if (current === root) {
      throw new Error(`Could not locate monorepo root (pnpm-workspace.yaml) from ${startDir}`);
    }
    current = dirname(current);
  }
}
