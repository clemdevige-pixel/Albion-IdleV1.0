import { DataValidationError } from "@game/data";
import { findRepoRoot } from "../repo-root.js";
import { validateData } from "../validate-data.js";

async function main(): Promise<void> {
  const repoRoot = findRepoRoot();
  const summary = await validateData(repoRoot);

  console.log(
    `[validate:data] Content manifest OK — ${summary.collectionCount} collection(s), ` +
      `${summary.entryCount} entry(ies) validated (${summary.manifestPath}).`,
  );

  if (summary.dataFileCount > 0) {
    console.log(
      `[validate:data] Data files OK — ${summary.dataFileCount} file(s), ` +
        `${summary.dataRecordCount} record(s) validated.`,
    );
  } else {
    console.log(`[validate:data] No data files found in content/data/ (OK).`);
  }

  for (const w of summary.dataWarnings) {
    console.warn(`[validate:data] WARNING: ${w}`);
  }

  console.log(`[validate:data] PASS`);
}

main().catch((error: unknown) => {
  if (error instanceof DataValidationError) {
    console.error(`[validate:data] FAILED\n${error.message}`);
  } else {
    console.error("[validate:data] Unexpected error:", error);
  }
  process.exitCode = 1;
});
