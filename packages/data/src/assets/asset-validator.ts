import type { ValidationIssue } from "../diagnostics.js";
import type { AssetManifestData } from "./types.js";

export class AssetValidator {
  validate(manifest: AssetManifestData): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    const seenIds = new Set<string>();
    const seenPaths = new Set<string>();

    for (const asset of manifest.assets) {
      if (seenIds.has(asset.id)) {
        issues.push({
          severity: "error",
          code: "DATA_DUPLICATE_ID",
          message: `Duplicate asset ID: ${asset.id}`,
          recordId: asset.id,
        });
      }
      seenIds.add(asset.id);

      if (seenPaths.has(asset.path)) {
        issues.push({
          severity: "warning",
          code: "DATA_SEMANTIC_ERROR",
          message: `Duplicate asset path: ${asset.path}`,
          recordId: asset.id,
        });
      }
      seenPaths.add(asset.path);
    }

    return issues;
  }
}
