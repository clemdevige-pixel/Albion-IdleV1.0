import { join } from "node:path";
import { readdir } from "node:fs/promises";
import {
  DataValidationError,
  loadContentManifest,
  DataFileSchema,
  loadJsonFile,
} from "@game/data";

export interface DataValidationSummary {
  manifestPath: string;
  collectionCount: number;
  entryCount: number;
  dataFileCount: number;
  dataRecordCount: number;
  dataWarnings: readonly string[];
}

/** Default location of the content manifest relative to the repo root. */
export const CONTENT_MANIFEST_RELATIVE = join("content", "json", "manifest.json");

/** Default location of data files relative to the repo root. */
export const DATA_DIR_RELATIVE = join("content", "data");

/**
 * Validates all game content reachable from the content manifest,
 * plus any data files in content/data/.
 */
export async function validateData(repoRoot: string): Promise<DataValidationSummary> {
  const manifestPath = join(repoRoot, CONTENT_MANIFEST_RELATIVE);
  const manifest = await loadContentManifest(manifestPath);

  let entryCount = 0;
  for (const collection of manifest.collections) {
    const seen = new Set<string>();
    for (const entry of collection.entries) {
      if (seen.has(entry.id)) {
        throw new DataValidationError(manifestPath, [
          `collection "${collection.id}" has duplicate entry id "${entry.id}"`,
        ]);
      }
      seen.add(entry.id);
      entryCount += 1;
    }
  }

  // Discover and validate data files
  const dataDir = join(repoRoot, DATA_DIR_RELATIVE);
  let dataFileCount = 0;
  let dataRecordCount = 0;
  const dataWarnings: string[] = [];

  let dataFiles: string[] = [];
  try {
    const entries = await readdir(dataDir);
    dataFiles = entries.filter((f) => f.endsWith(".json")).sort();
  } catch {
    // No content/data directory — that's fine
  }

  for (const file of dataFiles) {
    const filePath = join(dataDir, file);
    try {
      const data = await loadJsonFile(filePath, DataFileSchema);
      dataFileCount += 1;
      dataRecordCount += data.definitions.length;
    } catch (err) {
      if (err instanceof DataValidationError) {
        throw err;
      }
      throw new DataValidationError(filePath, [
        err instanceof Error ? err.message : String(err),
      ]);
    }
  }

  return {
    manifestPath,
    collectionCount: manifest.collections.length,
    entryCount,
    dataFileCount,
    dataRecordCount,
    dataWarnings,
  };
}
