import { DataValidationError } from "@game/data";
import { findRepoRoot } from "../repo-root.js";
import { validateAssets } from "../validate-assets.js";

async function main(): Promise<void> {
  const repoRoot = findRepoRoot();
  const summary = await validateAssets(repoRoot);
  console.log(
    `[validate:assets] OK — ${summary.assetCount} asset(s) validated (${summary.manifestPath}).`,
  );
}

main().catch((error: unknown) => {
  if (error instanceof DataValidationError) {
    console.error(`[validate:assets] FAILED\n${error.message}`);
  } else {
    console.error("[validate:assets] Unexpected error:", error);
  }
  process.exitCode = 1;
});
