import type { DataCategory } from "../category.js";
import { validateDataId } from "../data-id.js";
import type { ValidationIssue, ValidationResult } from "../diagnostics.js";
import { DataRegistry } from "../registry.js";
import { DataFileSchema } from "../schemas/data-file.js";
import type { DataSource } from "../source.js";
import type { SemanticValidator, SemanticValidationContext } from "../validation.js";

// ---------------------------------------------------------------------------
// Public API types
// ---------------------------------------------------------------------------

export interface DataLoaderConfig {
  readonly categories: readonly DataCategory<unknown, string>[];
  readonly sources: readonly DataSource[];
  readonly validators?: readonly SemanticValidator[];
}

export interface LoadedRegistries {
  getRegistry<TRecord, TCategory extends string>(
    category: DataCategory<TRecord, TCategory>,
  ): DataRegistry<TRecord, TCategory>;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface ParsedEnvelope {
  readonly sourceId: string;
  readonly version: number;
  readonly category: string;
  readonly definitions: ReadonlyArray<Record<string, unknown>>;
}

function parseSource(
  sourceId: string,
  raw: unknown,
  issues: ValidationIssue[],
): ParsedEnvelope | null {
  const envelopeResult = DataFileSchema.safeParse(raw);
  if (!envelopeResult.success) {
    for (const zodIssue of envelopeResult.error.issues) {
      issues.push({
        severity: "error",
        code: "DATA_PARSE_ERROR",
        message: `[${sourceId}] Envelope error at ${zodIssue.path.join(".") || "<root>"}: ${zodIssue.message}`,
        source: sourceId,
      });
    }
    return null;
  }
  return {
    sourceId,
    version: envelopeResult.data.version,
    category: envelopeResult.data.category,
    definitions: envelopeResult.data.definitions,
  };
}

// ---------------------------------------------------------------------------
// Main loader
// ---------------------------------------------------------------------------

export async function loadData(
  config: DataLoaderConfig,
): Promise<ValidationResult<LoadedRegistries>> {
  const issues: ValidationIssue[] = [];

  // Build category lookup
  const categoryMap = new Map<string, DataCategory<unknown, string>>();
  for (const cat of config.categories) {
    categoryMap.set(cat.category, cat);
  }

  // Accumulate records per category: Map<categoryName, Map<id, record>>
  const recordMaps = new Map<string, Map<string, unknown>>();
  for (const cat of config.categories) {
    recordMaps.set(cat.category, new Map());
  }

  // Sort sources deterministically
  const sortedSources = [...config.sources].sort((a, b) =>
    a.sourceId.localeCompare(b.sourceId),
  );

  // 1. Load & parse each source
  const envelopes: ParsedEnvelope[] = [];
  for (const source of sortedSources) {
    let raw: unknown;
    try {
      raw = await source.load();
    } catch (err) {
      issues.push({
        severity: "error",
        code: "DATA_PARSE_ERROR",
        message: `[${source.sourceId}] Failed to load: ${err instanceof Error ? err.message : String(err)}`,
        source: source.sourceId,
      });
      continue;
    }
    const envelope = parseSource(source.sourceId, raw, issues);
    if (envelope) {
      envelopes.push(envelope);
    }
  }

  // 2. For each envelope, validate category, version, schema, IDs, duplicates
  for (const env of envelopes) {
    const cat = categoryMap.get(env.category);
    if (!cat) {
      issues.push({
        severity: "error",
        code: "DATA_PARSE_ERROR",
        message: `[${env.sourceId}] Unknown category "${env.category}"`,
        source: env.sourceId,
        category: env.category,
      });
      continue;
    }

    if (env.version !== cat.version) {
      issues.push({
        severity: "error",
        code: "DATA_UNSUPPORTED_VERSION",
        message: `[${env.sourceId}] Version ${env.version} for category "${env.category}" — expected ${cat.version}`,
        source: env.sourceId,
        category: env.category,
      });
      continue;
    }

    const records = recordMaps.get(env.category)!;

    for (const rawDef of env.definitions) {
      // Schema validation
      const schemaResult = cat.schema.safeParse(rawDef);
      if (!schemaResult.success) {
        for (const zodIssue of schemaResult.error.issues) {
          issues.push({
            severity: "error",
            code: "DATA_SCHEMA_INVALID",
            message: `[${env.sourceId}] Schema error at ${zodIssue.path.join(".") || "<root>"}: ${zodIssue.message}`,
            source: env.sourceId,
            category: env.category,
          });
        }
        continue;
      }

      const record: unknown = schemaResult.data;
      const id = cat.getId(record);
      const trimmedId = String(id).trim();

      // Validate ID format
      const idIssue = validateDataId(trimmedId, env.category, env.sourceId);
      if (idIssue) {
        issues.push(idIssue);
        continue;
      }

      // Duplicate detection
      if (records.has(trimmedId)) {
        issues.push({
          severity: "error",
          code: "DATA_DUPLICATE_ID",
          message: `[${env.sourceId}] Duplicate ID "${trimmedId}" in category "${env.category}"`,
          source: env.sourceId,
          category: env.category,
          recordId: trimmedId,
        });
        continue;
      }

      records.set(trimmedId, record);
    }
  }

  // 3. Reference resolution
  for (const cat of config.categories) {
    if (!cat.getReferences) continue;
    const records = recordMaps.get(cat.category)!;
    for (const [id, record] of records) {
      const refs = cat.getReferences(record);
      for (const ref of refs) {
        const targetRecords = recordMaps.get(ref.targetCategory);
        if (!targetRecords) {
          issues.push({
            severity: "error",
            code: "DATA_UNKNOWN_REFERENCE",
            message: `Record "${id}" in "${cat.category}" references unknown category "${ref.targetCategory}"`,
            category: cat.category,
            recordId: id,
          });
          continue;
        }
        if (!targetRecords.has(ref.targetId)) {
          issues.push({
            severity: "error",
            code: "DATA_UNKNOWN_REFERENCE",
            message: `Record "${id}" in "${cat.category}" references unknown ID "${ref.targetId}" in category "${ref.targetCategory}"`,
            category: cat.category,
            recordId: id,
          });
        }
      }
    }
  }

  // 4. Semantic validation
  const warnings: ValidationIssue[] = [];
  if (config.validators && config.validators.length > 0) {
    const context: SemanticValidationContext = {
      getRecords<TRecord, TCategory extends string>(
        category: DataCategory<TRecord, TCategory>,
      ): readonly TRecord[] {
        const records = recordMaps.get(category.category);
        if (!records) return [];
        return [...records.values()] as TRecord[];
      },
    };

    for (const validator of config.validators) {
      const validatorIssues = validator.validate(context);
      for (const issue of validatorIssues) {
        if (issue.severity === "warning") {
          warnings.push(issue);
        } else {
          issues.push(issue);
        }
      }
    }
  }

  // 5. Check for errors
  const errors = issues.filter((i) => i.severity === "error");
  if (errors.length > 0) {
    return { success: false, issues: [...errors, ...warnings] };
  }

  // 6. Build registries
  const registries = new Map<string, DataRegistry<unknown, string>>();
  for (const cat of config.categories) {
    const records = recordMaps.get(cat.category)!;
    registries.set(cat.category, new DataRegistry(records));
  }

  const loaded: LoadedRegistries = {
    getRegistry<TRecord, TCategory extends string>(
      category: DataCategory<TRecord, TCategory>,
    ): DataRegistry<TRecord, TCategory> {
      const reg = registries.get(category.category);
      if (!reg) {
        throw new Error(`No registry for category "${category.category}"`);
      }
      return reg as DataRegistry<TRecord, TCategory>;
    },
  };

  return { success: true, value: loaded, warnings };
}
