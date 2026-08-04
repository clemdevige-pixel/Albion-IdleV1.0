import { join } from "node:path";
import { DataValidationError, loadAssetManifest } from "@game/data";

export interface AssetValidationSummary {
  manifestPath: string;
  assetCount: number;
}

/** Default location of the asset manifest relative to the repo root. */
export const ASSET_MANIFEST_RELATIVE = join("assets", "manifests", "asset-manifest.json");

/**
 * Validates the asset manifest.
 *
 * Beyond schema validation, this enforces that asset ids are globally unique.
 * Throws {@link DataValidationError} on any violation.
 */
export async function validateAssets(repoRoot: string): Promise<AssetValidationSummary> {
  const manifestPath = join(repoRoot, ASSET_MANIFEST_RELATIVE);
  const manifest = await loadAssetManifest(manifestPath);

  const seen = new Set<string>();
  for (const asset of manifest.assets) {
    if (seen.has(asset.id)) {
      throw new DataValidationError(manifestPath, [`duplicate asset id "${asset.id}"`]);
    }
    seen.add(asset.id);
  }

  return { manifestPath, assetCount: manifest.assets.length };
}
