import type { ValidationResult } from "../diagnostics.js";
import { fail, ok } from "../diagnostics.js";
import { AssetRegistry } from "./asset-registry.js";
import { AssetValidator } from "./asset-validator.js";
import { AssetManifestDataSchema } from "./schemas.js";
import type { AssetManifestData } from "./types.js";

export function loadAssetManifestData(raw: unknown): ValidationResult<AssetRegistry> {
  const parsed = AssetManifestDataSchema.safeParse(raw);

  if (!parsed.success) {
    return fail([
      {
        severity: "error",
        code: "DATA_SCHEMA_INVALID",
        message: parsed.error.message,
      },
    ]);
  }

  const manifest: AssetManifestData = parsed.data;
  const validator = new AssetValidator();
  const issues = validator.validate(manifest);

  const errors = issues.filter((i) => i.severity === "error");
  if (errors.length > 0) {
    return fail(issues);
  }

  const registry = new AssetRegistry(manifest.assets);
  const warnings = issues.filter((i) => i.severity === "warning");
  return ok(registry, warnings);
}
