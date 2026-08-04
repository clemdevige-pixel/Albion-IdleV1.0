import type { Brand } from "./brand.js";
import type { ValidationIssue } from "./diagnostics.js";

/**
 * A branded string ID scoped to a data category.
 * Distinct from EntityId (runtime ECS) — this is for static content definitions.
 */
export type DataId<TCategory extends string> = Brand<string, TCategory>;

const DATA_ID_PATTERN = /^[a-z][a-z0-9_]*$/;

/**
 * Validates that `raw` is a well-formed data ID (non-empty, lowercase snake_case).
 * Returns null on success, or a ValidationIssue on failure.
 */
export function validateDataId(
  raw: string,
  category: string,
  source?: string,
): ValidationIssue | null {
  const base: Pick<ValidationIssue, "severity" | "code" | "category"> & { source?: string } = {
    severity: "error",
    code: "DATA_INVALID_ID",
    category,
  };
  if (source !== undefined) {
    base.source = source;
  }
  if (raw.length === 0) {
    return {
      ...base,
      message: `Empty ID in category "${category}"`,
    };
  }
  if (!DATA_ID_PATTERN.test(raw)) {
    return {
      ...base,
      message: `Invalid ID "${raw}" in category "${category}" — must match /^[a-z][a-z0-9_]*$/`,
    };
  }
  return null;
}

/**
 * Casts a validated string to a DataId. Caller must ensure it was validated first.
 */
export function asDataId<TCategory extends string>(raw: string): DataId<TCategory> {
  return raw as DataId<TCategory>;
}
