import type { ValidationIssue } from "../diagnostics.js";
import type { TranslationFile } from "./types.js";

export class TranslationValidator {
  validate(files: readonly TranslationFile[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    const keysByLang = new Map<string, Set<string>>();

    for (const file of files) {
      const langKey = `${file.language}:${file.namespace}`;
      const seen = keysByLang.get(langKey) ?? new Set<string>();
      keysByLang.set(langKey, seen);

      for (const [key, value] of Object.entries(file.entries)) {
        const fullKey = `${file.namespace}.${key}`;

        if (seen.has(key)) {
          issues.push({
            severity: "error",
            code: "DATA_DUPLICATE_ID",
            message: `Duplicate key "${fullKey}" in language "${file.language}"`,
            category: "localization",
            source: file.namespace,
          });
        }
        seen.add(key);

        if (value.trim() === "") {
          issues.push({
            severity: "warning",
            code: "DATA_SCHEMA_INVALID",
            message: `Empty value for key "${fullKey}" in language "${file.language}"`,
            category: "localization",
            source: file.namespace,
          });
        }
      }
    }

    const languages = [...new Set(files.map((f) => f.language))];
    if (languages.length > 1) {
      const refLang = languages[0]!;
      const namespaces = [...new Set(files.map((f) => f.namespace))];

      for (const ns of namespaces) {
        const refFiles = files.filter((f) => f.language === refLang && f.namespace === ns);
        const refKeys = new Set(refFiles.flatMap((f) => Object.keys(f.entries)));

        for (const lang of languages.slice(1)) {
          const langFiles = files.filter((f) => f.language === lang && f.namespace === ns);
          const langKeys = new Set(langFiles.flatMap((f) => Object.keys(f.entries)));

          for (const key of refKeys) {
            if (!langKeys.has(key)) {
              issues.push({
                severity: "warning",
                code: "DATA_UNKNOWN_REFERENCE",
                message: `Missing key "${ns}.${key}" in language "${lang}" (present in "${refLang}")`,
                category: "localization",
                source: ns,
              });
            }
          }
        }
      }
    }

    return issues;
  }
}
