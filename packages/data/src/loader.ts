import { readFile } from "node:fs/promises";
import type { ZodTypeAny, output as ZodOutput } from "zod";
import { DataValidationError } from "./errors.js";
import { ContentManifestSchema, type ContentManifest } from "./schemas/content-manifest.js";
import { AssetManifestSchema, type AssetManifest } from "./schemas/asset-manifest.js";

/**
 * Reads a JSON file and validates it against a Zod schema.
 *
 * Throws {@link DataValidationError} on missing file, malformed JSON, or schema
 * violations — always with the source path and a human-readable issue list.
 */
export async function loadJsonFile<S extends ZodTypeAny>(
  filePath: string,
  schema: S,
): Promise<ZodOutput<S>> {
  let raw: string;
  try {
    raw = await readFile(filePath, "utf8");
  } catch (cause) {
    throw new DataValidationError(filePath, ["file could not be read"], { cause });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (cause) {
    throw new DataValidationError(filePath, ["file is not valid JSON"], { cause });
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues.map(
      (issue) => `${issue.path.join(".") || "<root>"}: ${issue.message}`,
    );
    throw new DataValidationError(filePath, issues);
  }

  // `result.data` is the schema's validated output. Through the generic `S` the
  // linter widens it to `any`, so this narrow, justified disable is required.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return result.data;
}

/** Loads and validates the root content manifest. */
export function loadContentManifest(filePath: string): Promise<ContentManifest> {
  return loadJsonFile(filePath, ContentManifestSchema);
}

/** Loads and validates the root asset manifest. */
export function loadAssetManifest(filePath: string): Promise<AssetManifest> {
  return loadJsonFile(filePath, AssetManifestSchema);
}
